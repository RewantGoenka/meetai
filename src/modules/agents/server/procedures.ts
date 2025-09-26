import { z } from "zod";
import { eq, and, getTableColumns, sql } from "drizzle-orm";
import { agents } from "@/db/schema";
import { db } from "@/db"; // Add this import for db instance
import { createTRPCRouter,protectedProcedure} from "@/trpc/init";
import { agentsInsertSchema } from "../schemas";
import { TRPCError } from "@trpc/server";

export const agentsRouter = createTRPCRouter({
  getOne : protectedProcedure
  .input(z.object({id: z.string() }))
  .query( async ({ input,ctx}) => {
        const [existingagent] = await db
           .select({
             meetingCount: sql<number>`5`,
             ...getTableColumns(agents),
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
            .select({meetingCount: sql<number>`5`,
             ...getTableColumns(agents),})
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