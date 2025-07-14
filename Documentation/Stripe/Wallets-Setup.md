# Apple Pay & Google Pay Setup

This repo already has code-level support for wallet payments via Stripe Checkout **and** the new `PaymentRequestButton` component.

To make wallets appear in production you must:

1. **Apple Pay domain verification**

   1. Log in to Stripe Dashboard → Settings → Payment methods → Apple Pay → `Add new domain`.
   2. Download the generated `apple-developer-merchantid-domain-association` file.
   3. Place it at `public/.well-known/apple-developer-merchantid-domain-association` (create the directory if missing).
   4. Click **Verify** in the dashboard.

2. **Google Pay configuration**
   – Nothing extra is required. Checkout & PRB will surface Google Pay automatically on supported browsers once live-mode payments are enabled.

3. **Environment variables**
   Make sure the publishable key is exposed:

   ```env
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```

   Optional: restrict allowed methods (defaults already include wallets when using automatic PMs).

4. **Testing in development**
   – Use Chrome with "Payment Request API" experimental flag and add a test card to browser wallet.

That’s it – wallets should now render anywhere `PaymentRequestButton` is mounted and inside Stripe Checkout flows.
