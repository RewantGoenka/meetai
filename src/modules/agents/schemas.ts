import { z } from "zod";

export const agentsInsertSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  instructions: z.string().min(1, "Instructions are required").max(1000, "Instructions must be at most 1000 characters"),
});

export const agentsUpdateSchema = agentsInsertSchema.extend({
  id: z.string().min(1, "ID is required"),
});

export type AgentsInsertInput = z.infer<typeof agentsInsertSchema>;
export type AgentsUpdateInput = z.infer<typeof agentsUpdateSchema>;