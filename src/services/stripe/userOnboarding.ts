import { getStripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Fetch the cached Stripe Express account ID for a user or create a new
 * Express account if none exists. The account ID is persisted back to the
 * `public.users` table.
 */
export async function getOrCreateExpressAccount(
  userId: string,
): Promise<string> {
  const { data: user, error: fetchErr } = await supabaseAdmin
    .from('users')
    .select('stripe_account_id')
    .eq('id', userId)
    .single();

  if (fetchErr) {
    console.warn('[Stripe] failed to fetch user row:', fetchErr.message);
  }

  if (user?.stripe_account_id) return user.stripe_account_id;

  // Create new account
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe not configured');

  const account = await stripe.accounts.create({
    type: 'express',
    business_type: 'individual',
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: { userId },
  });

  // Persist
  await supabaseAdmin
    .from('users')
    .update({ stripe_account_id: account.id })
    .eq('id', userId);

  return account.id;
}

/**
 * Create an onboarding/account-link URL for a given Stripe account.
 */
export async function createAccountLink(
  accountId: string,
  returnUrl: string,
): Promise<string> {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe not configured');

  const { url } = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: returnUrl,
    return_url: `${returnUrl}?stripe=return`,
  });
  return url;
}
