export const dynamic = 'force-dynamic';
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agents, meetings, webhookEvents } from "@/db/schema";
import { streamVideo } from "@/lib/stream-video"; 

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-signature");
  const body = await req.text();
  const client = streamVideo(); 

  const isDev = process.env.NODE_ENV === "development";
  const isValid = isDev || (signature && client.verifyWebhook(body, signature!));

  if (!isValid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: any;
  try { payload = JSON.parse(body); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }

  const { type: eventType, id: eventId } = payload;
  const rawId = payload.call?.id || payload.call_cid || payload.call?.custom?.meetingId;
  const meetingId = rawId?.includes(':') ? rawId.split(':')[1] : rawId;

  if (!meetingId) return NextResponse.json({ error: "No meetingId" }, { status: 400 });

  /* 1. GLOBAL IDEMPOTENCY (Blocks exact same event ID) */
  if (eventId) {
    try {
      await db.insert(webhookEvents).values({ id: eventId, type: eventType });
    } catch (e) {
      return NextResponse.json({ status: "duplicate_event_id" });
    }
  }

  /* 2. CALL STARTED - THE ONLY GATE FOR AGENT JOIN */
  // We ONLY allow the agent to join on 'call.session_started'.
  // If we don't check this, other events like 'participant_joined' might trigger it too.
  if (eventType === "call.session_started") {
    
    // ATOMIC LOCK: This is the ONLY request that will get a result from .returning()
    const [meeting] = await db
      .update(meetings)
      .set({ status: "active", startedAt: new Date() })
      .where(
        and(
          eq(meetings.id, meetingId),
          eq(meetings.status, "upcoming") // Only 'upcoming' can become 'active'
        )
      )
      .returning();

    if (!meeting) {
      console.log(`🚫 Atomic block: Meeting ${meetingId} is already active.`);
      return NextResponse.json({ status: "already_active" });
    }

    const [agent] = await db.select().from(agents).where(eq(agents.id, meeting.agentid));

    if (agent?.instructions) {
      try {
        console.log(`🤖 SINGLE AGENT joining: ${meetingId}`);
        const call = client.video.call("default", meetingId);

        const realtimeClient = await client.video.connectOpenAi({
          call,
          openAiApiKey: process.env.OPENAI_API_KEY!,
          agentUserId: agent.id, // Ensure this is unique to the agent
        });

        await realtimeClient.updateSession({
          instructions: agent.instructions,
          turn_detection: { type: "server_vad", threshold: 0.5 },
          input_audio_transcription: { model: "whisper-1" },
          voice: "alloy", 
        });
      } catch (error) {
        console.error("❌ Agent Join Error:", error);
      }
    }
  }

  /* 3. PARTICIPANT LEFT */
  else if (eventType === "call.session_participant_left") {
    const leftUserId = payload.participant?.user_id;
    
    // Ensure we only transition to processing ONCE
    const [meeting] = await db
      .update(meetings)
      .set({ status: "processing", endedAt: new Date() })
      .where(and(eq(meetings.id, meetingId), eq(meetings.status, "active")))
      .returning();

    if (meeting && leftUserId !== meeting.agentid) {
      try {
        const call = client.video.call("default", meetingId);
        await call.end();
      } catch (e) {}
    }
  }

  /* 4. TRANSCRIPTION READY */
  else if (eventType === "call.transcription_ready") {
    const transcriptionUrl = payload.transcription?.url;
    if (transcriptionUrl) {
      await db.update(meetings).set({ transcripturl: transcriptionUrl }).where(eq(meetings.id, meetingId));
      const { inngest } = await import("@/inngest/client");
      await inngest.send({ name: "meeting/transcript.ready", data: { meetingId, transcriptUrl: transcriptionUrl } });
    }
  }

  return NextResponse.json({ status: "ok" });
} 