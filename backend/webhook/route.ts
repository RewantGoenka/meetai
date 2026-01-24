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
    const [meeting] = await db
      .update(meetings)
      .set({ status: "active", startedAt: new Date() })
      .where(and(eq(meetings.id, callId), eq(meetings.status, "upcoming")))
      .returning();

    if (!meeting) return NextResponse.json({ status: "already_active" });

    const [agent] = await db.select().from(agents).where(eq(agents.id, meeting.agentid));

    if (agent?.instructions) {
      try {
        console.log(`🚀 Attempting agent join for call: ${callId}`);

        const call = client.video.call(callType, callId);

        // Ensure the call exists and the agent is a member; include minimal member info (Stream's MemberRequest does not accept a nested 'user')
                await call.getOrCreate({
                  data: {
                    members: [{
                      user_id: agent.id,
                      role: "admin",
                    }],
                    // If you need to ensure a user object exists with a name, create it separately:
                    // users: [{ id: agent.id, name: agent.name ?? "AI Assistant" }],
                  },
                });

        // Small delay to allow Stream backend to sync the new participant session
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // DETAILED TRY-CATCH FOR OPENAI CONNECTION
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

          console.log(`✅ OpenAI Agent connected successfully to ${callId}`);
        } catch (openAiErr: any) {
          console.error("❌ OpenAI Connection Block Error:", {
            message: openAiErr.message,
            stack: openAiErr.stack,
            response: openAiErr.response?.data, // Capture API response if available
          });
          throw new Error(`OpenAI Connect Failed: ${openAiErr.message}`);
        }

      } catch (error: any) {
        console.error("❌ Global Agent Join Failure:", error);
        return NextResponse.json({ error: "Agent join failed", details: error.message }, { status: 500 });
      }
    }
  }

  /* 3. PARTICIPANT LEFT (Clean up) */
  else if (eventType === "call.session_participant_left") {
    const leftUserId = payload.participant?.user_id;
    
    const [meeting] = await db
      .update(meetings)
      .set({ status: "processing", endedAt: new Date() })
      .where(and(eq(meetings.id, callId), eq(meetings.status, "active")))
      .returning();

    if (meeting && leftUserId !== meeting.agentid) {
      try {
        const call = client.video.call(callType, callId);
        await call.end();
      } catch (e) {
        console.error("Error ending call:", e);
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}