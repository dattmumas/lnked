import { z } from 'zod';

export const collectiveSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long.'),
  description: z.string().optional(),
  slug: z.string().min(3, 'Slug must be at least 3 characters long.'),
});
