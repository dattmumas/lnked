import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (_stripe !== null) return _stripe; // cached

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    // No key yet – return null instead of throwing
    return null;
  }

  _stripe = new Stripe(key, {
    apiVersion: '2023-10-16',
    typescript: true,
  });
  return _stripe;
}

/**
 * ----------------------------------------------------------------------------
 * Stripe SDK Client Initialization
 * ----------------------------------------------------------------------------
 * This module initializes and exports a singleton instance of the Stripe Node.js SDK.
 *
 * Configuration:
 * - `STRIPE_SECRET_KEY`: Fetched from environment variables. This key is sensitive
 *   and should ONLY be used on the server-side. Ensure it's defined in your
 *   `.env.local` for local development and configured in your hosting environment
 *   for production. It must never be exposed to the client-side.
 *
 * - `apiVersion`: The Stripe API version the SDK will use. Pinning to a specific
 *   version (e.g., '2024-04-10') is crucial for API stability and to prevent
 *   unexpected breaking changes if Stripe updates its API. Regularly review
 *   Stripe's API changelog and update this version as appropriate.
 *
 * - `typescript`: Set to `true` to enable and leverage Stripe's official
 *   TypeScript definitions. This provides strong type safety, autocompletion,
 *   and a better developer experience when working with Stripe objects and methods.
 *
 * - `appInfo` (Optional): Provides information about your application to Stripe.
 *   This can be helpful for Stripe in diagnostics or if they need to contact you
 *   about your integration. Fill this with your application's details.
 *
 * Usage:
 * Import the `stripe` instance in your server-side code (e.g., Next.js API routes,
 * Server Actions, or other backend modules) to interact with the Stripe API.
 *
 * Example (in an API Route or Server Action):
 * ```typescript
 * import { stripe } from '@/lib/stripe'; // Assuming path alias is configured
 *
 * async function createStripePaymentIntent(amount: number) {
 *   try {
 *     const paymentIntent = await stripe.paymentIntents.create({
 *       amount: amount * 100, // Amount in cents
 *       currency: 'usd',
 *       // ... other parameters
 *     });
 *     return paymentIntent;
 *   } catch (error) {
 *     console.error('Error creating PaymentIntent:', error);
 *     throw error;
 *   }
 * }
 * ```
 * ----------------------------------------------------------------------------
 */
