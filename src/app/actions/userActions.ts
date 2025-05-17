"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database, TablesUpdate } from "@/lib/database.types";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// Schema for validating user profile updates
// Adjust fields and validation rules as necessary
const UserProfileSchema = z.object({
  full_name: z
    .string()
    .min(1, "Full name cannot be empty.")
    .max(100, "Full name must be 100 characters or less."),
  bio: z
    .string()
    .max(500, "Bio must be 500 characters or less.")
    .optional()
    .nullable(),
  // Assuming tags is an array of strings, to be stored as text[] in Supabase
  // For simplicity, we might handle string-to-array conversion here or expect a specific format.
  // Let's assume a comma-separated string for now from the form, then split into an array.
  tags_string: z
    .string()
    .optional()
    .nullable()
    .transform((val) =>
      val
        ? val
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag)
        : []
    ),
});

// This type represents the data *after* Zod parsing and transformation (tags_string is string[])
// export type UserProfileFormValues = z.infer<typeof UserProfileSchema>;
// We will rename this to reflect its post-transformation state.
export type ProcessedUserProfileFormValues = z.infer<typeof UserProfileSchema>;

// This type represents the raw form input *before* Zod transformation (tags_string is string | null | undefined)
export type RawUserProfileFormInput = Omit<
  ProcessedUserProfileFormValues,
  "tags_string"
> & {
  tags_string?: string | null;
};

interface UpdateUserProfileResult {
  success: boolean;
  message?: string;
  error?: string;
  // Field errors should ideally map to RawUserProfileFormInput keys if they occur before transform
  fieldErrors?: Partial<Record<keyof RawUserProfileFormInput, string[]>>;
}

export async function updateUserProfile(
  formData: RawUserProfileFormInput // Use the raw input type for the function signature
): Promise<UpdateUserProfileResult> {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieStore }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "You must be logged in to update your profile.",
    };
  }

  const validatedFields = UserProfileSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Invalid input. Please check the fields.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  // The validatedFields.data will have tags_string as string[] due to the transform
  const {
    full_name,
    bio,
    tags_string: transformed_tags,
  } = validatedFields.data;

  const profileUpdate: TablesUpdate<"users"> = {
    full_name,
    bio: bio || null, // Ensure null if empty string
    tags:
      transformed_tags && transformed_tags.length > 0 ? transformed_tags : null, // Store as array or null
  };

  const { error: updateError } = await supabase
    .from("users")
    .update(profileUpdate)
    .eq("id", user.id);

  if (updateError) {
    console.error("Error updating user profile:", updateError);
    return {
      success: false,
      error: `Failed to update profile: ${updateError.message}`,
    };
  }

  // Revalidate paths that display user profile information
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile/edit");
  // Add any other paths, e.g., public user profile page if it exists
  // revalidatePath(`/profile/${user.id}`); // Example if such a page exists

  return { success: true, message: "Profile updated successfully." };
}
