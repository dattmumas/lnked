# Stripe Integration — Current Status

Below is a **single-source overview** of all Stripe work completed in this repository to-date. It is organised in three parts:

1. Database schema (authoritative snippets copied from `src/lib/database.types.ts`).
2. Back-end implementation (libraries, services, actions, API routes, utilities).
3. Front-end implementation (components, pages, helpers).
4. Migrations & infrastructure changes.

---

## 1. Database schema (lean version, as of July 2025)

```ts
// src/lib/database.types.ts – customers
public.customers.Row = {
  id: string;                  // ↔ users.id (1-to-1)
  stripe_customer_id: string;  // Platform-level Customer (cus_…)
};
```

```ts
// src/lib/database.types.ts – subscription_plans (💡 pointer table only)
public.subscription_plans.Row = {
  id: string;
  owner_id: string;                                    // user / collective uuid
  owner_type: 'user' | 'collective';
  collective_id: string | null;                        // when owner_type = 'collective'
  stripe_price_id: string;                             // Price that subscribers purchase
  price_snapshot: Json | null;                         // Cached Stripe.Price JSON (optional)
  benefits: Json | null;                               // free-form perks shown in UI
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};
```

```ts
// src/lib/database.types.ts – subscriptions (unchanged)
public.subscriptions.Row = {
  id: string;
  user_id: string;                      // subscriber
  target_entity_id: string;             // creator / collective id
  target_entity_type: 'user' | 'collective';
  status: 'active' | 'canceled' | 'trialing' | …;
  stripe_price_id: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  metadata: Json | null;
  inserted_at: string;
  updated_at: string;
};
```

Dropped tables: `products`, `prices` – all product / price details are now fetched live from Stripe via the SDK; snapshots live in `price_snapshot` for offline display.

```ts
// src/lib/database.types.ts – checkout_sessions
public.checkout_sessions.Row = {
  id: string;                      // Local row id
  user_id: string;                 // Purchaser
  stripe_session_id: string;       // Stripe Checkout Session id (cs_…)
  stripe_subscription_id: string | null; // Filled after webhook
  target_entity_id: string;        // Entity being subscribed to / paid for
  target_entity_type: string;      // 'user' | 'collective'
  status: string;                  // open | complete | expired (mirrors Stripe)
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};
```

```ts
// src/lib/database.types.ts – users (stripe-specific columns only)
public.users.Row = {
  /* … other cols … */
  stripe_customer_id: string | null;
  stripe_account_id: string | null;       // Connected account id (acct_…)
  stripe_account_type: string | null;     // express | custom | standard
  stripe_charges_enabled: boolean;        // from account.updated webhook
  stripe_payouts_enabled: boolean;        // from account.updated webhook
};
```

```ts
// src/lib/database.types.ts – collectives (stripe-specific columns only)
public.collectives.Row = {
  /* … other cols … */
  stripe_account_id?: string | null;
};
```

---

## 2. Back-end Implementation

| Path                                                                   | Purpose                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | -------------------------------------------------------------------------- |
| **`src/lib/stripe.ts`**                                                | Lazily initialises & exports a **singleton Stripe SDK client** (API version pinned). Environment variable: `STRIPE_SECRET_KEY`.                                                                                                                        |
| **`src/lib/schemas/webhook-validation.ts`**                            | Validates Stripe webhook metadata. `targetEntityType` enum now allows `'user'                                                                                                                                                                          | 'collective' | 'platform'`and schemas use`.passthrough()` so extra keys don’t break prod. |
| **`src/lib/stripe/plan-reader.ts`**                                    | 🔑 NEW – hydrates `subscription_plans` rows with live `Stripe.Price`; snapshot fallback; used by all list endpoints & UI.                                                                                                                              |
| **`src/services/stripe/userOnboarding.ts`**                            | Helpers to **create / fetch** a user’s Stripe Express account and generate onboarding links (`accountLinks.create`).                                                                                                                                   |
| **`src/app/stripe-actions/accounts.ts`**                               | Server Action → start Express onboarding; consumes `userOnboarding` service.                                                                                                                                                                           |
| **`src/app/stripe-actions/subscription-plans.ts`**                     | Creator-facing plan creation. Writes snapshot only; no more `name` / `monthly_cost` columns.                                                                                                                                                           |
| **`src/app/api/subscribe/route.ts`**                                   | **Branching flow** – if customer has a default card we create the subscription server-side (one-click). Otherwise we fall back to Stripe Checkout (`payment_method_collection: 'if_required'`). Handles price cloning, idempotency, and transfer-data. |
| **`src/lib/stripe/customer-utils.ts`**                                 | Helper `fetchDefaultPaymentMethod(customerId)` retrieves the platform customer’s default card to drive the branching logic.                                                                                                                            |
| **Other API routes**                                                   | `/api/plans/[userId]`, `/api/billing-portal`, `/api/subscription-status`, etc. all refactored to the lean schema and plan-reader utility.                                                                                                              |
| **`src/app/api/stripe-connect/route.ts`**                              | POST endpoint used by the UI to trigger the **Express onboarding flow**; simply calls the accounts Server Action and returns 303 redirect URL.                                                                                                         |
| **`src/app/api/billing-portal/route.ts`**                              | Starts a **Stripe Billing Portal** session for an end-user (view invoices, update payment methods, cancel subscription).                                                                                                                               |
| **`src/app/api/subscribe/route.ts`**                                   | Creates a **Checkout Session** (platform account) with `transfer_data.destination` for revenue-share; ensures platform-price cloning & idempotency; records preliminary `checkout_sessions` row.                                                       |
| **`src/app/api/subscription-status/route.ts`**                         | Lightweight GET – returns the current subscriber’s status for a given plan (active / none) by querying `subscriptions`.                                                                                                                                |
| **`src/app/api/plans/[userId]/route.ts`**                              | Public GET to list **all active plans** offered by a user. Uses `plan-reader` for live Stripe hydration.                                                                                                                                               |
| **`src/lib/stripe/plan-reader.ts`**                                    | Utility that joins `subscription_plans` with live `Stripe.Price` (snapshot fallback). Single source of truth for all plan listings.                                                                                                                    |
| **`src/app/api/self/stripe-flags/route.ts`**                           | Authenticated GET – returns the caller’s `stripe_*_enabled` flags so the UI can poll for onboarding completion.                                                                                                                                        |
| **`src/app/api/collectives/[slug]/plans/route.ts`**                    | POST to create plans _for a collective_ (admin/owner only). Mirrors product/price creation but uses the collective’s connected account.                                                                                                                |
| _removed_ **`src/app/api/collectives/[slug]/stripe-onboard/route.ts`** | Legacy onboarding route – superseded by `/api/stripe-connect`. (File deleted in latest commit).                                                                                                                                                        |

---

## 3. Front-end Implementation

| Path                                                                                                       | Purpose                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`src/components/stripe/AddCardDialog.tsx`**                                                              | Client component wrapping **Stripe Elements** (CardElement) to collect & submit a new card via a `SetupIntent`. Loaded lazily with `loadStripe` to avoid SSR issues. |
| **`src/components/stripe/ManageBillingButton.tsx`**                                                        | Convenience component – when clicked, calls `/api/billing-portal` and redirects the browser to the returned portal URL.                                              |
| **`src/components/app/profile/subscription/SubscribeButton.tsx`**                                          | Renders “Subscribe / Unsubscribe” UI, calls `/api/subscribe` to start checkout and polls `/api/subscription-status`.                                                 |
| **`src/app/(app_nochains)/(personal-settings)/settings/user/billing/ConnectStripePrompt.tsx`**             | Banner shown to creators who have **not completed onboarding**. Triggers `/api/stripe-connect` and polls `stripe-flags` on return.                                   |
| **`src/app/(app_nochains)/(personal-settings)/settings/user/billing/PaymentMethodsClient.tsx`**            | Lists saved cards & uses `AddCardDialog` / billing actions for attach / detach.                                                                                      |
| **`src/app/(app_nochains)/(personal-settings)/settings/user/billing/PersonalSubscriptionPlansClient.tsx`** | UI to **create & manage** personal subscription plans (calls the subscription-plans Server Action).                                                                  |
| **Billing Settings Page** `src/app/(app_nochains)/(personal-settings)/settings/user/billing/page.tsx`      | Server component that assembles all above widgets, fetches invoices via Stripe SDK when creator flags allow.                                                         |

---

## 4. Migrations & infrastructure

| File                                                       | Purpose                                                                                                                                                                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`supabase/migrations/20250603233529_remote_schema.sql`** | Initial adoption of Stripe: creates `customers`, `products`, `prices`, `subscription_plans`, `subscriptions`, `checkout_sessions`; adds `stripe_*` columns to **users** & **collectives**; indexes, RLS, and helper functions. |
| **(Subsequent migrations)**                                | No dedicated Stripe migrations after the remote import; all later logic handled in TypeScript & webhooks.                                                                                                                      |

Environment variables used (define in `.env.local`):

```bash
STRIPE_SECRET_KEY=sk_live_…
STRIPE_WEBHOOK_SECRET=whsec_…
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_…
```

---

### ✅ Summary

Stripe integration covers **Express Connect**, **Checkout + recurring subscriptions**, **Billing Portal**, payment-method management, and synchronises state back to Postgres via a robust webhook handler. All critical database tables and UI surfaces are now live; remaining work is limited to edge-case UX polish and additional metrics.
