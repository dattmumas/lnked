import {
  CreditCard,
  Receipt,
  Package,
  Calendar,
  Download,
  AlertCircle,
} from 'lucide-react';
import { redirect } from 'next/navigation';
import Stripe from 'stripe';

import ManageBillingButton from '@/components/stripe/ManageBillingButton';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import * as stripeUtil from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

import ActiveSubscriptionsClient from './ActiveSubscriptionsClient';
import ConnectStripePrompt from './ConnectStripePrompt';
import PaymentMethodsClient from './PaymentMethodsClient';
import PersonalSubscriptionPlansClient from './PersonalSubscriptionPlansClient';

export default async function BillingSettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Fetch active subscription for the current user
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  // Initialize Stripe SDK client early so it can be used throughout the
  // component. By declaring it here, we avoid temporal dead-zone issues when
  // retrieving the current plan details below.
  const stripe = stripeUtil.getStripe();

  // Fetch Stripe Price & Product details directly from Stripe API (legacy local
  // `prices` table has been deprecated).
  let productName = 'Current Plan';
  let priceInterval: string | null = null;
  let priceUnitAmount: number | null = null;
  let priceCurrency: string | null = null;

  if (subscription?.stripe_price_id && stripe) {
    try {
      const price = (await stripe.prices.retrieve(
        subscription.stripe_price_id,
        {
          expand: ['product'],
        },
      )) as Stripe.Price;

      const {
        unit_amount: unitAmount,
        currency: currencyCode,
        recurring,
        product: priceProduct,
      } = price;

      priceUnitAmount = unitAmount;
      priceCurrency = currencyCode;
      priceInterval = recurring?.interval ?? null;

      if (priceProduct && typeof priceProduct !== 'string') {
        const prod = priceProduct as Stripe.Product;
        if (!('deleted' in prod && prod.deleted)) {
          productName = prod.name ?? productName;
        }
      }
    } catch (err) {
      console.error('Failed to retrieve Stripe price:', err);
    }
  }

  // ----- Stripe Integration (payment methods & invoices) -----

  // Fetch creator payout readiness flags
  const { data: creatorFlags } = await supabase
    .from('users')
    .select('stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled')
    .eq('id', user.id)
    .single();

  const {
    stripe_account_id: creatorStripeAccount,
    stripe_charges_enabled: chargesEnabled,
    stripe_payouts_enabled: payoutsEnabled,
  } = creatorFlags ?? {};

  const payoutReady = creatorStripeAccount && chargesEnabled && payoutsEnabled;

  let paymentMethods: Stripe.PaymentMethod[] = [];
  let invoices: Stripe.Invoice[] = [];

  // Determine the Stripe customer ID – prefer users.stripe_customer_id, fallback to customers table
  const { stripe_customer_id: authStripeCustomer } = user as unknown as {
    stripe_customer_id?: string | null;
  };

  let stripeCustomerId: string | undefined = authStripeCustomer ?? undefined;

  if (!stripeCustomerId) {
    const { data: customerRecord } = await supabase
      .from('customers')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    const { stripe_customer_id: fallbackCustomer } =
      customerRecord ?? ({} as { stripe_customer_id?: string | null });
    stripeCustomerId = fallbackCustomer ?? undefined;
  }

  let defaultPaymentMethodId: string | undefined;

  if (stripe && stripeCustomerId) {
    const [pmRes, invRes, custRes] = await Promise.all([
      stripe.paymentMethods.list({ customer: stripeCustomerId, type: 'card' }),
      stripe.invoices.list({ customer: stripeCustomerId, limit: 3 }),
      stripe.customers.retrieve(stripeCustomerId) as Promise<Stripe.Customer>,
    ]);

    paymentMethods = pmRes.data;
    invoices = invRes.data;
    const defaultRaw = custRes.invoice_settings?.default_payment_method as
      | string
      | Stripe.PaymentMethod
      | undefined;
    defaultPaymentMethodId =
      typeof defaultRaw === 'string' ? defaultRaw : defaultRaw?.id;
  }

  // -----------------------------------------------------------
  // Active Subscriptions (viewer)
  // -----------------------------------------------------------
  const { data: activeSubsRaw } = await supabase
    .from('subscriptions')
    .select(
      'id, stripe_price_id, target_entity_type, target_entity_id, current_period_end, status',
    )
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing', 'past_due']);

  let activeSubscriptions: {
    dbId: string;
    stripeSubscriptionId: string;
    creatorName: string;
    planName: string;
    amount: number | null;
    currency: string | null;
    interval: string | null;
    renewalDate: string;
    targetEntityType: 'user' | 'collective';
    targetEntityId: string;
  }[] = [];

  if (activeSubsRaw && activeSubsRaw.length > 0) {
    // Resolve names & price details in parallel
    activeSubscriptions = await Promise.all(
      activeSubsRaw.map(async (sub) => {
        // Creator name lookup
        let creatorName = '';
        if (sub.target_entity_type === 'collective') {
          const { data } = await supabaseAdmin
            .from('collectives')
            .select('name')
            .eq('id', sub.target_entity_id)
            .maybeSingle();
          creatorName = data?.name ?? 'Unknown';
        } else {
          const { data } = await supabaseAdmin
            .from('users')
            .select('full_name, username')
            .eq('id', sub.target_entity_id)
            .maybeSingle();
          creatorName = data?.full_name ?? data?.username ?? 'Unknown';
        }

        // Plan / price details
        let planName = 'Plan';
        let amount: number | null = null;
        let currency: string | null = null;
        let interval: string | null = null;

        if (sub.stripe_price_id && stripe) {
          try {
            const price = (await stripe.prices.retrieve(sub.stripe_price_id, {
              expand: ['product'],
            })) as Stripe.Price;
            const {
              unit_amount: unitAmount,
              currency: currencyCode,
              recurring,
              product: priceProduct,
            } = price;

            amount = unitAmount;
            currency = currencyCode;
            interval = recurring?.interval ?? null;
            if (priceProduct && typeof priceProduct !== 'string') {
              const prod = priceProduct as Stripe.Product;
              if (!('deleted' in prod && prod.deleted)) {
                planName = prod.name ?? planName;
              }
            }
          } catch (err) {
            console.error('[billing] Failed to retrieve price', err);
          }
        }

        return {
          dbId: sub.id,
          stripeSubscriptionId: sub.id, // db id mirrors stripe id in schema
          creatorName,
          planName,
          amount,
          currency,
          interval,
          renewalDate: sub.current_period_end
            ? new Date(sub.current_period_end).toLocaleDateString()
            : 'N/A',
          targetEntityType: sub.target_entity_type,
          targetEntityId: sub.target_entity_id,
        };
      }),
    );
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Billing Settings</h1>
        <p className="text-muted-foreground">
          Manage your subscription, payment methods, and billing history.
        </p>
      </header>

      <div className="space-y-6">
        {/* Active Subscriptions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <CardTitle>Active Subscriptions</CardTitle>
            </div>
            <CardDescription>
              Manage the subscriptions you’re paying for
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActiveSubscriptionsClient subscriptions={activeSubscriptions} />
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <CardTitle>Payment Methods</CardTitle>
            </div>
            <CardDescription>
              Manage your payment methods for subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Client-side component for listing & adding cards */}
              <PaymentMethodsClient
                methods={paymentMethods.map((pm) => {
                  const card = pm.card as Stripe.PaymentMethod.Card;
                  return {
                    id: pm.id,
                    brand: card.brand,
                    last4: card.last4,
                    exp_month: card.exp_month,
                    exp_year: card.exp_year,
                    isDefault: pm.id === defaultPaymentMethodId,
                  };
                })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Personal Subscription Plans */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <CardTitle>My Subscription Plans</CardTitle>
            </div>
            <CardDescription>
              Create and manage the plans your followers can subscribe to.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payoutReady ? (
              <PersonalSubscriptionPlansClient />
            ) : (
              <ConnectStripePrompt />
            )}
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              <CardTitle>Billing History</CardTitle>
            </div>
            <CardDescription>
              View and download your past invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoices.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No invoices found
                </p>
              )}

              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {new Date(invoice.created * 1000).toLocaleDateString(
                          'en-US',
                          {
                            month: 'long',
                            year: 'numeric',
                          },
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(() => {
                          const amount = invoice.amount_paid;
                          return typeof amount === 'number'
                            ? (amount / 100).toFixed(2)
                            : '0.00';
                        })()}{' '}
                        {invoice.currency ? invoice.currency.toUpperCase() : ''}
                      </p>
                    </div>
                  </div>
                  {invoice.invoice_pdf && (
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={invoice.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              ))}

              <Button variant="outline" className="w-full">
                View All Invoices
              </Button>
              <ManageBillingButton className="w-full mt-2" />
            </div>
          </CardContent>
        </Card>

        {/* Billing Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Billing Alerts</CardTitle>
            </div>
            <CardDescription>
              Configure notifications for billing events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="payment-reminders" className="flex-1">
                  <p className="font-medium">Payment Reminders</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified before subscription renewal
                  </p>
                </label>
                <input
                  id="payment-reminders"
                  type="checkbox"
                  className="toggle"
                  defaultChecked
                />
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="receipt-emails" className="flex-1">
                  <p className="font-medium">Receipt Emails</p>
                  <p className="text-sm text-muted-foreground">
                    Receive receipts for all transactions
                  </p>
                </label>
                <input
                  id="receipt-emails"
                  type="checkbox"
                  className="toggle"
                  defaultChecked
                />
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="usage-alerts" className="flex-1">
                  <p className="font-medium">Usage Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when approaching usage limits
                  </p>
                </label>
                <input id="usage-alerts" type="checkbox" className="toggle" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
