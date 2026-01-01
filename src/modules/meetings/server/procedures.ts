import { z } from "zod";
import { eq, and, getTableColumns, sql } from "drizzle-orm";
import { agents, meetings } from "@/db/schema";
import { db } from "@/db"; 
import { streamVideo } from "@/lib/stream-video";
import { createTRPCRouter,protectedProcedure} from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { meetingsInsertSchema } from "../schemas";
import { meetingsUpdateSchema } from "../schemas";
import { generateAvatarUri } from "@/lib/avatar";
export const meetingsRouter = createTRPCRouter({
  generateToken: protectedProcedure.mutation(async ({ ctx }) => {
      await streamVideo.upsertUsers([
        {
          id: ctx.auth.user.id,
          name: ctx.auth.user.name,
          role: "admin",
          image:
            ctx.auth.user.image ?? generateAvatarUri({ seed: ctx.auth.user.name, variant: "initials" }),
        },
      ]);
    const expirationTime = Math.floor(Date.now() / 1000) + 3600;
    const issuedAt = Math.floor(Date.now() / 1000) - 60;
     const token = streamVideo.generateUserToken({
      user_id: ctx.auth.user.id,
      exp: expirationTime,
      validity_in_seconds: issuedAt,
     })
     return token;
  }),
  remove: protectedProcedure
    .input(z.object({id: z.string() }))
    .mutation( async ({ input,ctx}) => {
          const [removedMeeting] = await db
              .delete(meetings)
              .where(
                and(
                  eq(meetings.id, input.id),
                  eq(meetings.userid,ctx.auth.user.id),
                ),
              )
              .returning();
          if (!removedMeeting) {
            throw new TRPCError({code: "NOT_FOUND", message: "Meeting not found"});
          }
          return removedMeeting;
      }),
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
          const call=streamVideo.video.call("default",createdMeeting.id);
          await call.create({
            data:{
              created_by_id: ctx.auth.user.id,
              custom:{
                meetingId: createdMeeting.id,
                meetingName: createdMeeting.name
              },
              settings_override:{
                transcription:{
                  language:"en",
                  mode:"auto-on",
                  closed_caption_mode:"auto-on",
                },
                recording:{
                  mode:"auto-on",
                  quality:"1080p"
                },
              },
            },
          });
          const [existingAgent]= await db
              .select()
              .from(agents)
              .where(eq(agents.id, input.agentId));
          if(!existingAgent){
            throw new TRPCError({code: "NOT_FOUND",
               message: "Agent not found",
              });         
            }

            await streamVideo.upsertUsers([
              {
                id: existingAgent.id,
                name: existingAgent.name,
                role:"user",
                image:generateAvatarUri({
                  seed: existingAgent.name,
                  variant:"botttsNeutral"
                }),
              },
            ]);
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