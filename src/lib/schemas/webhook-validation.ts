import { z } from 'zod';

import type { Database } from '@/lib/database.types';

/**
 * Webhook metadata validation schemas
 * Ensures incoming Stripe webhook data meets expected format
 */

// Constants for validation
const DEFAULT_MAX_AGE_SECONDS = 300;
const MILLISECONDS_PER_SECOND = 1000;
const PII_REDACTION_LENGTH = 8;
const ACCOUNT_ID_REDACTION_LENGTH = 6;

// UUID validation pattern
const uuidSchema = z.string().uuid('Invalid UUID format');

// Subscription target type enum from database
const subscriptionTargetTypeSchema = z.enum([
  'platform',
  'collective',
  'user',
] as const);

/**
 * Checkout session metadata validation
 */
export const checkoutSessionMetadataSchema = z
  .object({
    userId: uuidSchema,
    targetEntityType: subscriptionTargetTypeSchema,
    targetEntityId: uuidSchema,
  })
  .passthrough();

/**
 * Subscription metadata validation
 */
export const subscriptionMetadataSchema = checkoutSessionMetadataSchema.extend({
  // Allow additional optional metadata keys like createdVia
  createdVia: z.string().optional(),
});

/**
 * Stripe signature header parsing
 */
export const parseStripeSignature = (
  signature: string,
): { t?: number; v1?: string } => {
  const parts = signature.split(',');
  const parsedSig: { t?: number; v1?: string } = {};

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't' && value) {
      const timestamp = Number.parseInt(value, 10);
      if (!Number.isNaN(timestamp)) {
        parsedSig.t = timestamp;
      }
    } else if (key === 'v1' && value) {
      parsedSig.v1 = value;
    }
  }

  return parsedSig;
};

/**
 * Timestamp validation helper
 */
export const validateWebhookTimestamp = (
  timestamp: number,
  maxAgeSeconds: number = DEFAULT_MAX_AGE_SECONDS,
): { valid: boolean; error?: string } => {
  const now = Math.floor(Date.now() / MILLISECONDS_PER_SECOND);
  const age = Math.abs(now - timestamp);

  if (age > maxAgeSeconds) {
    return {
      valid: false,
      error: `Webhook timestamp too old: ${age}s (max: ${maxAgeSeconds}s)`,
    };
  }

  return { valid: true };
};

/**
 * Safe header retrieval with fallback for different casings
 */
export const getStripeSignatureHeader = (headers: Headers): string | null => {
  return headers.get('stripe-signature') ?? headers.get('Stripe-Signature');
};

// Export constants for external use
export const WEBHOOK_VALIDATION_CONSTANTS = {
  DEFAULT_MAX_AGE_SECONDS,
  MILLISECONDS_PER_SECOND,
  PII_REDACTION_LENGTH,
  ACCOUNT_ID_REDACTION_LENGTH,
} as const;

// Type exports for use in webhook handlers
export type CheckoutSessionMetadata = z.infer<
  typeof checkoutSessionMetadataSchema
>;
export type SubscriptionMetadata = z.infer<typeof subscriptionMetadataSchema>;
export type SubscriptionTargetType =
  Database['public']['Enums']['subscription_target_type'];
export type SubscriptionStatus =
  Database['public']['Enums']['subscription_status'];
