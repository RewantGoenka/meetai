import { z } from "zod";

export const meetingsInsertSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  agentId: z.string().min(1, "Agent is required").max(1000, "Instructions must be at most 1000 characters"),
});

export const meetingsUpdateSchema = meetingsInsertSchema.extend({
  id: z.string().min(1, "ID is required"),
});

