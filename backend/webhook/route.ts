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
  const callId = payload.call?.id || payload.call_cid?.split(":")[1];
  const callType = payload.call?.type || payload.call_cid?.split(":")[0] || "default";

  if (!callId) return NextResponse.json({ error: "No callId" }, { status: 400 });

  /* 1. IDEMPOTENCY */
  if (eventId) {
    try {
      await db.insert(webhookEvents).values({ id: eventId, type: eventType });
    } catch (e) {
      return NextResponse.json({ status: "duplicate_event_id" });
    }
  }

  /* 2. CALL STARTED */
  if (eventType === "call.session_started") {
    // Fetch meeting without the status lock
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, callId));

    if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

    // Update DB status (Non-blocking)
    await db.update(meetings)
      .set({ status: "active", startedAt: new Date() })
      .where(eq(meetings.id, callId));

    const [agent] = await db.select().from(agents).where(eq(agents.id, meeting.agentid));

    if (agent?.instructions) {
      try {
        console.log(`🤖 Initializing agent join: ${callId}`);
        const call = client.video.call(callType, callId);

        // Join the call and set the agent as an admin member in one go
        await call.getOrCreate({
          data: {
            members: [{ user_id: agent.id, role: "admin" }],
          },
        });

        // 2-second buffer to ensure Stream session is ready for OpenAI
        await new Promise((resolve) => setTimeout(resolve, 2000));

        console.log(`🤖 Attempting OpenAI Realtime Connection...`);
        try {
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

          console.log(`✅ Agent successfully connected to ${callId}`);
        } catch (openAiErr: any) {
          // Log specific OpenAI failure details
          const errorData = openAiErr.response?.data || openAiErr.message;
          console.error("❌ OpenAI Connection Failed:", errorData);
          return NextResponse.json({ 
            error: "OpenAI connection failed", 
            details: errorData 
          }, { status: 500 });
        }

      } catch (error: any) {
        console.error("❌ Stream Join Error:", error.message);
        return NextResponse.json({ error: "Stream join failed", details: error.message }, { status: 500 });
      }
    }
  }

  /* 3. PARTICIPANT LEFT */
  else if (eventType === "call.session_participant_left") {
    const leftUserId = payload.participant?.user_id;
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, callId));

    if (meeting && leftUserId !== meeting.agentid) {
      await db.update(meetings)
        .set({ status: "processing", endedAt: new Date() })
        .where(eq(meetings.id, callId));
      
      try {
        const call = client.video.call(callType, callId);
        await call.end();
        console.log(`👋 Call ended by agent cleanup: ${callId}`);
      } catch (e) {
        console.error("Cleanup error:", e);
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}