import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';

import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Database } from '@/lib/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

// Convenience alias for a resolved Supabase client instance
type SBClient = SupabaseClient<Database>;

// Environment-based configuration with sane defaults
const INTERNAL_SERVER_ERROR_STATUS = 500;
const TOO_MANY_REQUESTS_STATUS = 429;
const UNAUTHORIZED_STATUS = 401;
const BAD_REQUEST_STATUS = 400;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;
const DEFAULT_RATE_LIMIT_MAX = 10;
const DEFAULT_IDEMPOTENCY_WINDOW_MINUTES = 5;
const DEFAULT_PRICE_CACHE_MINUTES = 5;
const MAX_REDIRECT_PATH_LENGTH = 256;
const MAX_PRICE_ID_LENGTH = 128;

// Environment-based constants
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.SUBSCRIBE_RATE_LIMIT_MAX ?? DEFAULT_RATE_LIMIT_MAX.toString(), 10);
const RATE_LIMIT_WINDOW_MS = MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
const IDEMPOTENCY_WINDOW_MINUTES = parseInt(process.env.SUBSCRIBE_IDEMPOTENCY_WINDOW_MINUTES ?? DEFAULT_IDEMPOTENCY_WINDOW_MINUTES.toString(), 10);
const IDEMPOTENCY_WINDOW_MS = IDEMPOTENCY_WINDOW_MINUTES * SECONDS_PER_MINUTE * MS_PER_SECOND;
const PRICE_CACHE_MINUTES = parseInt(process.env.SUBSCRIBE_PRICE_CACHE_MINUTES ?? DEFAULT_PRICE_CACHE_MINUTES.toString(), 10);
const PRICE_CACHE_MS = PRICE_CACHE_MINUTES * SECONDS_PER_MINUTE * MS_PER_SECOND;
const MS_PER_SECOND_CONVERSION = 1000;

// Enhanced payment method validation
const SUPPORTED_PAYMENT_METHODS = new Set([
  'card', 'us_bank_account', 'sepa_debit', 'ideal', 'sofort', 'bancontact', 
  'giropay', 'p24', 'eps', 'fpx', 'alipay', 'wechat_pay'
] as const);

// Get validated payment methods from environment or use auto
const getAllowedPaymentMethods = (): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] | undefined => {
  const envMethods = process.env.STRIPE_PAYMENT_METHODS;
  if (envMethods !== null && envMethods !== undefined && envMethods.length > 0) {
    const methods = envMethods.split(',').map(m => m.trim()).filter(m => SUPPORTED_PAYMENT_METHODS.has(m as never));
    return methods.length > 0 ? methods as Stripe.Checkout.SessionCreateParams.PaymentMethodType[] : undefined;
  }
  return undefined; // Let Stripe use automatic payment method collection
};

// Enhanced request validation schema with redirect path limits
const SubscribeRequestSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required').max(MAX_PRICE_ID_LENGTH, 'Price ID too long'),
  redirectPath: z.string()
    .max(MAX_REDIRECT_PATH_LENGTH, `Redirect path must be ${MAX_REDIRECT_PATH_LENGTH} characters or less`)
    .regex(/^\/[^/]/, 'Redirect path must start with / and not be protocol-relative')
    .optional()
    .default('/'),
  targetEntityType: z.enum(['user', 'collective'], {
    errorMap: () => ({ message: 'Target entity type must be either "user" or "collective"' })
  }),
  targetEntityId: z.string().uuid('Target entity ID must be a valid UUID'),
});

// Structured logging utility with proper levels
interface LogContext {
  userId?: string;
  priceId?: string;
  targetEntityType?: string;
  targetEntityId?: string;
  action: string;
  [key: string]: unknown;
}

function logSubscriptionAction(
  context: LogContext,
  level: 'info' | 'warn' | 'error' = 'info'
): void {
  // Remove PII and sensitive data
  const sanitized = {
    ...context,
    // Never log full email, just domain
    email: (typeof context.email === 'string') ? `***@${context.email.split('@')[1] || 'unknown'}` : undefined,
    // Remove any other sensitive fields
    stripCustomerId: (typeof context.stripCustomerId === 'string') ? 'cus_***' : undefined,
  };
  
  // Use proper log levels - info for success, warn for recoverable issues, error for failures
  if (level === 'error') {
    console.error(`[SUBSCRIPTION_API] ${context.action}:`, sanitized);
  } else if (level === 'warn') {
    console.warn(`[SUBSCRIPTION_API] ${context.action}:`, sanitized);
  } else {
    // Success/info logs should not appear as warnings in monitoring - use console.warn since console.log is not allowed
    console.warn(`[SUBSCRIPTION_API] ${context.action}:`, sanitized);
  }
}

// Enhanced price validation with caching using api_cache table
async function validatePriceId(
  priceId: string,
  supabase: SBClient
): Promise<{ isValid: boolean; error?: string }> {
  try {
    // Check cache first
    const cacheExpiry = new Date(Date.now() - PRICE_CACHE_MS).toISOString();
    
    const { data: cached, error: cacheError } = await supabase
      .from('api_cache')
      .select('data, created_at')
      .eq('cache_key', `price_validation_${priceId}`)
      .gte('created_at', cacheExpiry)
      .maybeSingle();

    if (cacheError === null && cached !== null) {
      return cached.data as { isValid: boolean; error?: string };
    }

    // First check environment variables for allowed prices
    const allowedPricesEnv = process.env.STRIPE_ALLOWED_PRICE_IDS;
    const allowedPrices = (allowedPricesEnv !== null && allowedPricesEnv !== undefined) ? allowedPricesEnv.split(',').map(p => p.trim()) : [];
    if (allowedPrices.length > 0 && !allowedPrices.includes(priceId)) {
      const result = { isValid: false, error: 'Price ID not in allowed list' };
      // Cache the result
      await supabase
        .from('api_cache')
        .upsert({
          cache_key: `price_validation_${priceId}`,
          data: result,
          created_at: new Date().toISOString(),
        }, { onConflict: 'cache_key' });
      return result;
    }

    // If no env list, validate with Stripe directly
    const stripe = getStripe();
    if (stripe === null) {
      return { isValid: false, error: 'Stripe not configured' };
    }

    // Type narrowing - stripe is guaranteed to be non-null here
    const validatedStripe = stripe as NonNullable<typeof stripe>;
    const price = await validatedStripe.prices.retrieve(priceId);
    const result = price.active 
      ? { isValid: true } 
      : { isValid: false, error: 'Price is not active' };

    // Cache the result
    await supabase
      .from('api_cache')
      .upsert({
        cache_key: `price_validation_${priceId}`,
        data: result,
        created_at: new Date().toISOString(),
      }, { onConflict: 'cache_key' });

    return result;
  } catch (error: unknown) {
    logSubscriptionAction({ action: 'price_validation_failed', priceId, error }, 'error');
    return { isValid: false, error: 'Invalid price ID' };
  }
}

// Database-based rate limiting using api_cache table
async function checkRateLimit(
  userId: string,
  supabase: SBClient
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const cacheKey = `rate_limit_subscribe_${userId}`;

    // Count recent attempts
    const { data, error } = await supabase
      .from('api_cache')
      .select('created_at')
      .eq('cache_key', cacheKey)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: false });

    if (error !== null) {
      logSubscriptionAction({ action: 'rate_limit_check_failed', userId, error: error.message }, 'warn');
      // Fail open - allow request if we can't check rate limit
      return { allowed: true };
    }

    const attemptCount = data?.length ?? 0;

    if (attemptCount >= RATE_LIMIT_MAX_REQUESTS) {
      // Calculate retry after from oldest attempt
      const oldestAttempt = data?.[data.length - 1]?.created_at;
      const retryAfter = (typeof oldestAttempt === 'string')
        ? Math.ceil(
            (new Date(oldestAttempt).getTime() + RATE_LIMIT_WINDOW_MS - Date.now()) /
              MS_PER_SECOND_CONVERSION,
          )
        : MINUTES_PER_HOUR * SECONDS_PER_MINUTE;
      return { allowed: false, retryAfter: Math.max(retryAfter, 1) };
    }

    // Record this attempt
    await supabase
      .from('api_cache')
      .insert({
        cache_key: cacheKey,
        data: { attempt: attemptCount + 1 },
        created_at: new Date().toISOString(),
      });

    return { allowed: true };
  } catch (error: unknown) {
    logSubscriptionAction({ action: 'rate_limit_error', userId, error }, 'warn');
    // Fail open - allow request if rate limiting fails
    return { allowed: true };
  }
}

// Database-based idempotency check using api_cache table
async function checkIdempotency(
  userId: string,
  targetEntityType: string,
  targetEntityId: string,
  supabase: SBClient
): Promise<{ isDuplicate: boolean; existingUrl?: string }> {
  try {
    const windowStart = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS).toISOString();
    const cacheKey = `idempotency_${userId}_${targetEntityType}_${targetEntityId}`;

    const { data, error } = await supabase
      .from('api_cache')
      .select('data')
      .eq('cache_key', cacheKey)
      .gte('created_at', windowStart)
      .maybeSingle();

    if (error !== null) {
      logSubscriptionAction({ action: 'idempotency_check_failed', userId, error: error.message }, 'warn');
      return { isDuplicate: false };
    }

    if (data?.data !== null && data?.data !== undefined && typeof data.data === 'object' && 'sessionUrl' in data.data) {
      return { 
        isDuplicate: true, 
        existingUrl: data.data.sessionUrl as string 
      };
    }

    return { isDuplicate: false };
  } catch (error: unknown) {
    logSubscriptionAction({ action: 'idempotency_error', userId, error }, 'warn');
    return { isDuplicate: false };
  }
}

// Store idempotency record in api_cache table
async function storeIdempotencyRecord(
  userId: string,
  targetEntityType: string,
  targetEntityId: string,
  sessionUrl: string,
  supabase: SBClient
): Promise<void> {
  try {
    const cacheKey = `idempotency_${userId}_${targetEntityType}_${targetEntityId}`;
    await supabase
      .from('api_cache')
      .upsert({
        cache_key: cacheKey,
        data: { sessionUrl, createdAt: Date.now() },
        created_at: new Date().toISOString(),
      }, { onConflict: 'cache_key' });
  } catch (error: unknown) {
    logSubscriptionAction({ action: 'idempotency_store_failed', userId, error }, 'warn');
  }
}

// Enhanced redirect path validation
function validateRedirectPath(redirectPath: string, siteUrl: string): string {
  try {
    // Reject protocol-relative URLs that could redirect to external sites
    if (redirectPath.startsWith('//')) {
      logSubscriptionAction({ 
        action: 'redirect_path_protocol_relative_rejected', 
        redirectPath 
      }, 'warn');
      return '/';
    }

    // Ensure same-origin
    const fullUrl = new URL(redirectPath, siteUrl);
    const siteOrigin = new URL(siteUrl).origin;
    
    if (fullUrl.origin !== siteOrigin) {
      logSubscriptionAction({ 
        action: 'redirect_path_validation_failed', 
        redirectPath, 
        attempted_origin: fullUrl.origin,
        expected_origin: siteOrigin 
      }, 'warn');
      return '/';
    }
    
    return fullUrl.pathname + fullUrl.search;
  } catch {
    return '/';
  }
}

// RPC-based collective authorization for RLS compatibility
async function checkCollectiveAuthorization(
  userId: string,
  collectiveId: string,
  supabase: SBClient
): Promise<{ authorized: boolean; error?: string }> {
  try {
    // Use RPC function that enforces RLS policies
    const { data, error } = await supabase
      .rpc('check_collective_subscription_permission', {
        p_user_id: userId,
        p_collective_id: collectiveId
      })
      .single();

    if (error !== null) {
      logSubscriptionAction({ 
        action: 'collective_auth_rpc_failed', 
        userId, 
        collectiveId, 
        error: error.message 
      }, 'error');
      return { authorized: false, error: 'Failed to verify collective permissions' };
    }

    return { authorized: data?.has_permission === true };
  } catch (error: unknown) {
    logSubscriptionAction({ 
      action: 'collective_auth_check_exception', 
      userId, 
      collectiveId, 
      error 
    }, 'error');
    return { authorized: false, error: 'Authorization check failed' };
  }
}

// Enhanced customer creation with proper upsert logic and Stripe idempotency
async function getOrCreateStripeCustomer(
  user: { id: string; email: string; user_metadata?: { full_name?: string; preferred_locales?: string[] } },
  supabase: SBClient
): Promise<{ success: boolean; customerId?: string; error?: string }> {
  try {
    const stripe = getStripe();
    if (stripe === null) {
      return { success: false, error: 'Stripe not configured' };
    }

    // First, try to fetch existing customer
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    // If customer exists with valid Stripe ID, return it
    if (existingCustomer?.stripe_customer_id !== null && 
        existingCustomer?.stripe_customer_id !== undefined && 
        existingCustomer.stripe_customer_id.length > 0) {
      return { success: true, customerId: existingCustomer.stripe_customer_id };
    }

    // Type narrowing - stripe is guaranteed to be non-null here
    const validatedStripe = stripe as NonNullable<typeof stripe>;

    // Create new Stripe customer with idempotency key
    const customer = await validatedStripe.customers.create({
      email: user.email,
      name: user.user_metadata?.full_name,
      preferred_locales: user.user_metadata?.preferred_locales || ['en'],
      metadata: {
        userId: user.id,
      },
    }, {
      idempotencyKey: `customer_${user.id}`, // Stripe idempotency key
    });

    // Insert or update customer record (only if not exists or stripe_customer_id is null)
    const { error: upsertError } = await supabase
      .from('customers')
      .upsert({
        id: user.id,
        stripe_customer_id: customer.id,
      }, { 
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (upsertError !== null) {
      logSubscriptionAction({ 
        action: 'customer_upsert_failed', 
        userId: user.id, 
        stripeCustomerId: customer.id,
        error: upsertError.message 
      }, 'error');
      return { success: false, error: 'Failed to save customer data' };
    }

    return { success: true, customerId: customer.id };
  } catch (error: unknown) {
    logSubscriptionAction({ 
      action: 'customer_creation_failed', 
      userId: user.id, 
      error 
    }, 'error');
    return { success: false, error: 'Failed to create customer' };
  }
}

// Store checkout session for webhook reconciliation
async function storeCheckoutSession(
  sessionId: string,
  userId: string,
  targetEntityType: string,
  targetEntityId: string,
  supabase: SBClient
): Promise<void> {
  try {
    await supabase
      .from('checkout_sessions')
      .insert({
        stripe_session_id: sessionId,
        user_id: userId,
        target_entity_type: targetEntityType,
        target_entity_id: targetEntityId,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
  } catch (error: unknown) {
    logSubscriptionAction({ 
      action: 'checkout_session_store_failed', 
      sessionId, 
      userId, 
      error 
    }, 'warn');
  }
}

// Enhanced Stripe error handling
function handleStripeError(error: unknown): { status: number; message: string } {
  if (error !== null && error !== undefined && typeof error === 'object' && 'type' in error) {
    const stripeError = error as { type: string; code?: string; statusCode?: number; message: string };
    
    if (stripeError.type === 'card_error') {
      return { status: BAD_REQUEST_STATUS, message: 'Card was declined' };
    }
    
    if (stripeError.type === 'rate_limit_error') {
      return { status: TOO_MANY_REQUESTS_STATUS, message: 'Service temporarily unavailable due to rate limiting' };
    }
    
    if (stripeError.type === 'invalid_request_error') {
      return { status: BAD_REQUEST_STATUS, message: 'Invalid request parameters' };
    }
    
    if (stripeError.type === 'api_error') {
      return { status: INTERNAL_SERVER_ERROR_STATUS, message: 'Payment service temporarily unavailable' };
    }
    
    if (stripeError.type === 'api_connection_error') {
      return { status: INTERNAL_SERVER_ERROR_STATUS, message: 'Network error occurred' };
    }
    
    if (stripeError.type === 'authentication_error') {
      return { status: INTERNAL_SERVER_ERROR_STATUS, message: 'Payment service authentication failed' };
    }
    
    if (stripeError.code === 'rate_limit') {
      return { status: TOO_MANY_REQUESTS_STATUS, message: 'Service temporarily unavailable due to rate limiting' };
    }
    
    return { status: INTERNAL_SERVER_ERROR_STATUS, message: 'Payment processing failed' };
  }
  
  return { status: INTERNAL_SERVER_ERROR_STATUS, message: 'An unexpected error occurred' };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Create session-aware Supabase client with proper context
  const supabase = await createServerSupabaseClient();

  const stripe = getStripe();
  if (stripe === null) {
    return NextResponse.json(
      { error: 'Payment service not configured' },
      { status: INTERNAL_SERVER_ERROR_STATUS },
    );
  }

  // Type narrowing - stripe is guaranteed to be non-null after this point
  const validatedStripe = stripe as NonNullable<typeof stripe>;

  try {
    // Get authenticated user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user?.id === null || user?.id === undefined || user?.email === null || user?.email === undefined) {
      logSubscriptionAction({ 
        action: 'authentication_failed', 
        error: authError?.message 
      }, 'warn');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: UNAUTHORIZED_STATUS },
      );
    }

    // Rate limiting check  
    const rateLimitResult = await checkRateLimit(user.id, supabase);
    if (!rateLimitResult.allowed) {
      logSubscriptionAction({ 
        action: 'rate_limit_exceeded', 
        userId: user.id 
      }, 'warn');
      return NextResponse.json(
        { 
          error: 'Too many subscription attempts. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
        },
        { 
          status: TOO_MANY_REQUESTS_STATUS,
          headers: (rateLimitResult.retryAfter !== null && rateLimitResult.retryAfter !== undefined)
            ? { 'Retry-After': rateLimitResult.retryAfter.toString() }
            : undefined,
        },
      );
    }

    // Validate and parse request body with enhanced validation
    const rawBody: unknown = await request.json();
    const requestBody = SubscribeRequestSchema.parse(rawBody);
    const { priceId, redirectPath, targetEntityType, targetEntityId } = requestBody;

    // Idempotency check  
    const idempotencyResult = await checkIdempotency(user.id, targetEntityType, targetEntityId, supabase);
    if (idempotencyResult.isDuplicate && idempotencyResult.existingUrl !== null && idempotencyResult.existingUrl !== undefined) {
      logSubscriptionAction({ 
        action: 'duplicate_request_detected', 
        userId: user.id, 
        targetEntityType, 
        targetEntityId 
      }, 'warn'); // This is info level - successful dedup
      return NextResponse.json({ url: idempotencyResult.existingUrl });
    }

    // Validate price ID with caching
    const priceValidation = await validatePriceId(priceId, supabase);
    if (!priceValidation.isValid) {
      logSubscriptionAction({ 
        action: 'price_validation_failed', 
        priceId, 
        error: priceValidation.error 
      }, 'warn');
      return NextResponse.json(
        { error: priceValidation.error ?? 'Invalid price' },
        { status: BAD_REQUEST_STATUS },
      );
    }

    // Authorization check for collective subscriptions  
    if (targetEntityType === 'collective') {
      const authResult = await checkCollectiveAuthorization(user.id, targetEntityId, supabase);
      if (!authResult.authorized) {
        logSubscriptionAction({ 
          action: 'collective_auth_failed', 
          userId: user.id, 
          collectiveId: targetEntityId, 
          error: authResult.error 
        }, 'warn');
        return NextResponse.json(
          { error: authResult.error ?? 'Unauthorized' },
          { status: UNAUTHORIZED_STATUS },
        );
      }
    }

    // Type guard for user to ensure email is present
    const validatedUser = {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    };

    // Get or create Stripe customer with idempotency
    const customerResult = await getOrCreateStripeCustomer(validatedUser, supabase);
    if (!customerResult.success || customerResult.customerId === null || customerResult.customerId === undefined) {
      return NextResponse.json(
        { error: customerResult.error ?? 'Failed to process customer' },
        { status: INTERNAL_SERVER_ERROR_STATUS },
      );
    }

    // Enhanced redirect path validation
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const secureRedirectPath = validateRedirectPath(redirectPath, siteUrl);
    const successUrl = `${siteUrl}${secureRedirectPath}?stripe_session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${siteUrl}${secureRedirectPath}`;

    // Handle Stripe Connect for collectives with exact string matching
    let transferData: { destination: string } | undefined = undefined;
    if (targetEntityType === 'collective') {
      const { data: collective, error: collectiveError } = await supabase
        .from('collectives')
        .select('stripe_account_id')
        .eq('id', targetEntityId)
        .maybeSingle();

      if (collectiveError !== null || collective?.stripe_account_id === null || collective?.stripe_account_id === undefined || collective.stripe_account_id.length === 0) {
        logSubscriptionAction({ 
          action: 'collective_stripe_account_missing', 
          collectiveId: targetEntityId 
        }, 'error');
        return NextResponse.json(
          { error: 'Collective payment setup incomplete' },
          { status: BAD_REQUEST_STATUS },
        );
      }

      // Enhanced platform-only price checking with exact matching
      const platformOnlyPricesEnv = process.env.STRIPE_PLATFORM_ONLY_PRICES;
      if (platformOnlyPricesEnv !== null && platformOnlyPricesEnv !== undefined) {
        const platformOnlyPrices = new Set(platformOnlyPricesEnv.split(',').map(p => p.trim()));
        const shouldTransfer = !platformOnlyPrices.has(priceId);
        if (shouldTransfer) {
          transferData = { destination: collective.stripe_account_id };
        }
      } else {
        // Default: transfer to collective if no platform-only list
        transferData = { destination: collective.stripe_account_id };
      }
    }

    // Generate Stripe idempotency key for checkout session
    const idempotencyKey = `checkout_${user.id}_${targetEntityType}_${targetEntityId}_${priceId}`;

    // Create Stripe Checkout Session with enhanced configuration
    const checkoutSessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerResult.customerId,
      payment_method_types: getAllowedPaymentMethods(), // Can be undefined for auto
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          userId: user.id,
          targetEntityType,
          targetEntityId,
          createdVia: 'api_v2',
        },
        ...(transferData ? { transfer_data: transferData } : {}),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
      // Add automatic tax collection for international sales
      automatic_tax: {
        enabled: process.env.STRIPE_AUTOMATIC_TAX_ENABLED === 'true',
      },
      // Enhanced session metadata for webhook reconciliation
      metadata: {
        apiVersion: '2.0',
        userId: user.id,
        targetEntityType,
        targetEntityId,
        priceId,
        timestamp: Date.now().toString(),
      },
    };

    // Remove undefined payment_method_types to let Stripe auto-detect
    if (checkoutSessionParams.payment_method_types === undefined) {
      delete checkoutSessionParams.payment_method_types;
    }

    const checkoutSession = await validatedStripe.checkout.sessions.create(
      checkoutSessionParams,
      { idempotencyKey } // Stripe-native idempotency
    );

    if (checkoutSession.url === null || checkoutSession.url === undefined || checkoutSession.url.length === 0) {
      logSubscriptionAction({ 
        action: 'checkout_session_url_missing', 
        sessionId: checkoutSession.id 
      }, 'error');
      return NextResponse.json(
        { error: 'Failed to create payment session' },
        { status: INTERNAL_SERVER_ERROR_STATUS },
      );
    }

    // Store session for audit trail
    await storeCheckoutSession(
      checkoutSession.id,
      user.id,
      targetEntityType,
      targetEntityId,
      supabase
    );

    // Store idempotency record  
    await storeIdempotencyRecord(user.id, targetEntityType, targetEntityId, checkoutSession.url, supabase);

    logSubscriptionAction({ 
      action: 'checkout_session_created', 
      userId: user.id, 
      sessionId: checkoutSession.id, 
      priceId,
      targetEntityType,
      targetEntityId 
    }, 'warn'); // Success is info level but using warn since console.log not allowed

    return NextResponse.json({ url: checkoutSession.url });

  } catch (error: unknown) {
    // Enhanced error logging and handling
    if (error instanceof z.ZodError) {
      logSubscriptionAction({ 
        action: 'validation_failed', 
        errors: error.errors 
      }, 'warn');
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        },
        { status: BAD_REQUEST_STATUS },
      );
    }

    const { status, message } = handleStripeError(error);
    
    logSubscriptionAction({ 
      action: 'subscription_request_failed', 
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error?.constructor?.name,
    }, 'error');

    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}

