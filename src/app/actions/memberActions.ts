"use server";

import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/database.types";
import {
  InviteMemberServerSchema,
  type InviteMemberServerValues,
  InviteMemberClientSchema,
} from "@/lib/schemas/memberSchemas";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

interface ActionResult<T = null> {
  success: boolean;
  data?: T;
  error?: string | null;
  fieldErrors?: Partial<
    Record<keyof z.infer<typeof InviteMemberClientSchema>, string[]>
  >;
}

export async function inviteMemberToCollective(
  formData: InviteMemberServerValues
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    return { success: false, error: "Unauthorized: You must be logged in." };
  }

  const validationResult = InviteMemberServerSchema.safeParse(formData);
  if (!validationResult.success) {
    return {
      success: false,
      error: "Invalid input.",
      fieldErrors: validationResult.error.flatten().fieldErrors,
    };
  }

  const { collectiveId, email, role } = validationResult.data;

  try {
    // 1. Verify current user is the owner of the collective
    const { data: collective, error: collectiveError } = await supabaseAdmin
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
        error: "Only the collective owner can invite members.",
      };
    }

    // 2. Find the user ID for the provided email
    const { data: invitedUser, error: userLookupError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (userLookupError || !invitedUser) {
      return { success: false, error: `User with email "${email}" not found.` };
    }

    if (invitedUser.id === currentUser.id) {
      return { success: false, error: "You cannot invite yourself." };
    }

    // 3. Check if the user is already a member
    const { data: existingMember, error: memberCheckError } =
      await supabaseAdmin
        .from("collective_members")
        .select("id")
        .eq("collective_id", collectiveId)
        .eq("user_id", invitedUser.id)
        .maybeSingle();

    if (memberCheckError) {
      console.error("Error checking existing member:", memberCheckError);
      return { success: false, error: "Database error checking membership." };
    }
    if (existingMember) {
      return {
        success: false,
        error: "This user is already a member of the collective.",
      };
    }

    // 4. Add the user to the collective
    const { error: insertError } = await supabaseAdmin
      .from("collective_members")
      .insert({
        collective_id: collectiveId,
        user_id: invitedUser.id,
        role: role as Enums<"collective_member_role">,
      });

    if (insertError) {
      console.error("Error inviting member:", insertError);
      return {
        success: false,
        error: "Failed to invite member. " + insertError.message,
      };
    }

    return { success: true };
  } catch (e) {
    console.error("Unexpected error inviting member:", e);
    return { success: false, error: "An unexpected error occurred." };
  }
}
