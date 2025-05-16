"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr"; // Corrected import
import { cookies } from "next/headers";
// import { revalidatePath } from "next/cache"; // Removed as it's not used
import { z } from "zod";

// Define Zod schema for input validation
const FeedbackSchema = z.object({
  collectiveId: z.string().uuid(),
  feedbackType: z.enum([
    "recommended_interested",
    "recommended_not_interested",
  ]),
});

interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>; // For Zod field errors
}

/**
 * Logs user feedback for a recommended collective.
 * @param prevState - The previous state of the form.
 * @param formData - The form data submitted.
 */
export async function logRecommendationFeedback(
  prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const cookieStore = await cookies(); // Correctly awaited

  // Correct Supabase client initialization for Server Actions
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set(name, "", options);
        },
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "User not authenticated" };
  }

  const rawData = {
    collectiveId: formData.get("collectiveId"),
    feedbackType: formData.get("feedbackType"),
  };

  const validation = FeedbackSchema.safeParse(rawData);

  if (!validation.success) {
    return {
      success: false,
      error: "Invalid input.",
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const { collectiveId, feedbackType } = validation.data;

  try {
    const { error: insertError } = await supabase.from("interactions").insert({
      user_id: user.id,
      entity_id: collectiveId,
      entity_type: "collective", // From your ENUM
      interaction_type: feedbackType, // From your ENUM
    });

    if (insertError) {
      console.error("Error inserting interaction:", insertError);
      // Check for unique constraint violation (user already interacted)
      if (insertError.code === "23505") {
        // PostgreSQL unique violation code
        return { success: true, message: "Feedback already recorded." };
      }
      return {
        success: false,
        error: "Failed to record feedback.",
        message: insertError.message,
      };
    }

    // Optionally revalidate the path if the UI should change based on this feedback immediately
    // For simple feedback logging, this might not be strictly necessary
    // revalidatePath('/discover');

    return { success: true, message: "Feedback recorded successfully." };
  } catch (e) {
    console.error("Unexpected error recording feedback:", e);
    const errorMessage =
      e instanceof Error ? e.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}
