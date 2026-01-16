export const dynamic = 'force-dynamic';
import { eq, and } from "drizzle-orm"; // Added 'and'
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

  if (!isValid) {
    console.error("❌ Webhook Unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: any;
  try { 
    payload = JSON.parse(body); 
  } catch { 
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); 
  }

  const { type: eventType, id: eventId } = payload;
  
  const rawId = payload.call?.id || payload.call_cid || payload.call?.custom?.meetingId;
  const meetingId = rawId?.includes(':') ? rawId.split(':')[1] : rawId;

  if (!meetingId) {
    return NextResponse.json({ error: "No meetingId" }, { status: 400 });
  }

  /* 1. IDEMPOTENCY LOCK (Event Level) */
  if (eventId) {
    try {
      await db.insert(webhookEvents).values({ id: eventId, type: eventType });
    } catch (e) {
      return NextResponse.json({ status: "duplicate" });
    }
  }

  /* 2. CALL STARTED - ATOMIC AGENT JOIN */
  if (eventType === "call.session_started") {
    // 🔒 THE FIX: Atomic update with status check
    // We only update if the status is currently 'upcoming'.
    // If a second request hits, the status will already be 'active', and this will return null.
    const [meeting] = await db
      .update(meetings)
      .set({ status: "active", startedAt: new Date() })
      .where(
        and(
          eq(meetings.id, meetingId),
          eq(meetings.status, "upcoming") 
        )
      )
      .returning();

    if (!meeting) {
      console.log(`🚫 Blocked duplicate agent join for meeting: ${meetingId}`);
      return NextResponse.json({ status: "already_processed" });
    }

    const [agent] = await db.select().from(agents).where(eq(agents.id, meeting.agentid));

    if (agent?.instructions) {
      try {
        console.log(`🤖 Agent ${agent.id} joining meeting: ${meetingId}`);
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
    
    // Again, use an atomic check to ensure we only move to 'processing' once
    const [meeting] = await db
      .update(meetings)
      .set({ status: "processing", endedAt: new Date() })
      .where(
        and(
          eq(meetings.id, meetingId),
          eq(meetings.status, "active") // Only if it was active
        )
      )
      .returning();

    // Only trigger end-of-call logic if we successfully updated the status
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
      await inngest.send({
        name: "meeting/transcript.ready",
        data: { meetingId, transcriptUrl: transcriptionUrl }
      });
    }
  }

  return NextResponse.json({ status: "ok" });
}