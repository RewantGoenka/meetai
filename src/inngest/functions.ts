import { inngest } from "./client";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import { eq } from "drizzle-orm";

const MAX_TRANSCRIPT_CHARS = 15_000;

export const processMeetingTranscript = inngest.createFunction(
  {
    id: "process-meeting-transcript",
    retries: 3,
  },
  { event: "meeting/transcript.ready" },
  async ({ event, step }) => {
    const { meetingId, transcriptUrl } = event.data;

    /* ─────────────────────────────────────────────
       1. LOAD MEETING + IDEMPOTENCY GUARD
    ────────────────────────────────────────────── */
    const meeting = await step.run("load-meeting", async () => {
      const [row] = await db
        .select()
        .from(meetings)
        .where(eq(meetings.id, meetingId));

      if (!row) {
        throw new Error(`Meeting ${meetingId} not found`);
      }

      // 🛡️ Idempotency: already processed
      if (row.transcriptProcessed || row.status === "completed") {
        return null;
      }

      return row;
    });

    if (!meeting) {
      return { status: "noop", reason: "already processed" };
    }

    /* ─────────────────────────────────────────────
       2. FETCH TRANSCRIPT SAFELY
    ────────────────────────────────────────────── */
    const transcriptText = await step.run("fetch-transcript", async () => {
      const res = await fetch(transcriptUrl);
      if (!res.ok) {
        throw new Error(`Transcript fetch failed: ${res.status}`);
      }

      const raw = await res.text();

      try {
        const data = JSON.parse(raw);
        return (
          data.text ||
          data.transcript ||
          data.segments?.map((s: any) => s.text).join("\n") ||
          raw
        );
      } catch {
        return raw;
      }
    });

    const safeTranscript = transcriptText.slice(0, MAX_TRANSCRIPT_CHARS);

    /* ─────────────────────────────────────────────
       3. AI SUMMARIZATION (GUARDED)
    ────────────────────────────────────────────── */
    const summary = await step.run("ai-summarization", async () => {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "Analyze the transcript. 1) List speakers. 2) Provide a concise 3-sentence summary.",
              },
              { role: "user", content: safeTranscript },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`OpenAI error ${response.status}`);
      }

      const data = await response.json();

      if (!data.choices?.[0]?.message?.content) {
        throw new Error("Invalid OpenAI response");
      }

      return data.choices[0].message.content;
    });

    /* ─────────────────────────────────────────────
       4. FINALIZE (ATOMIC COMPLETION)
    ────────────────────────────────────────────── */
    await step.run("finalize-meeting", async () => {
      await db
        .update(meetings)
        .set({
          summary,
          transcriptProcessed: true,
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(meetings.id, meetingId));
    });

    return {
      status: "completed",
      meetingId,
    };
  }
);