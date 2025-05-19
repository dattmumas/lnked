import { z } from "zod";

export const CollectiveSettingsClientSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters long")
    .max(100, "Name must be 100 characters or less"),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters long")
    .max(50, "Slug must be 50 characters or less")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug can only contain lowercase letters, numbers, and hyphens. It will be auto-generated if left similar to current name-based slug."
    ),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .nullable(),
  tags_string: z.string().optional().nullable(),
});

export const CollectiveSettingsServerSchema =
  CollectiveSettingsClientSchema.extend({
    tags_string: CollectiveSettingsClientSchema.shape.tags_string.transform(
      (val) =>
        val
          ? val
              .split(",")
              .map((tag) => tag.trim())
              .filter((tag) => tag)
          : []
    ),
  });

export type CollectiveSettingsClientFormValues = z.infer<
  typeof CollectiveSettingsClientSchema
>;
export type CollectiveSettingsServerFormValues = z.infer<
  typeof CollectiveSettingsServerSchema
>;
