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

// #region agent log
fetch('http://127.0.0.1:7242/ingest/c3092b27-fc29-41c9-b15a-999d261e8bb3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/inngest/functions.ts:14',message:'Inngest function started',data:{meetingId,transcriptUrl},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
// #endregion

    /* ─────────────────────────────────────────────
       1. LOAD MEETING + IDEMPOTENCY GUARD
    ────────────────────────────────────────────── */
    const meeting = await step.run("load-meeting", async () => {
      const [row] = await db
        .select()
        .from(meetings)
        .where(eq(meetings.id, meetingId));

// #region agent log
fetch('http://127.0.0.1:7242/ingest/c3092b27-fc29-41c9-b15a-999d261e8bb3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/inngest/functions.ts:22',message:'loaded meeting from DB',data:{meetingId,rowFound:!!row,rowStatus:row?.status,rowTranscriptProcessed:row?.transcriptProcessed},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
// #endregion

      if (!row) {
        throw new Error(`Meeting ${meetingId} not found`);
      }

      // 🛡️ Idempotency: already processed
      if (row.transcriptProcessed || row.status === "completed") {
// #region agent log
fetch('http://127.0.0.1:7242/ingest/c3092b27-fc29-41c9-b15a-999d261e8bb3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/inngest/functions.ts:31',message:'meeting already processed - exiting early',data:{meetingId,status:row.status,transcriptProcessed:row.transcriptProcessed},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
// #endregion
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
// #region agent log
fetch('http://127.0.0.1:7242/ingest/c3092b27-fc29-41c9-b15a-999d261e8bb3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/inngest/functions.ts:50',message:'fetching transcript',data:{meetingId,transcriptUrl},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
// #endregion
      const res = await fetch(transcriptUrl);
      if (!res.ok) {
        throw new Error(`Transcript fetch failed: ${res.status}`);
      }

      const raw = await res.text();

// #region agent log
fetch('http://127.0.0.1:7242/ingest/c3092b27-fc29-41c9-b15a-999d261e8bb3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/inngest/functions.ts:59',message:'transcript fetched successfully',data:{meetingId,rawLength:raw.length},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
// #endregion

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
// #region agent log
fetch('http://127.0.0.1:7242/ingest/c3092b27-fc29-41c9-b15a-999d261e8bb3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/inngest/functions.ts:79',message:'starting AI summarization',data:{meetingId,transcriptLength:safeTranscript.length},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
// #endregion
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

// #region agent log
fetch('http://127.0.0.1:7242/ingest/c3092b27-fc29-41c9-b15a-999d261e8bb3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/inngest/functions.ts:110',message:'AI summarization completed',data:{meetingId,summaryLength:data.choices[0].message.content.length},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
// #endregion

      return data.choices[0].message.content;
    });

    /* ─────────────────────────────────────────────
       4. FINALIZE (ATOMIC COMPLETION)
    ────────────────────────────────────────────── */
    await step.run("finalize-meeting", async () => {
// #region agent log
fetch('http://127.0.0.1:7242/ingest/c3092b27-fc29-41c9-b15a-999d261e8bb3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/inngest/functions.ts:127',message:'finalizing meeting - updating to completed',data:{meetingId,summaryLength:summary.length},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
// #endregion
      await db
        .update(meetings)
        .set({
          summary,
          transcriptProcessed: true,
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(meetings.id, meetingId));
// #region agent log
fetch('http://127.0.0.1:7242/ingest/c3092b27-fc29-41c9-b15a-999d261e8bb3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/inngest/functions.ts:139',message:'meeting successfully updated to completed',data:{meetingId},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
// #endregion
    });

    return {
      status: "completed",
      meetingId,
    };
  }
);
