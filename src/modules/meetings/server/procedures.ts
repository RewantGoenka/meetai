import { z } from "zod";
import { eq, and, getTableColumns} from "drizzle-orm";
import { meetings } from "@/db/schema";
import { db } from "@/db"; // Add this import for db instance
import { createTRPCRouter,protectedProcedure} from "@/trpc/init";
import { TRPCError } from "@trpc/server";

export const meetingsRouter = createTRPCRouter({
  getOne : protectedProcedure
  .input(z.object({id: z.string() }))
  .query( async ({ input,ctx}) => {
        const [existingMeeting] = await db
           .select({
             ...getTableColumns(meetings),
           })
           .from(meetings)
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