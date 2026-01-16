export const dynamic = 'force-dynamic';
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agents, meetings, webhookEvents } from "@/db/schema";
import { streamVideo } from "@/lib/stream-video";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-signature");
  const body = await req.text();

  if (!signature || (process.env.NODE_ENV !== "development" && !streamVideo().verifyWebhook(body, signature))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: any;
  try { payload = JSON.parse(body); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }

  const { type: eventType, id: eventId } = payload;
  const meetingId = payload.call?.custom?.meetingId || payload.call_cid?.split(":")[1];

  /* 1. STRICT IDEMPOTENCY LOCK */
  if (eventId) {
    try {
      await db.insert(webhookEvents).values({ id: eventId, type: eventType });
    } catch (e) {
      console.log(`♻️ Blocking duplicate event: ${eventId}`);
      return NextResponse.json({ status: "duplicate" });
    }
  }

  /* 2. CALL STARTED - SINGLE AGENT JOIN */
  if (eventType === "call.session_started" && meetingId) {
    const [meeting] = await db
      .update(meetings)
      .set({ status: "active", startedAt: new Date() })
      .where(eq(meetings.status, "upcoming")) 
      .returning();

    if (!meeting) {
      console.log("🚫 Agent already joined or meeting active. Skipping join.");
      return NextResponse.json({ status: "ok" });
    }

    const [agent] = await db.select().from(agents).where(eq(agents.id, meeting.agentid));

    if (agent?.instructions) {
      try {
        console.log(`🤖 Agent ${agent.id} joining call ${meetingId}`);
        const call = streamVideo().video.call("default", meetingId);

        const realtimeClient = await streamVideo().video.connectOpenAi({
          call,
          openAiApiKey: process.env.OPENAI_API_KEY!,
          agentUserId: agent.id,
        });

        await realtimeClient.updateSession({
          instructions: agent.instructions,
          turn_detection: { 
            type: "server_vad",
            threshold: 0.5, 
            prefix_padding_ms: 300,
            silence_duration_ms: 500 
          },
          input_audio_transcription: { model: "whisper-1" },
          voice: "alloy", 
        });
      } catch (error) {
        console.error("❌ OpenAI Connection Error:", error);
      }
    }
  }

  /* 3. PARTICIPANT LEFT */
  else if (eventType === "call.session_participant_left" && meetingId) {
    const leftUserId = payload.participant?.user_id;
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, meetingId));

    // Only end if the Human (non-agent) leaves
    if (meeting && leftUserId !== meeting.agentid && meeting.status === "active") {
      try {
        const call = streamVideo().video.call("default", meetingId);
        await call.end();
      } catch (e) {}

      await db.update(meetings).set({ status: "processing", endedAt: new Date() }).where(eq(meetings.id, meetingId));
    }
  }

  /* 4. RECORDING READY */
  else if (eventType === "call.recording_ready" && meetingId) {
    const transcriptUrl = payload.recording?.url;
    const recordingUrl = payload.recording?.url; 

    if (transcriptUrl) {
      await db.update(meetings).set({
        transcripturl: transcriptUrl,
        recordingurl: recordingUrl,
        updatedAt: new Date()
      }).where(eq(meetings.id, meetingId));
    }
  }

  /* 5. TRANSCRIPTION READY */
  else if (eventType === "call.transcription_ready" && meetingId) {
    const transcriptionUrl = payload.transcription?.url;
    if (transcriptionUrl) {
      await db.update(meetings).set({
        transcripturl: transcriptionUrl,
        updatedAt: new Date()
      }).where(eq(meetings.id, meetingId));

      const { inngest } = await import("@/inngest/client");
      await inngest.send({
        name: "meeting/transcript.ready",
        data: { meetingId, transcriptUrl: transcriptionUrl }
      });
    }
  }

  return NextResponse.json({ status: "ok" });
}