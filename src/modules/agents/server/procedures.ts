import { z } from "zod";
import { eq, and, getTableColumns, sql} from "drizzle-orm";
import { agents, meetings } from "@/db/schema";
import { db } from "@/db"; // Add this import for db instance
import { createTRPCRouter,protectedProcedure} from "@/trpc/init";
import { agentsInsertSchema, agentsUpdateSchema } from "../schemas";
import { TRPCError } from "@trpc/server";

export const agentsRouter = createTRPCRouter({
  update: protectedProcedure
  .input(agentsUpdateSchema)
  .mutation( async ({ input,ctx}) => {
        const [updatedAgent] = await db
            .update(agents)
            .set(input)
            .where(
              and(
                eq(agents.id, input.id),
                eq(agents.userid,ctx.auth.user.id),
              ),
            )
            .returning();
        if (!updatedAgent) {
          throw new TRPCError({code: "NOT_FOUND", message: "Agent not found"});
        }
        return updatedAgent;
    }),
  remove:protectedProcedure
   .input(z.object({id: z.string()}))
   .mutation( async ({ ctx,input}) => {
       const [removedAgent] = await db
          .delete(agents)
          .where(
            and(
              eq(agents.id, input.id),
              eq(agents.userid,ctx.auth.user.id),
            ),
          )
          .returning();
        if (!removedAgent) {
          throw new TRPCError({code: "NOT_FOUND", message: "Agent not found"});
        }
        return removedAgent;
        }),
  getOne : protectedProcedure
  .input(z.object({id: z.string() }))
  .query( async ({ input,ctx}) => {
        const [existingagent] = await db
           .select({
             meetingCount: db.$count(meetings, eq(agents.id, meetings.agentid)),
           })
           .from(agents)
           .where(
             and(
               eq(agents.id, input.id),
               eq(agents.userid,ctx.auth.user.id) 
             )
           );
        if (!existingagent) {
          throw new TRPCError({code: "NOT_FOUND", message: "Agent not found"});
        }
        return existingagent;
    }),

    getMany : protectedProcedure.query( async () => {
        const data = await db
            .select({
              ...getTableColumns(agents),
              meetingCount: db.$count(meetings, eq(agents.id, meetings.agentid))
            })
            .from(agents);
        return data;
    }),

    create : protectedProcedure.input(agentsInsertSchema).mutation( async ({ input,ctx}) => {
        const [createdAgent] = await db
            .insert(agents)
            .values({
                ...input,
                userid: ctx.auth.user.id, // Ensure this matches your schema's field name
                createdAt: new Date(), // Add required createdAt field
            })
            .returning();
        return createdAgent;
    }),
});