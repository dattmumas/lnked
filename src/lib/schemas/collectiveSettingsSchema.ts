import { z } from "zod";
import { MIN_NAME_LENGTH, MAX_NAME_LENGTH, MIN_SLUG_LENGTH, MAX_SLUG_LENGTH, MAX_DESCRIPTION_LENGTH } from "@/lib/constants/collective";

export const CollectiveSettingsClientSchema = z.object({
  name: z
    .string()
    .min(MIN_NAME_LENGTH, `Name must be at least ${MIN_NAME_LENGTH} characters long`)
    .max(MAX_NAME_LENGTH, `Name must be ${MAX_NAME_LENGTH} characters or less`),
  slug: z
    .string()
    .min(MIN_SLUG_LENGTH, `Slug must be at least ${MIN_SLUG_LENGTH} characters long`)
    .max(MAX_SLUG_LENGTH, `Slug must be ${MAX_SLUG_LENGTH} characters or less`)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug can only contain lowercase letters, numbers, and hyphens. It will be auto-generated if left similar to current name-based slug."
    ),
  description: z
    .string()
    .max(
      MAX_DESCRIPTION_LENGTH,
      `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`
    )
    .optional()
    .nullable(),
  tags_string: z.string().optional().nullable(),
});

export const CollectiveSettingsServerSchema =
  CollectiveSettingsClientSchema.extend({
    tags_string: CollectiveSettingsClientSchema.shape.tags_string.transform(
      (val) => {
        if (val === undefined || val === null || val.trim() === "") {
          return [];
        }
        return val
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag !== "");
      }
    ),
  });

export type CollectiveSettingsClientFormValues = z.infer<
  typeof CollectiveSettingsClientSchema
>;
export type CollectiveSettingsServerFormValues = z.infer<
  typeof CollectiveSettingsServerSchema
>;
