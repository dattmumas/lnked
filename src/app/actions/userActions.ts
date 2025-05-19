"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/database.types";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe";

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
  const supabase = await createServerSupabaseClient();

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

export async function deleteUserAccount(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Not authenticated." };
  }
  const userId = user.id;
  const userEmail = user.email;

  // 1. Check if user is owner of any collectives
  const { data: ownedCollectives } = await supabaseAdmin
    .from("collectives")
    .select("id, name")
    .eq("owner_id", userId);
  if (ownedCollectives && ownedCollectives.length > 0) {
    return {
      success: false,
      error:
        "You must transfer or delete all collectives you own before deleting your account.",
    };
  }

  // 2. Cancel Stripe subscriptions (as subscriber)
  const stripe = getStripe();
  if (stripe) {
    const { data: subscriptions } = await supabaseAdmin
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"]);
    if (subscriptions) {
      for (const sub of subscriptions) {
        try {
          await stripe.subscriptions.cancel(sub.id);
        } catch (err) {
          console.error("Error cancelling Stripe subscription:", err);
        }
      }
    }
    // 3. Delete Stripe customer (if exists)
    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();
    if (customer?.stripe_customer_id) {
      try {
        await stripe.customers.del(customer.stripe_customer_id);
      } catch (err) {
        console.error("Error deleting Stripe customer:", err);
      }
    }
    // 4. Delete Stripe Connect account (if exists)
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("stripe_account_id")
      .eq("id", userId)
      .maybeSingle();
    if (userRow?.stripe_account_id) {
      try {
        await stripe.accounts.del(userRow.stripe_account_id);
      } catch (err) {
        console.error("Error deleting Stripe Connect account:", err);
      }
    }
  }

  // 5. Remove from all memberships
  await supabaseAdmin.from("collective_members").delete().eq("user_id", userId);

  // 6. Delete/anonymize user content (posts, comments, etc.)
  // (Optional: anonymize instead of delete for posts/comments)
  await supabaseAdmin.from("posts").delete().eq("author_id", userId);
  await supabaseAdmin.from("comments").delete().eq("user_id", userId);

  // 7. Delete from users/profile tables
  await supabaseAdmin.from("users").delete().eq("id", userId);
  await supabaseAdmin.from("customers").delete().eq("id", userId);

  // 8. Delete from Supabase Auth
  try {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  } catch (err: any) {
    return {
      success: false,
      error: "Failed to delete Supabase Auth user: " + err.message,
    };
  }

  return { success: true };
}
