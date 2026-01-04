import { createTRPCRouter } from "../init";

// Keep Next alias imports if needed (optional)
import { agentsRouter } from "@/modules/agents/server/procedures";
import { meetingsRouter } from "@/modules/meetings/server/procedures";

export const appRouter = createTRPCRouter({      
  agents: agentsRouter,   // Next-only
  meetings: meetingsRouter, // Next-only
});

// export type definition of API
export type AppRouter = typeof appRouter;
