import { z } from "zod";
import { eq, and, getTableColumns, sql } from "drizzle-orm";
import { agents, meetings } from "@/db/schema";
import { db } from "@/db"; 
import { createTRPCRouter,protectedProcedure} from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { meetingsInsertSchema } from "../schemas";
import { meetingsUpdateSchema } from "../schemas";
export const meetingsRouter = createTRPCRouter({
  update: protectedProcedure
    .input(meetingsUpdateSchema)
    .mutation( async ({ input,ctx}) => {
          const [updatedMeeting] = await db
              .update(meetings)
              .set(input)
              .where(
                and(
                  eq(meetings.id, input.id),
                  eq(meetings.userid,ctx.auth.user.id),
                ),
              )
              .returning();
          if (!updatedMeeting) {
            throw new TRPCError({code: "NOT_FOUND", message: "Meeting not found"});
          }
          return updatedMeeting;
      }),

  create: protectedProcedure.input(meetingsInsertSchema).mutation( async ({ input,ctx}) => {
          const [createdMeeting] = await db
              .insert(meetings)
              .values({
                  ...input,
                  userid: ctx.auth.user.id,
                  agentid: input.agentId
              })
              .returning();
          return createdMeeting;
      }),
  getOne : protectedProcedure
  .input(z.object({id: z.string() }))
  .query( async ({ input,ctx}) => {
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
               eq(meetings.userid,ctx.auth.user.id) 
             )
           );
        if (!existingMeeting) {
          throw new TRPCError({code: "NOT_FOUND", message: "Meeting not found"});
        }
        return existingMeeting;
    }),

    getMany : protectedProcedure.query( async () => {
        const data = await db
            .select({
            ...getTableColumns(meetings),})
            .from(meetings);
        return data;
    }),
});