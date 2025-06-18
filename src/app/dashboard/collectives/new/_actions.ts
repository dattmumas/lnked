"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const CollectiveSchema = z.object({
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
      "Slug can only contain lowercase letters, numbers, and hyphens"
    ),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional(),
});

interface CreateCollectiveResult {
  data?: { id: string; slug: string }; // Return some data on success
  error?: string;
  fieldErrors?: Partial<
    Record<keyof z.infer<typeof CollectiveSchema>, string[]>
  >;
}

export async function createCollective(
  inputData: unknown // Raw input from the form, to be parsed by Zod
): Promise<CreateCollectiveResult> {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in to create a collective." };
  }

  const validatedFields = CollectiveSchema.safeParse(inputData);

  if (!validatedFields.success) {
    console.error(
      "Validation errors:",
      validatedFields.error.flatten().fieldErrors
    );
    return {
      error: "Invalid input. Please check the fields.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, slug, description } = validatedFields.data;

  const { data: existingSlug, error: slugCheckError } = await supabase
    .from("collectives")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();

  if (slugCheckError && slugCheckError.code !== "PGRST116") {
    // PGRST116 for no rows is fine
    console.error("Error checking slug uniqueness:", slugCheckError);
    return { error: "Database error while checking slug uniqueness." };
  }
  if (existingSlug) {
    return {
      error: "This slug is already taken. Please choose another one.",
      fieldErrors: { slug: ["This slug is already taken."] },
    };
  }

  const { data: newCollective, error: insertError } = await supabase
    .from("collectives")
    .insert({
      name,
      slug,
      description: description || undefined,
      owner_id: user.id,
    })
    .select("id, slug") // Select some data to return
    .single(); // Expect a single record back

  if (insertError) {
    console.error("Error inserting collective:", insertError);
    // More specific error mapping could be done here (e.g. unique constraint violation on slug if not caught above)
    if (insertError.code === "23505") {
      // Unique violation
      return {
        error: "A collective with this name or slug might already exist.",
        fieldErrors: {
          slug: ["This slug is already in use."],
          name: ["This name may already be in use for a collective."],
        },
      };
    }
    return { error: `Failed to create collective: ${insertError.message}` };
  }

  if (!newCollective) {
    return { error: "Failed to create collective for an unknown reason." };
  }

  // Automatically add the owner as an admin member of the new collective
  // using the service role client to bypass RLS
  const { error: addOwnerAsMemberError } = await supabaseAdmin
    .from("collective_members")
    .insert({
      collective_id: newCollective.id,
      member_id: user.id, // The user who created the collective (owner)
      role: "admin", // Assign 'admin' role
    });

  if (addOwnerAsMemberError) {
    console.error(
      "Error adding owner as admin member:",
      addOwnerAsMemberError.message
    );
    // This is a critical follow-up step. If it fails, the collective is created
    // but the owner isn't an admin member, which might cause issues later.
    // For simplicity now, we'll log the error and return success for collective creation,
    // but in a production scenario, you might want to handle this more robustly
    // (e.g., attempt to delete the collective if this step fails, or alert admins).
    // Or, ideally, use a transaction (e.g., via a Supabase Edge Function or RPC).
    return {
      error: `Collective created, but failed to add owner as admin member: ${addOwnerAsMemberError.message}`,
    };
    // Or, if you want to proceed despite this error:
    // console.warn(`Collective ${newCollective.id} created, but failed to add owner as admin member.`);
  }

  // Revalidate paths if needed to show new data immediately
  revalidatePath("/dashboard"); // Revalidate the main dashboard page
  revalidatePath("/dashboard/collectives/new");

  return { data: { id: newCollective.id, slug: newCollective.slug } };
}
