'use server';

import { randomBytes } from 'crypto';

import { revalidatePath } from 'next/cache';

import { sendInviteEmail } from '@/lib/email';
import {
  InviteMemberServerSchema,
  type InviteMemberServerValues,
} from '@/lib/schemas/memberSchemas';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

import type { Enums } from '@/lib/database.types';

// Constants for configuration
const INVITE_CODE_BYTES = 16;

// Shared result type for actions
export interface ActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  data?: {
    slug?: string | null;
  } | null;
}

function hasMessage(e: unknown): e is { message: string } {
  return (
    typeof e === 'object' &&
    e !== null &&
    'message' in e &&
    typeof (e as { message?: unknown }).message === 'string'
  );
}

/**
 * Invite a member to a collective by email.
 */
export async function inviteMemberToCollective(
  formData: InviteMemberServerValues,
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (currentUser === null) {
    return { success: false, error: 'Unauthorized: You must be logged in.' };
  }

  const validation = InviteMemberServerSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, error: 'Invalid form data.' };
  }

  const { collectiveId, email, role } = validation.data;

  // Verify current user is an owner or admin of the collective
  const { data: memberData, error: memberError } = await supabase
    .from('collective_members')
    .select('role')
    .eq('collective_id', collectiveId)
    .eq('member_id', currentUser.id)
    .single();

  if (memberError || !['owner', 'admin'].includes(memberData?.role)) {
    return { success: false, error: 'You do not have permission to invite members.' };
  }

  // Generate a unique invite code
  const inviteCode = randomBytes(16).toString('hex');

  // Insert the invite into the database
  const { error: inviteError } = await supabase
    .from('collective_invites')
    .insert({
      collective_id: collectiveId,
      invited_by_user_id: currentUser.id,
      email,
      role,
      invite_code: inviteCode,
    });

  if (inviteError) {
    console.error('Error creating invite:', inviteError);
    if (inviteError.code === '23505') { // unique constraint violation
      return { success: false, error: 'An invite for this email already exists.' };
    }
    return { success: false, error: 'Failed to create invite.' };
  }

  // Here you would typically send an email with the invite link:
  // const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL}/invite/${inviteCode}`;
  // await sendEmail({ to: email, subject: "You're invited!", body: `Join here: ${inviteLink}` });

  revalidatePath(`/collectives/${collectiveId}/members`);

  return { success: true };
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
  if (currentUser === null) {
    return { success: false, error: 'Unauthorized: You must be logged in.' };
  }
  // Only owner can change roles
  const { data: collective, error: collectiveError } = await supabaseAdmin
    .from('collectives')
    .select('owner_id')
    .eq('id', collectiveId)
    .single();
  if (collectiveError !== null || collective === null) {
    return { success: false, error: 'Collective not found.' };
  }
  if (collective.owner_id !== currentUser.id) {
    return { success: false, error: 'Only the owner can change roles.' };
  }
  // Prevent owner from demoting themselves
  const { data: member, error: memberError } = await supabaseAdmin
    .from('collective_members')
    .select('member_id, role')
    .eq('id', memberId)
    .single();
  if (memberError !== null || member === null) {
    return { success: false, error: 'Member not found.' };
  }
  if (member.member_id === currentUser.id && newRole !== 'owner') {
    return { success: false, error: 'Owner cannot demote themselves.' };
  }
  // Update role
  const { error: updateError } = await supabaseAdmin
    .from('collective_members')
    .update({ role: newRole as Enums<'collective_member_role'> })
    .eq('id', memberId);
  if (updateError !== null) {
    return {
      success: false,
      error: `Failed to update role: ${updateError.message}`,
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
  if (currentUser === null) {
    return { success: false, error: 'Unauthorized: You must be logged in.' };
  }
  // Only owner can remove
  const { data: collective, error: collectiveError } = await supabaseAdmin
    .from('collectives')
    .select('owner_id')
    .eq('id', collectiveId)
    .single();
  if (collectiveError !== null || collective === null) {
    return { success: false, error: 'Collective not found.' };
  }
  if (collective.owner_id !== currentUser.id) {
    return { success: false, error: 'Only the owner can remove members.' };
  }
  // Prevent owner from removing themselves
  const { data: member, error: memberError } = await supabaseAdmin
    .from('collective_members')
    .select('member_id, role')
    .eq('id', memberId)
    .single();
  if (memberError !== null || member === null) {
    return { success: false, error: 'Member not found.' };
  }
  if (member.member_id === currentUser.id) {
    return { success: false, error: 'Owner cannot remove themselves.' };
  }
  // Delete member
  const { error: deleteError } = await supabaseAdmin
    .from('collective_members')
    .delete()
    .eq('id', memberId);
  if (deleteError !== null) {
    return {
      success: false,
      error: `Failed to remove member: ${deleteError.message}`,
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
  if (currentUser === null) {
    return { success: false, error: 'Unauthorized: You must be logged in.' };
  }
  // Only owner can resend
  const { data: collective, error: collectiveError } = await supabaseAdmin
    .from('collectives')
    .select('owner_id')
    .eq('id', collectiveId)
    .single();
  if (collectiveError !== null || collective === null) {
    return { success: false, error: 'Collective not found.' };
  }
  if (collective.owner_id !== currentUser.id) {
    return { success: false, error: 'Only the owner can resend invites.' };
  }
  // Regenerate code and update
  const invite_code = randomBytes(INVITE_CODE_BYTES).toString('hex');
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
  if (updateError !== null) {
    return {
      success: false,
      error: `Failed to resend invite: ${updateError.message}`,
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
  const siteUrl = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000';
  const inviteLink = `${siteUrl}/invite/${invite_code}`;
  if (invite?.email !== null && invite?.email !== undefined && invite?.role !== null && invite?.role !== undefined) {
    await sendInviteEmail({
      to: invite.email,
      inviteLink,
      collectiveName: collectiveDetails?.name !== null && collectiveDetails?.name !== undefined ? collectiveDetails.name : 'a collective',
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
  if (currentUser === null) {
    return { success: false, error: 'Unauthorized: You must be logged in.' };
  }
  // Only owner can cancel
  const { data: collective, error: collectiveError } = await supabaseAdmin
    .from('collectives')
    .select('owner_id')
    .eq('id', collectiveId)
    .single();
  if (collectiveError !== null || collective === null) {
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
  if (updateError !== null) {
    return {
      success: false,
      error: `Failed to cancel invite: ${updateError.message}`,
    };
  }
  return { success: true };
}

/**
 * Accept a collective invite using an invite code.
 */
export async function acceptCollectiveInvite({
  inviteCode,
}: {
  inviteCode: string;
}): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  const { data, error } = await supabase.rpc('accept_collective_invite', {
    p_invite_code: inviteCode,
    p_user_id: user.id,
  });

  if (error) {
    console.error('Error accepting invite:', error);
    return { success: false, error: error.message };
  }

  // The RPC returns an array with one object
  const result = Array.isArray(data) ? data[0] : data;

  if (!result || !result.success) {
    return { success: false, error: result?.message ?? 'Failed to accept invite.' };
  }
  
  if (result.collective_slug) {
    revalidatePath(`/collectives/${result.collective_slug}`);
  }
  revalidatePath('/dashboard');

  return { 
    success: true, 
    data: {
      slug: result.collective_slug
    }
  };
}
