import { z } from "zod";
import { eq, getTableColumns,sql} from "drizzle-orm";
import { agents } from "@/db/schema";
import { db } from "@/db"; // Add this import for db instance
import { createTRPCRouter,protectedProcedure} from "@/trpc/init";
import { agentsInsertSchema } from "../schemas";


export const agentsRouter = createTRPCRouter({
  getOne : protectedProcedure
  .input(z.object({id: z.string() }))
  .query( async ({ input}) => {
        const [existingagent] = await db
           .select({
             meetingCount: sql`5`,
             ...getTableColumns(agents),
           })
           .from(agents)
           .where(eq(agents.id, input.id)); // Example condition, replace with actual logic
    return existingagent;
    }),

    getMany : protectedProcedure.query( async () => {
        const data = await db
            .select()
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