'use server';

import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Enums } from '@/lib/database.types';
import {
  InviteMemberServerSchema,
  type InviteMemberServerValues,
  InviteMemberClientSchema,
} from '@/lib/schemas/memberSchemas';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { randomBytes } from 'crypto';
import { sendInviteEmail } from '@/lib/email';

interface ActionResult<T = null> {
  success: boolean;
  data?: T;
  error?: string | null;
  fieldErrors?: Partial<
    Record<keyof z.infer<typeof InviteMemberClientSchema>, string[]>
  >;
}

function hasMessage(e: unknown): e is { message: string } {
  return (
    typeof e === 'object' &&
    e !== null &&
    'message' in e &&
    typeof (e as { message?: unknown }).message === 'string'
  );
}

export async function inviteMemberToCollective(
  formData: InviteMemberServerValues,
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    return { success: false, error: 'Unauthorized: You must be logged in.' };
  }

  const validationResult = InviteMemberServerSchema.safeParse(formData);
  if (!validationResult.success) {
    return {
      success: false,
      error: 'Invalid input.',
      fieldErrors: validationResult.error.flatten().fieldErrors,
    };
  }

  const { collectiveId, email, role } = validationResult.data;

  try {
    // 1. Verify current user is the owner of the collective
    const { data: collective, error: collectiveError } = await supabaseAdmin
      .from('collectives')
      .select('owner_id')
      .eq('id', collectiveId)
      .single();

    if (collectiveError || !collective) {
      return { success: false, error: 'Collective not found.' };
    }
    if (collective.owner_id !== currentUser.id) {
      return {
        success: false,
        error: 'Only the collective owner can invite members.',
      };
    }

    // 2. Find the user ID for the provided email
    const {
      data: invitedUser,
      error: userLookupError,
    }: { data: { id: string } | null; error: unknown } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (!invitedUser) {
      // Pending invite: check for existing invite
      const { data: existingInvite } = await supabaseAdmin
        .from('collective_invites')
        .select('id')
        .eq('collective_id', collectiveId)
        .eq('email', email)
        .eq('status', 'pending')
        .maybeSingle();
      if (existingInvite) {
        return {
          success: false,
          error: `An invite for ${email} is already pending.`,
        };
      }
      // Generate unique invite code
      const invite_code = randomBytes(16).toString('hex');
      const { error: inviteError } = await supabaseAdmin
        .from('collective_invites')
        .insert({
          collective_id: collectiveId,
          email,
          role,
          status: 'pending',
          invite_code,
          invited_by_user_id: currentUser.id,
        });
      if (inviteError) {
        return {
          success: false,
          error: 'Failed to create invite: ' + inviteError.message,
        };
      }
      // Fetch collective name for email
      const { data: collectiveDetails } = await supabaseAdmin
        .from('collectives')
        .select('name')
        .eq('id', collectiveId)
        .single();
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const inviteLink = `${siteUrl}/invite/${invite_code}`;
      await sendInviteEmail({
        to: email,
        inviteLink,
        collectiveName: collectiveDetails?.name || 'a collective',
        role,
      });
      return { success: true };
    }

    if (userLookupError) {
      return {
        success: false,
        error: `User lookup error: ${hasMessage(userLookupError) ? userLookupError.message : String(userLookupError)}`,
      };
    }

    if (invitedUser.id === currentUser.id) {
      return { success: false, error: 'You cannot invite yourself.' };
    }

    // 3. Check if the user is already a member
    const { data: existingMember, error: memberCheckError } =
      await supabaseAdmin
        .from('collective_members')
        .select('id')
        .eq('collective_id', collectiveId)
        .eq('user_id', invitedUser.id)
        .maybeSingle();

    if (memberCheckError) {
      console.error('Error checking existing member:', memberCheckError);
      return { success: false, error: 'Database error checking membership.' };
    }
    if (existingMember) {
      return {
        success: false,
        error: 'This user is already a member of the collective.',
      };
    }

    // 4. Add the user to the collective
    const { error: insertError } = await supabaseAdmin
      .from('collective_members')
      .insert({
        collective_id: collectiveId,
        user_id: invitedUser.id,
        role: role as Enums<'collective_member_role'>,
      });

    if (insertError) {
      console.error('Error inviting member:', insertError);
      return {
        success: false,
        error: 'Failed to invite member. ' + insertError.message,
      };
    }

    return { success: true };
  } catch (e) {
    console.error('Unexpected error inviting member:', e);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Change a member's role in a collective (owner only).
 */
export async function changeMemberRole({
  collectiveId,
  memberId,
  newRole,
}: {
  collectiveId: string;
  memberId: string;
  newRole: string;
}): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (!currentUser) {
    return { success: false, error: 'Unauthorized: You must be logged in.' };
  }
  // Only owner can change roles
  const { data: collective, error: collectiveError } = await supabaseAdmin
    .from('collectives')
    .select('owner_id')
    .eq('id', collectiveId)
    .single();
  if (collectiveError || !collective) {
    return { success: false, error: 'Collective not found.' };
  }
  if (collective.owner_id !== currentUser.id) {
    return { success: false, error: 'Only the owner can change roles.' };
  }
  // Prevent owner from demoting themselves
  const { data: member, error: memberError } = await supabaseAdmin
    .from('collective_members')
    .select('user_id, role')
    .eq('id', memberId)
    .single();
  if (memberError || !member) {
    return { success: false, error: 'Member not found.' };
  }
  if (member.user_id === currentUser.id && newRole !== 'owner') {
    return { success: false, error: 'Owner cannot demote themselves.' };
  }
  // Update role
  const { error: updateError } = await supabaseAdmin
    .from('collective_members')
    .update({ role: newRole })
    .eq('id', memberId);
  if (updateError) {
    return {
      success: false,
      error: 'Failed to update role: ' + updateError.message,
    };
  }
  return { success: true };
}

/**
 * Remove a member from a collective (owner only).
 */
export async function removeMemberFromCollective({
  collectiveId,
  memberId,
}: {
  collectiveId: string;
  memberId: string;
}): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (!currentUser) {
    return { success: false, error: 'Unauthorized: You must be logged in.' };
  }
  // Only owner can remove
  const { data: collective, error: collectiveError } = await supabaseAdmin
    .from('collectives')
    .select('owner_id')
    .eq('id', collectiveId)
    .single();
  if (collectiveError || !collective) {
    return { success: false, error: 'Collective not found.' };
  }
  if (collective.owner_id !== currentUser.id) {
    return { success: false, error: 'Only the owner can remove members.' };
  }
  // Prevent owner from removing themselves
  const { data: member, error: memberError } = await supabaseAdmin
    .from('collective_members')
    .select('user_id, role')
    .eq('id', memberId)
    .single();
  if (memberError || !member) {
    return { success: false, error: 'Member not found.' };
  }
  if (member.user_id === currentUser.id) {
    return { success: false, error: 'Owner cannot remove themselves.' };
  }
  // Delete member
  const { error: deleteError } = await supabaseAdmin
    .from('collective_members')
    .delete()
    .eq('id', memberId);
  if (deleteError) {
    return {
      success: false,
      error: 'Failed to remove member: ' + deleteError.message,
    };
  }
  return { success: true };
}

/**
 * Resend a pending invite: regenerate invite_code, update created_at, set status to pending.
 */
export async function resendCollectiveInvite({
  collectiveId,
  inviteId,
}: {
  collectiveId: string;
  inviteId: string;
}): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (!currentUser) {
    return { success: false, error: 'Unauthorized: You must be logged in.' };
  }
  // Only owner can resend
  const { data: collective, error: collectiveError } = await supabaseAdmin
    .from('collectives')
    .select('owner_id')
    .eq('id', collectiveId)
    .single();
  if (collectiveError || !collective) {
    return { success: false, error: 'Collective not found.' };
  }
  if (collective.owner_id !== currentUser.id) {
    return { success: false, error: 'Only the owner can resend invites.' };
  }
  // Regenerate code and update
  const invite_code = randomBytes(16).toString('hex');
  const { error: updateError } = await supabaseAdmin
    .from('collective_invites')
    .update({
      invite_code,
      created_at: new Date().toISOString(),
      status: 'pending',
    })
    .eq('id', inviteId)
    .eq('collective_id', collectiveId)
    .eq('status', 'pending');
  if (updateError) {
    return {
      success: false,
      error: 'Failed to resend invite: ' + updateError.message,
    };
  }
  // Fetch invite details for email
  const { data: invite } = await supabaseAdmin
    .from('collective_invites')
    .select('email, role')
    .eq('id', inviteId)
    .single();
  const { data: collectiveDetails } = await supabaseAdmin
    .from('collectives')
    .select('name')
    .eq('id', collectiveId)
    .single();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const inviteLink = `${siteUrl}/invite/${invite_code}`;
  if (invite?.email && invite?.role) {
    await sendInviteEmail({
      to: invite.email,
      inviteLink,
      collectiveName: collectiveDetails?.name || 'a collective',
      role: invite.role,
    });
  }
  return { success: true };
}

/**
 * Cancel a pending invite: set status to 'cancelled'.
 */
export async function cancelCollectiveInvite({
  collectiveId,
  inviteId,
}: {
  collectiveId: string;
  inviteId: string;
}): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (!currentUser) {
    return { success: false, error: 'Unauthorized: You must be logged in.' };
  }
  // Only owner can cancel
  const { data: collective, error: collectiveError } = await supabaseAdmin
    .from('collectives')
    .select('owner_id')
    .eq('id', collectiveId)
    .single();
  if (collectiveError || !collective) {
    return { success: false, error: 'Collective not found.' };
  }
  if (collective.owner_id !== currentUser.id) {
    return { success: false, error: 'Only the owner can cancel invites.' };
  }
  const { error: updateError } = await supabaseAdmin
    .from('collective_invites')
    .update({ status: 'cancelled' })
    .eq('id', inviteId)
    .eq('collective_id', collectiveId)
    .eq('status', 'pending');
  if (updateError) {
    return {
      success: false,
      error: 'Failed to cancel invite: ' + updateError.message,
    };
  }
  return { success: true };
}

/**
 * Accept a pending invite for the current user (by email).
 */
export async function acceptCollectiveInvite({
  inviteCode,
}: {
  inviteCode: string;
}): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (!currentUser || !currentUser.email) {
    return {
      success: false,
      error: 'Unauthorized: You must be logged in with a valid email.',
    };
  }
  // Find pending invite for this code and email
  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('collective_invites')
    .select('id, collective_id, email, role, status')
    .eq('invite_code', inviteCode)
    .eq('status', 'pending')
    .maybeSingle();
  if (inviteError || !invite) {
    return {
      success: false,
      error: 'Invite not found or already accepted/cancelled.',
    };
  }
  if (invite.email.toLowerCase() !== currentUser.email.toLowerCase()) {
    return {
      success: false,
      error: 'This invite is not for your email address.',
    };
  }
  // Check if already a member
  const { data: existingMember } = await supabaseAdmin
    .from('collective_members')
    .select('id')
    .eq('collective_id', invite.collective_id)
    .eq('user_id', currentUser.id)
    .maybeSingle();
  if (existingMember) {
    // Mark invite as accepted anyway
    await supabaseAdmin
      .from('collective_invites')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invite.id);
    return {
      success: false,
      error: 'You are already a member of this collective.',
    };
  }
  // Accept invite: add to members and update invite
  const { error: addError } = await supabaseAdmin
    .from('collective_members')
    .insert({
      collective_id: invite.collective_id,
      user_id: currentUser.id,
      role: invite.role,
    });
  if (addError) {
    return {
      success: false,
      error: 'Failed to add you as a member: ' + addError.message,
    };
  }
  await supabaseAdmin
    .from('collective_invites')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invite.id);
  return { success: true };
}
