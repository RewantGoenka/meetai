import { inngest } from "./client";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const processMeetingTranscript = inngest.createFunction(
  { 
    id: "process-meeting-transcript",
    retries: 3 
  },
  { event: "meeting/transcript.ready" },
  async ({ event, step }) => {
    // 1. EXTRACT DATA (Already an object, no need to parse)
    const { meetingId, transcriptUrl } = event.data;

    // 2. CHECK IF MEETING EXISTS (Safety first)
    const meeting = await step.run("check-db-record", async () => {
      const result = await db.select().from(meetings).where(eq(meetings.id, meetingId));
      if (result.length === 0) {
        throw new Error(`Meeting ${meetingId} not found in database. Skipping.`);
      }
      return result[0];
    });

    // 3. FETCH TRANSCRIPT (Standard Text Fetch)
    const transcriptText = await step.run("fetch-transcript", async () => {
      const res = await fetch(transcriptUrl);
      if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`);
      
      const raw = await res.text();
      
      // Only parse if the response is actually a JSON string
      try {
        const data = JSON.parse(raw);
        return data.text || data.transcript || data.segments?.map((s: any) => s.text).join("\n") || raw;
      } catch {
        return raw; // It's already plain text
      }
    });

    // 4. AI SUMMARIZATION
    const aiResponse = await step.run("ai-summarization", async () => {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { 
              role: "system", 
              content: "Analyze the transcript. 1. List speakers. 2. Provide a 3-sentence summary." 
            },
            { role: "user", content: transcriptText.slice(0, 15000) } // Increased limit slightly
          ],
        }),
      });

      const data = await response.json();
      if (!data.choices) throw new Error("OpenAI failed to return choices");
      return data.choices[0].message.content;
    });

    // 5. FINALIZE (Database Update)
    await step.run("finalize-meeting", async () => {
      await db
        .update(meetings)
        .set({
          summary: aiResponse,
          transcriptProcessed: true,
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(meetings.id, meetingId));

      return { status: "success", meetingId };
    });

    return { message: "Pipeline finished" };
  }
);