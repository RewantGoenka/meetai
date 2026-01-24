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
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const { type: eventType, id: eventId } = payload;
  
  // 1. IMPROVED ID EXTRACTION: Get both Type and ID
  const callId = payload.call?.id || payload.call_cid?.split(":")[1];
  const callType = payload.call?.type || payload.call_cid?.split(":")[0] || "default";

  if (!callId) return NextResponse.json({ error: "No callId found" }, { status: 400 });

  /* IDEMPOTENCY */
  if (eventId) {
    try {
      await db.insert(webhookEvents).values({ id: eventId, type: eventType });
    } catch (e) {
      return NextResponse.json({ status: "duplicate_event_id" });
    }
  }

  /* CALL STARTED */
  if (eventType === "call.session_started") {
    const [meeting] = await db
      .update(meetings)
      .set({ status: "active", startedAt: new Date() })
      .where(
        and(
          eq(meetings.id, callId),
          eq(meetings.status, "upcoming")
        )
      )
      .returning();

    if (!meeting) {
      return NextResponse.json({ status: "already_active_or_not_found" });
    }

    const [agent] = await db.select().from(agents).where(eq(agents.id, meeting.agentid));

    if (agent?.instructions) {
      try {
        // Use the actual type and ID from the webhook
        const call = client.video.call(callType, callId);

        // Ensure call exists and agent has permissions
        await call.getOrCreate({
          data: {
            members: [{ user_id: agent.id, role: "admin" }], // Admin role ensures join rights
          },
        });

        // Small delay to ensure Stream's infrastructure is ready for the RTC connection
        await new Promise((resolve) => setTimeout(resolve, 1000));

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

        console.log(`✅ Agent Joined Call: ${callType}:${callId}`);
      } catch (error: any) {
        console.error("❌ Agent Join Error:", error);
        return NextResponse.json({ error: "Agent join failed", details: error.message }, { status: 500 });
      }
    }
  }

  /* PARTICIPANT LEFT */
  else if (eventType === "call.session_participant_left") {
    const leftUserId = payload.participant?.user_id;
    
    const [meeting] = await db
      .update(meetings)
      .set({ status: "processing", endedAt: new Date() })
      .where(and(eq(meetings.id, callId), eq(meetings.status, "active")))
      .returning();

    // If a human left and the meeting is now "processing", end the call for the agent
    if (meeting && leftUserId !== meeting.agentid) {
      try {
        const call = client.video.call(callType, callId);
        await call.end();
      } catch (e) {
        console.error("End call error:", e);
      }
    }
  }

  /* TRANSCRIPTION READY */
  else if (eventType === "call.transcription_ready") {
    const transcriptionUrl = payload.transcription?.url;
    if (transcriptionUrl) {
      await db.update(meetings).set({ transcripturl: transcriptionUrl }).where(eq(meetings.id, callId));
      const { inngest } = await import("../inngest/client");
      await inngest.send({ name: "meeting/transcript.ready", data: { meetingId: callId, transcriptUrl: transcriptionUrl } });
    }
  }

  return NextResponse.json({ status: "ok" });
}