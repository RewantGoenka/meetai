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

        // CRITICAL: Ensure agent exists as Stream user FIRST
                // Stream Video client types may not expose 'user' on the root client,
                // so cast to any to call the runtime method.
                await (client as any).user(agent.id).getOrUpdate({
                  name: `Agent ${agent.id}`,
                  role: 'admin'
                });

        // Ensure call exists and is ready (no members needed for agent)
        await call.getOrCreate();

        // Short buffer for call readiness
        await new Promise((resolve) => setTimeout(resolve, 1000));

        console.log(`🤖 Attempting OpenAI Realtime Connection...`);
        const realtimeClient = await client.video.connectOpenAi({
          call,
          openAiApiKey: process.env.OPENAI_API_KEY!,
          agentUserId: agent.id,
          model: "gpt-4o-realtime-preview" // Explicit model
        });

        await realtimeClient.updateSession({
          instructions: agent.instructions,
          turn_detection: { type: "server_vad", threshold: 0.5 },
          input_audio_transcription: { model: "whisper-1" },
          voice: "alloy",
          modalities: ["text", "audio"] // Ensure both enabled
        });

        console.log(`✅ Agent successfully connected to ${callId}`);
      } catch (error: any) {
        console.error("❌ Agent Join Error:", error.message, error.response?.data);
        return NextResponse.json({ 
          error: "Agent connection failed", 
          details: error.message 
        }, { status: 500 });
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
