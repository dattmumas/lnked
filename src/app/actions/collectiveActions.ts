'use server';

import { revalidatePath } from 'next/cache';

import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { TablesUpdate } from '@/lib/database.types';

interface CollectiveActionError {
  error: string;
  fieldErrors?: Record<string, string[]>;
}

// Re-export from memberActions for backward compatibility
export { removeMemberFromCollective } from './memberActions';

export async function updateCollectiveSettings(
  collectiveId: string,
  formData: TablesUpdate<'collectives'>,
): Promise<CollectiveActionError | { success: true }> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('collectives')
    .update(formData)
    .eq('id', collectiveId);

  if (error) {
    return { error: 'Failed to update collective settings.' };
  }

  revalidatePath(`/settings/collectives/${collectiveId}`);
  return { success: true };
}

export async function subscribeToCollective(
  collectiveId: string,
  userId: string,
  planId: string,
): Promise<CollectiveActionError | { success: true; subscriptionId: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'User not authenticated.' };
  }

  const { data: collective, error: collectiveError } = await supabase
    .from('collectives')
    .select('stripe_customer_id')
    .eq('id', collectiveId)
    .single();

  if (collectiveError || !collective) {
    return { error: 'Collective not found.' };
  }

  const stripe = getStripe();
  if (!stripe) {
    return { error: 'Stripe is not configured.' };
  }

  const { id: subscriptionId } = await stripe.subscriptions.create({
    customer: collective.stripe_customer_id!,
    items: [{ price: planId }],
    expand: ['latest_invoice.payment_intent'],
  });

  return { success: true, subscriptionId };
}

/**
 * Get Stripe status for a collective
 */
export async function getCollectiveStripeStatus(
  collectiveId: string,
): Promise<{
  status: 'active' | 'pending' | 'none';
  stripe_account_id?: string;
}> {
  const supabase = await createServerSupabaseClient();

  const { data: collective, error } = await supabase
    .from('collectives')
    .select('stripe_account_id')
    .eq('id', collectiveId)
    .single();

  if (error || !collective) {
    return { status: 'none' };
  }

  if (!collective.stripe_account_id) {
    return { status: 'none' };
  }

  // For now, we'll assume if they have an account ID, it's active
  // In a real implementation, you might check with Stripe API
  return {
    status: 'active',
    stripe_account_id: collective.stripe_account_id,
  };
}

/**
 * Delete a collective (owner only)
 */
export async function deleteCollective({
  collectiveId,
}: {
  collectiveId: string;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated.' };
  }

  // Verify ownership
  const { data: collective, error: fetchError } = await supabase
    .from('collectives')
    .select('owner_id')
    .eq('id', collectiveId)
    .single();

  if (fetchError || !collective) {
    return { success: false, error: 'Collective not found.' };
  }

  if (collective.owner_id !== user.id) {
    return { success: false, error: 'Only the owner can delete a collective.' };
  }

  // Delete the collective (this will cascade delete related records based on foreign keys)
  const { error: deleteError } = await supabase
    .from('collectives')
    .delete()
    .eq('id', collectiveId);

  if (deleteError) {
    return { success: false, error: 'Failed to delete collective.' };
  }

  revalidatePath('/collectives');
  return { success: true, message: 'Collective deleted successfully.' };
}

/**
 * Transfer ownership of a collective to another member
 */
export async function transferCollectiveOwnership({
  collectiveId,
  newOwnerId,
}: {
  collectiveId: string;
  newOwnerId: string;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated.' };
  }

  // Verify current ownership
  const { data: collective, error: fetchError } = await supabase
    .from('collectives')
    .select('owner_id')
    .eq('id', collectiveId)
    .single();

  if (fetchError || !collective) {
    return { success: false, error: 'Collective not found.' };
  }

  if (collective.owner_id !== user.id) {
    return {
      success: false,
      error: 'Only the current owner can transfer ownership.',
    };
  }

  // Update the owner
  const { error: updateError } = await supabase
    .from('collectives')
    .update({ owner_id: newOwnerId })
    .eq('id', collectiveId);

  if (updateError) {
    return { success: false, error: 'Failed to transfer ownership.' };
  }

  // Update the old owner's role to editor in collective_members
  const { error: memberUpdateError } = await supabase
    .from('collective_members')
    .update({ role: 'editor' })
    .eq('collective_id', collectiveId)
    .eq('member_id', user.id);

  if (memberUpdateError) {
    console.error('Failed to update old owner role:', memberUpdateError);
  }

  // Ensure new owner has owner role in collective_members
  const { error: newOwnerUpdateError } = await supabase
    .from('collective_members')
    .upsert({
      collective_id: collectiveId,
      member_id: newOwnerId,
      role: 'owner',
    })
    .eq('collective_id', collectiveId)
    .eq('member_id', newOwnerId);

  if (newOwnerUpdateError) {
    console.error('Failed to update new owner role:', newOwnerUpdateError);
  }

  revalidatePath(`/collectives/${collectiveId}/settings`);
  return { success: true, message: 'Ownership transferred successfully.' };
}
