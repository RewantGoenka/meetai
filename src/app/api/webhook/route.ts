export const dynamic = 'force-dynamic';
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agents, meetings, webhookEvents } from "@/db/schema";
import { streamVideo } from "@/lib/stream-video"; 

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-signature");
  const body = await req.text();
  
  // 1. Initialize client correctly
  const client = streamVideo(); 

  // 2. Robust verification
  const isDev = process.env.NODE_ENV === "development";
  const isValid = isDev || (signature && client.verifyWebhook(body, signature!));

  if (!isValid) {
    console.error("❌ Webhook Unauthorized: Check STREAM_API_SECRET");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: any;
  try { 
    payload = JSON.parse(body); 
  } catch { 
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); 
  }

  const { type: eventType, id: eventId } = payload;
  
  // 3. Bulletproof Meeting ID extraction
  const rawId = payload.call?.id || payload.call_cid || payload.call?.custom?.meetingId;
  const meetingId = rawId?.includes(':') ? rawId.split(':')[1] : rawId;

  if (!meetingId) {
    return NextResponse.json({ error: "No meetingId" }, { status: 400 });
  }

  /* 1. IDEMPOTENCY LOCK */
  if (eventId) {
    try {
      await db.insert(webhookEvents).values({ id: eventId, type: eventType });
    } catch (e) {
      return NextResponse.json({ status: "duplicate" });
    }
  }

  /* 2. CALL STARTED - AGENT JOIN */
  if (eventType === "call.session_started") {
    // Select first to ensure it exists, then update
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, meetingId));

    if (!meeting) {
      console.error(`❌ Meeting ${meetingId} not found in DB`);
      return NextResponse.json({ status: "ok" });
    }

    // Mark as active
    await db.update(meetings).set({ status: "active", startedAt: new Date() }).where(eq(meetings.id, meetingId));

    const [agent] = await db.select().from(agents).where(eq(agents.id, meeting.agentid));

    if (agent?.instructions) {
      try {
        console.log(`🤖 Agent joining meeting: ${meetingId}`);
        const call = client.video.call("default", meetingId);

        const realtimeClient = await client.video.connectOpenAi({
          call,
          openAiApiKey: process.env.OPENAI_API_KEY!,
          agentUserId: agent.id,
        });

        await realtimeClient.updateSession({
          instructions: agent.instructions,
          turn_detection: { type: "server_vad", threshold: 0.5 },
          input_audio_transcription: { model: "whisper-1" },
          voice: "alloy", 
        });
      } catch (error) {
        console.error("❌ OpenAI/Stream Agent Error:", error);
      }
    }
  }

  /* 3. PARTICIPANT LEFT */
  else if (eventType === "call.session_participant_left") {
    const leftUserId = payload.participant?.user_id;
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, meetingId));

    if (meeting && leftUserId !== meeting.agentid && meeting.status === "active") {
      try {
        const call = client.video.call("default", meetingId);
        await call.end();
      } catch (e) {}
      await db.update(meetings).set({ status: "processing", endedAt: new Date() }).where(eq(meetings.id, meetingId));
    }
  }

  /* 4. TRANSCRIPTION READY */
  else if (eventType === "call.transcription_ready") {
    const transcriptionUrl = payload.transcription?.url;
    if (transcriptionUrl) {
      await db.update(meetings).set({ transcripturl: transcriptionUrl }).where(eq(meetings.id, meetingId));
      
      const { inngest } = await import("@/inngest/client");
      await inngest.send({
        name: "meeting/transcript.ready",
        data: { meetingId, transcriptUrl: transcriptionUrl }
      });
    }
  }

  return NextResponse.json({ status: "ok" });
}