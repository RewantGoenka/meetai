import { agents } from "@/db/schema";
import { db } from "@/db"; // Add this import for db instance
import { createTRPCRouter,baseProcedure } from "@/trpc/init";

export const agentsRouter = createTRPCRouter({
    getMany : baseProcedure.query( async () => {
    const data = await db
       .select()
       .from(agents);
        return data;
    }),
});