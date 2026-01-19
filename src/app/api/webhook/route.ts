export const dynamic = "force-dynamic";

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
  const isValid = isDev || (signature && client.verifyWebhook(body, signature));

  if (!isValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const { type: eventType, id: eventId } = payload;

  const rawId =
    payload.call?.id ||
    payload.call_cid ||
    payload.call?.custom?.meetingId;

  const meetingId = rawId?.includes(":") ? rawId.split(":")[1] : rawId;

  if (!meetingId) {
    return NextResponse.json({ error: "No meetingId" }, { status: 400 });
  }

  /* ─────────────────────────────────────────────
     1. GLOBAL IDEMPOTENCY
  ────────────────────────────────────────────── */
  if (eventId) {
    try {
      await db.insert(webhookEvents).values({
        id: eventId,
        type: eventType,
      });
    } catch {
      return NextResponse.json({ status: "duplicate_event_id" });
    }
  }

  /* ─────────────────────────────────────────────
     2. CALL SESSION STARTED → AGENT JOIN
  ────────────────────────────────────────────── */
  if (eventType === "call.session_started") {
    const [meeting] = await db
      .update(meetings)
      .set({
        status: "active",
        startedAt: new Date(),
      })
      .where(
        and(
          eq(meetings.id, meetingId),
          eq(meetings.status, "upcoming")
        )
      )
      .returning();

    if (!meeting) {
      return NextResponse.json({ status: "already_active" });
    }

    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, meeting.agentid));

    if (agent?.instructions) {
      try {
        const call = client.video.call("default", meetingId);

        const realtimeClient = await client.video.connectOpenAi({
          call,
          openAiApiKey: process.env.OPENAI_API_KEY!,
          agentUserId: agent.id,
        });

        await realtimeClient.updateSession({
          instructions: agent.instructions,
        });
      } catch (err) {
        console.error("❌ Agent join failed", err);
      }
    }
  }

  /* ─────────────────────────────────────────────
     3. PARTICIPANT LEFT → MARK PROCESSING
     (NO force-ending the call)
  ────────────────────────────────────────────── */
  else if (eventType === "call.session_participant_left") {
    await db
      .update(meetings)
      .set({
        status: "processing",
        endedAt: new Date(),
      })
      .where(
        and(
          eq(meetings.id, meetingId),
          eq(meetings.status, "active")
        )
      );
  }

  /* ─────────────────────────────────────────────
     4. TRANSCRIPTION READY → INGEST EVENT
  ────────────────────────────────────────────── */
  else if (eventType === "call.transcription_ready") {
    const transcriptionUrl = payload.transcription?.url;

    if (transcriptionUrl) {
      console.log("🎯 TRANSCRIPTION READY", {
        meetingId,
        transcriptionUrl,
      });

      await db
        .update(meetings)
        .set({ transcripturl: transcriptionUrl })
        .where(eq(meetings.id, meetingId));

      const { inngest } = await import("@/inngest/client");

      await inngest.send({
        name: "meeting/transcript.ready",
        data: { meetingId, transcriptUrl: transcriptionUrl },
      });
    }
  }

  return NextResponse.json({ status: "ok" });
}
