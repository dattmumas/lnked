import { z } from "zod";

export const postFormFieldsSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  status: z.enum(["draft", "published", "scheduled"]),
  published_at: z.string().optional().nullable(),
  selected_collectives: z.array(z.string().uuid()).optional().default([]),
});

export type PostFormFieldsValues = z.infer<typeof postFormFieldsSchema>;
