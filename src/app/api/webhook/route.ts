import { and, eq, not } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  CallSessionStartedEvent,
  CallSessionParticipantLeftEvent,
  CallTranscriptionReadyEvent,
  CallRecordingReadyEvent,
  CallEndedEvent,
} from "@stream-io/node-sdk";

import { db } from "@/db";
import { agents, meetings, webhookEvents } from "@/db/schema";
import { streamVideo } from "@/lib/stream-video";
import { url } from "inspector/promises";
import { inngest } from "@/inngest/client";

const MAX_TRANSCRIPT_CHARS = 30_000;
const MAX_CHUNKS = 10;
const CHUNK_SIZE = 4_000;

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function verifySignature(body: string, signature: string) {
  if (process.env.NODE_ENV === "development") return true;
  return streamVideo.verifyWebhook(body, signature);
}

function chunkText(text: string, size = CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  let buffer = "";
  for (const line of text.split("\n")) {
    if ((buffer + line).length > size) {
      chunks.push(buffer);
      buffer = line;
    } else {
      buffer += "\n" + line;
    }
  }
  if (buffer.trim()) chunks.push(buffer);
  return chunks.slice(0, MAX_CHUNKS);
}

/* ─────────────────────────────────────────────
   FIX: ROBUST TRANSCRIPT PROCESSOR
───────────────────────────────────────────── */
async function processTranscriptAsync(meetingId: string, transcriptUrl: string) {
  try {
    const res = await fetch(transcriptUrl);
    const rawBody = await res.text(); // Read as text first to prevent JSON crash
    
    let text = "";

    try {
      // Try standard JSON first
      const data = JSON.parse(rawBody);
      text = data.text || data.transcript || data.segments?.map((s: any) => s.text).join("\n");
    } catch (e) {
      // If parsing fails, check if it's JSONL or raw text
      if (rawBody.trim().startsWith('{')) {
        const firstLine = rawBody.split('\n')[0];
        try {
          const data = JSON.parse(firstLine);
          text = data.text || data.transcript || rawBody;
        } catch {
          text = rawBody;
        }
      } else {
        text = rawBody;
      }
    }

    if (!text) return;

    const chunks = chunkText(text);
    await db.update(meetings)
      .set({ transcriptProcessed: true } as any)
      .where(eq(meetings.id, meetingId));

    console.log(`✅ Transcript processed for ${meetingId}`);
  } catch (err) {
    console.error("❌ Transcript processing failed:", err);
  }
}

/* ─────────────────────────────────────────────
   WEBHOOK ROUTE
───────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-signature");
  if (!signature) return NextResponse.json({ error: "No signature" }, { status: 400 });

  const body = await req.text();
  if (!verifySignature(body, signature)) return NextResponse.json({ error: "Invalid Sig" }, { status: 401 });

  let payload: any;
  try { payload = JSON.parse(body); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }

  const { type: eventType, id: eventId } = payload;

  // 1. IDEMPOTENCY
  if (eventId) {
    const [existing] = await db.select().from(webhookEvents).where(eq(webhookEvents.id, eventId));
    if (existing) return NextResponse.json({ status: "duplicate" });
    await db.insert(webhookEvents).values({ id: eventId, type: eventType });
  }

  // 2. CALL STARTED (FIX: Atomic Lock for Single Agent)
  if (eventType === "call.session_started") {
    const meetingId = payload.call?.custom?.meetingId || payload.call_cid?.split(":")[1];
    if (!meetingId) return NextResponse.json({ error: "No ID" });

    // Atomic update prevents two requests from proceeding
    const [meeting] = await db
      .update(meetings)
      .set({ status: "active", startedAt: new Date() })
      .where(and(eq(meetings.id, meetingId), not(eq(meetings.status, "active"))))
      .returning();

    if (!meeting) {
      console.log("🛡️ Race condition blocked: Agent already connecting.");
      return NextResponse.json({ status: "ok" });
    }

    const [agent] = await db.select().from(agents).where(eq(agents.id, meeting.agentid));
    if (agent?.instructions) {
      const call = streamVideo.video.call("default", meetingId);
      const realtimeClient = await streamVideo.video.connectOpenAi({
        call,
        openAiApiKey: process.env.OPENAI_API_KEY!,
        agentUserId: agent.id,
      });
      await realtimeClient.updateSession({
        instructions: agent.instructions,
        turn_detection: { type: "server_vad" },
        input_audio_transcription: { model: "whisper-1" },
      });
      console.log("🤖 Agent successfully joined.");
    }
  }

  // 3. CALL ENDED (FIX: Better ID Detection)
  else if (eventType === "call.session_ended" || eventType === "call.ended") {
    const meetingId = payload.call?.custom?.meetingId || payload.call_cid?.split(":")[1];
    if (meetingId) {
      await db.update(meetings)
        .set({ status: "processing", endedAt: new Date() })
        .where(eq(meetings.id, meetingId));
      console.log(`🏁 Meeting ${meetingId} moved to processing`);
    }
  }

  // 4. TRANSCRIPTION READY
  else if (eventType === "call.transcription_ready") {
    const meetingId = payload.call_cid?.split(":")[1];
    const url = payload.call_transcription?.url;
    if (meetingId && url) {
      await db.update(meetings).set({ transcripturl: url }).where(eq(meetings.id, meetingId));
      processTranscriptAsync(meetingId, url);
    }
    await inngest.send({
    name: "meeting/transcript.ready",
    data: {
       meetingId,
       transcriptUrl: url,
  },
});
  }

  // 5. RECORDING READY
  else if (eventType === "call.recording_ready") {
    const meetingId = payload.call_cid?.split(":")[1];
    if (meetingId) {
      await db.update(meetings)
        .set({ recordingurl: payload.call_recording?.url, status: "completed" })
        .where(eq(meetings.id, meetingId));
    }
  }

  return NextResponse.json({ status: "ok" });
}