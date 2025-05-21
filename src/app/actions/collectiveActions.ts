"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  Database,
  Enums,
  TablesInsert,
  TablesUpdate,
} from "@/lib/database.types";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  CollectiveSettingsServerSchema,
  CollectiveSettingsServerFormValues,
} from "@/lib/schemas/collectiveSettingsSchema";
import { getStripe } from "@/lib/stripe";

const emailSchema = z.string().email({ message: "Invalid email address." });

interface CollectiveActionError {
  error: string;
  fieldErrors?: Partial<{ email: string; role: string; general: string }>;
}

interface CollectiveActionResult {
  success: boolean;
  message?: string;
  error?: string; // General error message
  fieldErrors?: CollectiveActionError["fieldErrors"];
}

type CollectiveRow = Database["public"]["Tables"]["collectives"]["Row"];

// --- Invite User to Collective ---
export async function inviteUserToCollective(
  collectiveId: string,
  inviteeEmail: string,
  role: Enums<"collective_member_role">
): Promise<CollectiveActionResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user: currentUser },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !currentUser) {
    return { success: false, error: "User not authenticated." };
  }

  // Validate email
  const emailValidation = emailSchema.safeParse(inviteeEmail);
  if (!emailValidation.success) {
    return { success: false, fieldErrors: { email: "Invalid email address." } };
  }

  // 1. Verify current user owns the collective
  const { data: collective, error: collectiveFetchError } = await supabase
    .from("collectives")
    .select("owner_id")
    .eq("id", collectiveId)
    .eq("owner_id", currentUser.id)
    .single();

  if (collectiveFetchError || !collective) {
    return {
      success: false,
      error: "Collective not found or you are not the owner.",
    };
  }

  // 2. Find the user to invite by email (from public.users table)
  // Ensure your public.users table has an email column that is synced or populated
  const { data: inviteeUser, error: inviteeFetchError } = await supabase
    .from("users") // Assuming email is in public.users and is unique
    .select("id")
    .eq("email", inviteeEmail)
    .single();

  if (inviteeFetchError && inviteeFetchError.code !== "PGRST116") {
    // PGRST116 means no rows, which is fine before checking inviteeUser
    console.error(
      "Error fetching invitee by email:",
      inviteeFetchError.message
    );
    return { success: false, error: "Error finding user by email." };
  }

  if (!inviteeUser) {
    return {
      success: false,
      error: `User with email ${inviteeEmail} not found.`,
      fieldErrors: { email: "User not found." },
    };
  }

  if (inviteeUser.id === currentUser.id) {
    return {
      success: false,
      error: "You cannot invite yourself to the collective.",
      fieldErrors: { email: "You are already the owner." },
    };
  }

  // 3. Check if user is already a member
  const { data: existingMember, error: memberCheckError } = await supabase
    .from("collective_members")
    .select("id")
    .eq("collective_id", collectiveId)
    .eq("user_id", inviteeUser.id)
    .maybeSingle();

  if (memberCheckError) {
    return { success: false, error: "Error checking existing membership." };
  }
  if (existingMember) {
    return {
      success: false,
      error: "This user is already a member of the collective.",
      fieldErrors: { email: "User is already a member." },
    };
  }

  // 4. Add user to collective_members
  const memberData: TablesInsert<"collective_members"> = {
    collective_id: collectiveId,
    member_id: inviteeUser.id,
    role: role,
  };

  const { error: insertError } = await supabase
    .from("collective_members")
    .insert(memberData);

  if (insertError) {
    console.error("Error adding member to collective:", insertError.message);
    if (insertError.code === "23503") {
      // Foreign key violation
      return {
        success: false,
        error: "Invalid user or collective ID provided.",
      };
    }
    return {
      success: false,
      error: `Failed to add member: ${insertError.message}`,
    };
  }

  revalidatePath(`/dashboard/collectives/${collectiveId}/manage/members`); // Assuming this will be the path
  return {
    success: true,
    message: `${inviteeEmail} has been added as a ${role}.`,
  };
}

// --- Remove User from Collective ---
export async function removeUserFromCollective(
  collectiveId: string, // To verify ownership and for revalidation
  membershipId: string // The ID of the collective_members record
): Promise<CollectiveActionResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user: currentUser },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !currentUser) {
    return { success: false, error: "User not authenticated." };
  }

  // Define the expected type for memberRecord.collective more accurately
  type FetchedCollectiveForMember = Pick<CollectiveRow, "owner_id">; // Only need owner_id from the nested collective
  type MemberRecordWithCollective = {
    collective_id: string;
    user_id: string;
    collective: FetchedCollectiveForMember | null;
  };

  const { data: memberRecord, error: memberFetchError } = await supabase
    .from("collective_members")
    .select(
      "collective_id, user_id, collective:collectives!collective_id(owner_id)"
    )
    .eq("id", membershipId)
    .single<MemberRecordWithCollective>();

  if (memberFetchError || !memberRecord || !memberRecord.collective) {
    return { success: false, error: "Membership record not found or invalid." };
  }

  if (memberRecord.collective.owner_id !== currentUser.id) {
    return {
      success: false,
      error: "Only the collective owner can remove members.",
    };
  }

  // Prevent owner from removing themselves via this action if they are the last admin/owner
  // This logic could be more complex depending on roles. For now, owner cannot remove self if they are the target.
  if (
    memberRecord.user_id === currentUser.id &&
    memberRecord.collective.owner_id === currentUser.id
  ) {
    return {
      success: false,
      error: "Collective owner cannot remove themselves through this action.",
    };
  }

  // 2. Delete the membership
  const { error: deleteError } = await supabase
    .from("collective_members")
    .delete()
    .eq("id", membershipId);

  if (deleteError) {
    console.error(
      "Error removing member from collective:",
      deleteError.message
    );
    return {
      success: false,
      error: `Failed to remove member: ${deleteError.message}`,
    };
  }

  revalidatePath(
    `/dashboard/collectives/${memberRecord.collective_id}/manage/members`
  );
  return { success: true, message: "Member removed successfully." };
}

// --- Update Member Role in Collective ---
export async function updateMemberRole(
  collectiveId: string, // To verify ownership and for revalidation
  membershipId: string, // The ID of the collective_members record to update
  newRole: Enums<"collective_member_role">
): Promise<CollectiveActionResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user: currentUser },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !currentUser) {
    return { success: false, error: "User not authenticated." };
  }

  // 1. Verify current user owns the collective associated with this membershipId
  const { data: memberRecord, error: memberFetchError } = await supabase
    .from("collective_members")
    .select(
      "collective_id, user_id, role, collective:collectives!collective_id(owner_id)"
    )
    .eq("id", membershipId)
    .eq("collective_id", collectiveId) // Ensure membershipId is for the given collectiveId
    .single();

  if (memberFetchError || !memberRecord || !memberRecord.collective) {
    return {
      success: false,
      error: "Membership record not found or invalid for this collective.",
    };
  }

  if (memberRecord.collective.owner_id !== currentUser.id) {
    return {
      success: false,
      error: "Only the collective owner can change member roles.",
    };
  }

  // Prevent owner from changing their own role if they are the target member and it would demote them from 'admin'
  // (assuming owner is implicitly an admin or has an 'admin' role record)
  if (
    memberRecord.user_id === currentUser.id &&
    memberRecord.role === "admin" &&
    newRole !== "admin"
  ) {
    return {
      success: false,
      error: "Collective owner cannot demote themselves from admin role.",
    };
  }

  // 2. Update the role
  const { error: updateError } = await supabase
    .from("collective_members")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", membershipId);

  if (updateError) {
    console.error("Error updating member role:", updateError.message);
    return {
      success: false,
      error: `Failed to update role: ${updateError.message}`,
    };
  }

  revalidatePath(`/dashboard/collectives/${collectiveId}/manage/members`);
  return { success: true, message: "Member role updated successfully." };
}

// --- Update Collective Settings ---

interface UpdateCollectiveSettingsResult {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Partial<
    Record<keyof CollectiveSettingsServerFormValues, string[]>
  >;
  updatedSlug?: string; // To redirect if slug changes
}

export async function updateCollectiveSettings(
  collectiveId: string,
  formData: CollectiveSettingsServerFormValues
): Promise<UpdateCollectiveSettingsResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user: currentUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !currentUser) {
    return { success: false, error: "User not authenticated." };
  }

  // 1. Verify current user owns the collective
  const { data: collective, error: collectiveFetchError } = await supabase
    .from("collectives")
    .select("owner_id, slug")
    .eq("id", collectiveId)
    .single();

  if (collectiveFetchError || !collective) {
    return { success: false, error: "Collective not found." };
  }
  if (collective.owner_id !== currentUser.id) {
    return {
      success: false,
      error: "You are not the owner of this collective.",
    };
  }

  const validatedFields = CollectiveSettingsServerSchema.safeParse(formData);
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Invalid input. Please check the fields.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const {
    name,
    slug,
    description,
    tags_string: transformed_tags,
  } = validatedFields.data;

  // 2. Check if new slug is unique (if it changed)
  if (slug !== collective.slug) {
    const { data: existingSlug, error: slugCheckError } = await supabase
      .from("collectives")
      .select("id")
      .eq("slug", slug)
      .not("id", "eq", collectiveId) // Exclude current collective
      .maybeSingle();

    if (slugCheckError) {
      console.error("Error checking slug uniqueness:", slugCheckError);
      return {
        success: false,
        error: "Database error checking slug uniqueness.",
      };
    }
    if (existingSlug) {
      return {
        success: false,
        error: "This slug is already taken. Please choose another one.",
        fieldErrors: { slug: ["This slug is already taken."] },
      };
    }
  }

  const collectiveUpdate: TablesUpdate<"collectives"> = {
    name,
    slug,
    description: description || null,
    tags:
      transformed_tags && transformed_tags.length > 0 ? transformed_tags : null,
    // updated_at will be handled by the database
  };

  const { error: updateError } = await supabase
    .from("collectives")
    .update(collectiveUpdate)
    .eq("id", collectiveId);

  if (updateError) {
    console.error("Error updating collective settings:", updateError);
    if (updateError.code === "23505") {
      // Unique constraint violation
      return {
        success: false,
        error:
          "A collective with this name or slug might already exist (check database logs for details).",
        fieldErrors: {
          slug: ["This slug might already be in use."],
          name: ["This name might already be in use."],
        },
      };
    }
    return {
      success: false,
      error: `Failed to update collective: ${updateError.message}`,
    };
  }

  revalidatePath(`/dashboard/collectives/${collectiveId}/settings`);
  revalidatePath(`/dashboard`); // Revalidate dashboard as collective name/slug might be displayed there
  if (slug !== collective.slug) {
    revalidatePath(`/${collective.slug}`); // Old slug path
    revalidatePath(`/${slug}`); // New slug path
  }

  return {
    success: true,
    message: "Collective settings updated successfully.",
    updatedSlug: slug !== collective.slug ? slug : undefined,
  };
}

/**
 * Fetch Stripe Connect account status for a collective.
 * Returns null if not connected, or Stripe account status fields if connected.
 */
export async function getCollectiveStripeStatus(collectiveId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }
  // Only owner can view
  const { data: collective, error: collectiveError } = await supabase
    .from("collectives")
    .select("id, owner_id, stripe_account_id")
    .eq("id", collectiveId)
    .single();
  if (collectiveError || !collective) {
    return { error: "Collective not found" };
  }
  if (collective.owner_id !== user.id) {
    return { error: "Forbidden: Not the owner" };
  }
  if (!collective.stripe_account_id) {
    return { status: "not_connected" };
  }
  const stripe = getStripe();
  if (!stripe) {
    return { error: "Stripe not configured" };
  }
  try {
    const account = await stripe.accounts.retrieve(
      collective.stripe_account_id
    );
    return {
      status:
        account.charges_enabled && account.payouts_enabled
          ? "active"
          : account.details_submitted
          ? "pending"
          : "incomplete",
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      requirements: account.requirements,
      email: account.email,
      type: account.type,
      id: account.id,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch Stripe account status";
    return { error: message };
  }
}

/**
 * Delete a collective and all related data (owner only).
 */
export async function deleteCollective({
  collectiveId,
}: {
  collectiveId: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: currentUser },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !currentUser) {
    return { success: false, error: "Not authenticated." };
  }
  // Only owner can delete
  const { data: collective, error: collectiveError } = await supabase
    .from("collectives")
    .select("owner_id")
    .eq("id", collectiveId)
    .single();
  if (collectiveError || !collective) {
    return { success: false, error: "Collective not found." };
  }
  if (collective.owner_id !== currentUser.id) {
    return {
      success: false,
      error: "Only the owner can delete this collective.",
    };
  }
  // Delete all posts
  await supabase.from("posts").delete().eq("collective_id", collectiveId);
  // Delete all members
  await supabase
    .from("collective_members")
    .delete()
    .eq("collective_id", collectiveId);
  // Delete all invites
  await supabase
    .from("collective_invites")
    .delete()
    .eq("collective_id", collectiveId);
  // Delete the collective
  const { error: deleteError } = await supabase
    .from("collectives")
    .delete()
    .eq("id", collectiveId);
  if (deleteError) {
    return {
      success: false,
      error: "Failed to delete collective: " + deleteError.message,
    };
  }
  return { success: true };
}

/**
 * Transfer ownership of a collective to another member (owner only).
 */
export async function transferCollectiveOwnership({
  collectiveId,
  newOwnerId,
}: {
  collectiveId: string;
  newOwnerId: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: currentUser },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !currentUser) {
    return { success: false, error: "Not authenticated." };
  }
  // Only owner can transfer
  const { data: collective, error: collectiveError } = await supabase
    .from("collectives")
    .select("owner_id")
    .eq("id", collectiveId)
    .single();
  if (collectiveError || !collective) {
    return { success: false, error: "Collective not found." };
  }
  if (collective.owner_id !== currentUser.id) {
    return { success: false, error: "Only the owner can transfer ownership." };
  }
  if (newOwnerId === currentUser.id) {
    return { success: false, error: "You are already the owner." };
  }
  // Check that newOwnerId is a member
  const { data: member } = await supabase
    .from("collective_members")
    .select("id")
    .eq("collective_id", collectiveId)
    .eq("user_id", newOwnerId)
    .maybeSingle();
  if (!member) {
    return { success: false, error: "New owner must be a current member." };
  }
  // Update owner_id in collectives
  const { error: updateError } = await supabase
    .from("collectives")
    .update({ owner_id: newOwnerId })
    .eq("id", collectiveId);
  if (updateError) {
    return {
      success: false,
      error: "Failed to transfer ownership: " + updateError.message,
    };
  }
  // Update roles: set new owner to 'owner', old owner to 'editor'
  await supabase
    .from("collective_members")
    .update({ role: "owner" })
    .eq("collective_id", collectiveId)
    .eq("user_id", newOwnerId);
  await supabase
    .from("collective_members")
    .update({ role: "editor" })
    .eq("collective_id", collectiveId)
    .eq("user_id", currentUser.id);
  return { success: true };
}

// Ensure no trailing </rewritten_file> or other extraneous characters at EOF
