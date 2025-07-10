'use server';

import { revalidatePath } from 'next/cache';

import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  BRANDING_CONFIG,
  generateBrandingFilename,
  extractStoragePathFromUrl,
} from '@/lib/utils/branding';

import type { TablesUpdate } from '@/lib/database.types';

interface CollectiveActionError {
  error: string;
  fieldErrors?: Record<string, string[]>;
}

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

export async function updateCollectiveBranding(
  collectiveId: string,
  formData: FormData,
  slug?: string,
): Promise<CollectiveActionError | { success: true }> {
  const supabase = await createServerSupabaseClient();

  // auth & role check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'User not authenticated.' };
  }

  const { data: member } = await supabase
    .from('collective_members')
    .select('role')
    .eq('collective_id', collectiveId)
    .eq('member_id', user.id)
    .single();

  const isOwnerOrAdmin = member?.role === 'owner' || member?.role === 'admin';
  if (!isOwnerOrAdmin) {
    console.error('Branding upload permission denied for user:', user.id);
    return { error: 'Permission denied.' };
  }

  // helper validation
  function isValidImageType(type: string) {
    return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(
      type,
    );
  }

  const updates: TablesUpdate<'collectives'> = {};

  async function processFile(file: File | null, kind: 'logo' | 'cover') {
    if (!file || file.size === 0) {
      return;
    }

    if (!isValidImageType(file.type)) {
      console.error(`Invalid ${kind} image type:`, file.type);
      throw new Error('Unsupported file type');
    }

    const maxBytes = BRANDING_CONFIG.maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      console.error(`${kind} file too large:`, file.size);
      throw new Error('File too large');
    }

    // remove previous file if exists
    const { data: collective } = await supabase
      .from('collectives')
      .select('logo_url, cover_image_url')
      .eq('id', collectiveId)
      .single();

    const existingUrl =
      kind === 'logo' ? collective?.logo_url : collective?.cover_image_url;
    if (existingUrl) {
      const path = extractStoragePathFromUrl(existingUrl);
      if (path) {
        const { error: removeError } = await supabaseAdmin.storage
          .from(BRANDING_CONFIG.bucket)
          .remove([path]);
        if (removeError)
          console.error('Failed to remove existing file:', removeError);
      }
    }

    const filePath = generateBrandingFilename(collectiveId, kind, file.type);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BRANDING_CONFIG.bucket)
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: BRANDING_CONFIG.cacheControl,
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      throw new Error('Upload failed');
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(BRANDING_CONFIG.bucket)
      .getPublicUrl(filePath);

    if (kind === 'logo') {
      updates.logo_url = urlData.publicUrl;
    } else {
      updates.cover_image_url = urlData.publicUrl;
    }
  }

  try {
    await processFile(formData.get('logo') as File | null, 'logo');
    await processFile(formData.get('cover_image') as File | null, 'cover');
  } catch (e: unknown) {
    const msg = (e as Error).message;
    console.error('Branding processing error:', msg);
    return { error: msg };
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('collectives')
      .update(updates)
      .eq('id', collectiveId);
    if (error) {
      console.error('Branding DB update failed:', error);
      return { error: 'DB update failed' };
    }
  }

  if (slug) {
    revalidatePath(`/settings/collectives/${slug}/branding`);
  }
  return { success: true };
}

export async function moderatePost(payload: {
  postId: string;
  collectiveId: string;
  status: 'published' | 'rejected';
}): Promise<CollectiveActionError | { success: true }> {
  const { postId, collectiveId, status } = payload;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'User not authenticated.' };
  }

  // TODO: Add permission check (owner or admin of collectiveId)

  const { error } = await supabase
    .from('post_collectives')
    .update({ status })
    .eq('post_id', postId)
    .eq('collective_id', collectiveId);

  if (error) {
    return { error: 'Failed to update post status.' };
  }

  revalidatePath(`/settings/collectives/${collectiveId}/moderation`);
  // Also revalidate the main collective page
  // This requires the slug, which we don't have here. A better approach
  // would be to use revalidateTag if tags are set up. For now, this is a limitation.

  return { success: true };
}

export async function getOrCreateStripeConnectAccount(
  collectiveId: string,
): Promise<
  | { success: true; url: string }
  | { success: false; error: string; fieldErrors?: undefined }
> {
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
    .select('owner_id, stripe_account_id')
    .eq('id', collectiveId)
    .single();

  if (fetchError || !collective) {
    return { success: false, error: 'Collective not found.' };
  }

  if (collective.owner_id !== user.id) {
    return {
      success: false,
      error: 'Only the owner can manage monetization.',
    };
  }

  const stripe = getStripe();
  if (!stripe) {
    return { success: false, error: 'Stripe is not configured.' };
  }

  // Ensure user has an email for Stripe
  if (!user.email) {
    return {
      success: false,
      error: 'User email is required to create a Stripe account.',
    };
  }

  let accountId = collective.stripe_account_id;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email,
    });
    accountId = account.id;

    const { error: updateError } = await supabase
      .from('collectives')
      .update({ stripe_account_id: accountId })
      .eq('id', collectiveId);

    if (updateError) {
      return { success: false, error: 'Failed to save Stripe account.' };
    }
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env['NEXT_PUBLIC_SITE_URL']}/settings/collectives/${collectiveId}/monetization`,
    return_url: `${process.env['NEXT_PUBLIC_SITE_URL']}/settings/collectives/${collectiveId}/monetization`,
    type: 'account_onboarding',
  });

  return { success: true, url: accountLink.url };
}

export async function createPriceTier(payload: {
  collectiveId: string;
  amount: number;
  interval: 'month' | 'year';
}): Promise<CollectiveActionError | { success: true }> {
  const { collectiveId, amount, interval } = payload;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'User not authenticated.' };
  }

  // Verify ownership & get Stripe account ID
  const { data: collective } = await supabase
    .from('collectives')
    .select('owner_id, stripe_account_id')
    .eq('id', collectiveId)
    .single();

  if (!collective || collective.owner_id !== user.id) {
    return { error: 'You do not have permission to manage this collective.' };
  }
  if (!collective.stripe_account_id) {
    return { error: 'Collective is not connected to Stripe.' };
  }

  const stripe = getStripe();
  if (!stripe) {
    return { error: 'Stripe is not configured.' };
  }

  try {
    // Find or create a Stripe Product for this collective
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('collective_id', collectiveId)
      .single();

    let productId: string;

    if (product) {
      productId = product.id;
    } else {
      const stripeProduct = await stripe.products.create({
        name: `Subscription for collective ${collectiveId}`,
      });
      productId = stripeProduct.id;
      await supabase
        .from('products')
        .insert({ id: productId, collective_id: collectiveId, active: true });
    }

    // Create the Stripe Price
    const stripePrice = await stripe.prices.create({
      product: productId,
      unit_amount: amount * 100, // Convert to cents
      currency: 'usd',
      recurring: { interval },
    });

    // Save the price to our local DB
    await supabase.from('prices').insert({
      id: stripePrice.id,
      product_id: productId,
      active: true,
      unit_amount: amount * 100,
      currency: 'usd',
      type: 'recurring',
      interval,
    });

    revalidatePath(`/settings/collectives/${collectiveId}/monetization`);
    return { success: true };
  } catch (e: unknown) {
    const error = e as Error;
    return { error: error.message };
  }
}

export async function updateRevenueShares(payload: {
  collectiveId: string;
  shares: { memberId: string; sharePercentage: number }[];
}): Promise<CollectiveActionError | { success: true }> {
  const { collectiveId, shares } = payload;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'User not authenticated.' };
  }

  // Verify ownership
  const { data: collective } = await supabase
    .from('collectives')
    .select('owner_id')
    .eq('id', collectiveId)
    .single();

  if (!collective || collective.owner_id !== user.id) {
    return { error: 'You do not have permission to manage this collective.' };
  }

  // Validate total share percentage
  const totalShare = shares.reduce(
    (acc, share) => acc + share.sharePercentage,
    0,
  );
  if (totalShare > 100) {
    return { error: 'Total share percentage cannot exceed 100%.' };
  }

  // Update shares in a transaction
  const updates = shares.map((share) =>
    supabase
      .from('collective_members')
      .update({ share_percentage: share.sharePercentage })
      .eq('id', share.memberId)
      .eq('collective_id', collectiveId),
  );

  const results = await Promise.all(updates);
  const error = results.find((r) => r.error);

  if (error) {
    return { error: 'Failed to update revenue shares.' };
  }

  revalidatePath(`/settings/collectives/${collectiveId}/monetization`);
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
export async function getCollectiveStripeStatus(collectiveId: string): Promise<{
  status: 'active' | 'pending' | 'none';
  stripe_account_id?: string;
}> {
  const supabase = await createServerSupabaseClient();

  const { data: collective, error } = await supabase
    .from('collectives')
    .select('stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled')
    .eq('id', collectiveId)
    .single();

  if (error || !collective) {
    return { status: 'none' };
  }

  if (!collective.stripe_account_id) {
    return { status: 'none' };
  }

  const { stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled } =
    collective;

  const isActive = stripe_charges_enabled && stripe_payouts_enabled;

  return {
    status: isActive ? 'active' : 'pending',
    stripe_account_id,
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
