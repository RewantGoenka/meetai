import { and, eq, not } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import {
  CallSessionStartedEvent,
  CallSessionParticipantLeftEvent,
} from "@stream-io/node-sdk";

import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import { streamVideo } from "@/lib/stream-video";

// Verify Stream webhook signature
function verifySignature(body: string, signature: string) {
  return streamVideo.verifyWebhook(body, signature);
}

export async function POST(req: NextRequest) {
  console.log(
    "ENV CHECK:",
    process.env.OPENAI_API_KEY ? "FOUND" : "MISSING"
  );

  const signature = req.headers.get("x-signature");
  const apiKey = req.headers.get("x-api-key");

  if (!signature || !apiKey) {
    return NextResponse.json(
      { error: "Missing signature or API key" },
      { status: 400 }
    );
  }

  const body = await req.text();

  if (!verifySignature(body, signature)) {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 }
    );
  }

  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const eventType = payload.type;

  // ─────────────────────────────────────────────
  // 🎬 CALL STARTED → CONNECT AI AGENT
  // ─────────────────────────────────────────────
  if (eventType === "call.session_started") {
    const event = payload as CallSessionStartedEvent;
    const meetingId = event.call?.custom?.meetingId;

    if (!meetingId) {
      return NextResponse.json(
        { error: "Missing meetingId" },
        { status: 400 }
      );
    }

    const [meeting] = await db
      .select()
      .from(meetings)
      .where(
        and(
          eq(meetings.id, meetingId),
          not(eq(meetings.status, "active")),
          not(eq(meetings.status, "completed")),
          not(eq(meetings.status, "canceled"))
        )
      );

    if (!meeting) {
      return NextResponse.json(
        { error: "Meeting not found or already active" },
        { status: 404 }
      );
    }

    await db
      .update(meetings)
      .set({
        status: "active",
        startedAt: new Date(),
      })
      .where(eq(meetings.id, meetingId));

    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, meeting.agentid));

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    if (!agent.instructions || !agent.instructions.trim()) {
      console.error("❌ Agent has NO instructions");
      return NextResponse.json(
        { error: "Agent instructions missing" },
        { status: 400 }
      );
    }

    const call = streamVideo.video.call("default", meetingId);

    const realtimeClient = await streamVideo.video.connectOpenAi({
      call,
      openAiApiKey: process.env.OPENAI_API_KEY!,
      agentUserId: agent.id,
    });

    // ✅ CORRECT STREAM FORMAT
    await realtimeClient.updateSession({
      instructions: agent.instructions,

      turn_detection: {
        type: "server_vad",
      },

      input_audio_transcription: {
        model: "whisper-1",
      }
    });

    console.log(`✅ AI agent connected for meeting ${meetingId}`);
  }

  // ─────────────────────────────────────────────
  // 👋 PARTICIPANT LEFT → END CALL
  // ─────────────────────────────────────────────
  if (eventType === "call.session_participant_left") {
    const event = payload as CallSessionParticipantLeftEvent;
    const meetingId = event.call_cid?.split(":")[1];

    if (meetingId) {
      const call = streamVideo.video.call("default", meetingId);
      await call.end();
      console.log(`🛑 Call ended for meeting ${meetingId}`);
    }
  }

  return NextResponse.json({ status: "ok" });
}
