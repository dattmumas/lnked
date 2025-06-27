"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";

// Constants for validation
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 100;
const MIN_SLUG_LENGTH = 3;
const MAX_SLUG_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 500;

const CollectiveSchema = z.object({
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
      "Slug can only contain lowercase letters, numbers, and hyphens"
    ),
  description: z
    .string()
    .max(MAX_DESCRIPTION_LENGTH, `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`)
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
  const supabase = await createServerSupabaseClient();

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

  // Check slug uniqueness across both collectives and tenants
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
  if ((existingSlug?.slug ?? '').trim().length > 0) {
    return {
      error: "This slug is already taken. Please choose another one.",
      fieldErrors: { slug: ["This slug is already taken."] },
    };
  }

  // Also check tenant slug uniqueness
  const { data: existingTenantSlug, error: tenantSlugCheckError } = await supabase
    .from("tenants")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();

  if (tenantSlugCheckError && tenantSlugCheckError.code !== "PGRST116") {
    console.error("Error checking tenant slug uniqueness:", tenantSlugCheckError);
    return { error: "Database error while checking tenant slug uniqueness." };
  }
  if ((existingTenantSlug?.slug ?? '').trim().length > 0) {
    return {
      error: "This slug is already taken. Please choose another one.",
      fieldErrors: { slug: ["This slug is already taken."] },
    };
  }

  // Use the create_collective_tenant RPC to create both tenant and collective atomically
  const { data: tenantId, error: createTenantError } = await supabase.rpc(
    "create_collective_tenant",
    {
      tenant_name: name,
      tenant_slug: slug,
      ...(description ? { tenant_description: description } : {}),
      is_public: false, // Default to private collectives
    }
  );

  if (createTenantError) {
    console.error("Error creating collective tenant:", createTenantError);
    
    // Handle specific error codes
    if (createTenantError.code === "23505") {
      // Unique violation
      return {
        error: "A collective with this name or URL already exists. Please choose a different name.",
      };
    }
    
    return { error: `Failed to create collective: ${createTenantError.message}` };
  }

  if (!tenantId) {
    return { error: "Failed to create collective for an unknown reason." };
  }

  // The RPC should have created both the tenant and collective, and added the owner to tenant_members
  // Let's verify the collective was created and get its details
  const { data: newCollective, error: collectiveError } = await supabase
    .from("collectives")
    .select("id, slug")
    .eq("slug", slug)
    .single();

  if (collectiveError || !newCollective) {
    console.error("Error fetching created collective:", collectiveError);
    return { error: "Collective creation may have failed - please try again." };
  }

  // Revalidate paths to show new data immediately
  revalidatePath("/dashboard"); // Revalidate the main dashboard page
  revalidatePath("/dashboard/collectives/new");

  return { data: { id: newCollective.id, slug: newCollective.slug } };
}
