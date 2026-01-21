import { z } from "zod";
import { eq, and, getTableColumns, sql } from "drizzle-orm";
import { agents, meetings } from "@/db/schema";
import { db } from "@/db"; 
import { streamVideo as getStreamVideoClient } from "@/lib/stream-video"; // Renamed for clarity
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { meetingsInsertSchema, meetingsUpdateSchema } from "../schemas";
import { generateAvatarUri } from "@/lib/avatar";

export const meetingsRouter = createTRPCRouter({
  generateToken: protectedProcedure.mutation(async ({ ctx }) => {
    // 1. Initialize client
    const client = getStreamVideoClient();

    // 2. Correct method is client.upsertUsers
    await client.upsertUsers([
      {
        id: ctx.auth.user.id,
        name: ctx.auth.user.name || "Unknown User",
        role: "admin",
        image: ctx.auth.user.image ?? generateAvatarUri({ seed: ctx.auth.user.name || "user", variant: "initials" }),
      },
    ]);

    const expirationTime = Math.floor(Date.now() / 1000) + 3600;
    
    // 3. Correct method is client.createToken
    const token = client.createToken(ctx.auth.user.id, expirationTime);
    
    return token;
  }),

  create: protectedProcedure.input(meetingsInsertSchema).mutation(async ({ input, ctx }) => {
    const client = getStreamVideoClient();

    const [createdMeeting] = await db
      .insert(meetings)
      .values({
        ...input,
        userid: ctx.auth.user.id,
        agentid: input.agentId
      })
      .returning();

    // 4. Use initialized client.video.call
    const call = client.video.call("default", createdMeeting.id);
    
    await call.create({
      data: {
        created_by_id: ctx.auth.user.id,
        custom: {
          meetingId: createdMeeting.id,
          meetingName: createdMeeting.name
        },
        settings_override: {
          transcription: {
            language: "en",
            mode: "auto-on",
            closed_caption_mode: "auto-on",
          },
          recording: {
            mode: "auto-on",
            quality: "1080p"
          },
        },
      },
    });

    const [existingAgent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, input.agentId));

    if (!existingAgent) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
    }

    await client.upsertUsers([
      {
        id: existingAgent.id,
        name: existingAgent.name,
        role: "user",
        image: generateAvatarUri({
          seed: existingAgent.name,
          variant: "botttsNeutral"
        }),
      },
    ]);

    return createdMeeting;
  }),

  // ... rest of your procedures (getOne, remove, update) remain largely the same
  // Just ensure they don't try to call streamVideo as an object.

  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const [existingMeeting] = await db
        .select({
          ...getTableColumns(meetings),
          agent: agents,
          duration: sql<number>`EXTRACT(EPOCH FROM (ended_at-started_at))`.as("duration"),
        })
        .from(meetings)
        .innerJoin(agents, eq(agents.id, meetings.agentid))
        .where(
          and(
            eq(meetings.id, input.id),
            eq(meetings.userid, ctx.auth.user.id)
          )
        );
      if (!existingMeeting) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });
      }
      return existingMeeting;
    }),

  getMany: protectedProcedure.query(async () => {
    const data = await db
      .select({ ...getTableColumns(meetings) })
      .from(meetings);
    return data;
  }),
});