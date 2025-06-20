import { NextRequest, NextResponse } from 'next/server';

import { getStripe } from '@/lib/stripe';
import { createRequestScopedSupabaseClient } from '@/lib/supabase/request-scoped';
import { createMetricsTimer, recordAPIMetrics } from '@/lib/utils/metrics';
import { createAPILogger } from '@/lib/utils/structured-logger';

import type Stripe from 'stripe';

// HTTP status codes
const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Default values
const DEFAULT_TRIAL_PERIOD_DAYS = 0;

interface PlanRequestBody {
  name?: unknown;
  amount?: unknown;
  currency?: unknown;
  interval?: unknown;
  trial_period_days?: unknown;
  description?: unknown;
}

interface ValidatedPlanData {
  name: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  trial_period_days: number;
  description?: string;
}

// Validate and sanitize plan request body
function validatePlanRequest(body: PlanRequestBody): { isValid: boolean; data?: ValidatedPlanData; error?: string } {
  const { name, amount, currency, interval, trial_period_days, description } = body;

  // Required field validation
  if (name === null || name === undefined || typeof name !== 'string' || name.trim() === '') {
    return { isValid: false, error: 'Plan name is required and must be a non-empty string' };
  }

  if (amount === null || amount === undefined || typeof amount !== 'number' || amount <= 0) {
    return { isValid: false, error: 'Plan amount is required and must be a positive number' };
  }

  if (currency === null || currency === undefined || typeof currency !== 'string' || currency.trim() === '') {
    return { isValid: false, error: 'Currency is required and must be a valid currency code' };
  }

  if (interval === null || interval === undefined || (interval !== 'month' && interval !== 'year')) {
    return { isValid: false, error: 'Interval must be either "month" or "year"' };
  }

  // Optional field validation
  let validTrialDays = DEFAULT_TRIAL_PERIOD_DAYS;
  if (trial_period_days !== null && trial_period_days !== undefined) {
    if (typeof trial_period_days !== 'number' || trial_period_days < 0) {
      return { isValid: false, error: 'Trial period days must be a non-negative number' };
    }
    validTrialDays = trial_period_days;
  }

  let validDescription: string | undefined;
  if (description !== null && description !== undefined) {
    if (typeof description !== 'string') {
      return { isValid: false, error: 'Description must be a string' };
    }
    validDescription = description.trim() || undefined;
  }

  return {
    isValid: true,
    data: {
      name: name.trim(),
      amount,
      currency: currency.toLowerCase(),
      interval,
      trial_period_days: validTrialDays,
      description: validDescription,
    },
  };
}

// Type definitions
interface CollectiveData {
  id: string;
  owner_id: string;
  stripe_account_id: string | null;
}

// Enhanced ownership check supporting admin roles
async function validateCollectiveAccess(
  supabase: ReturnType<typeof createRequestScopedSupabaseClient>,
  collectiveId: string,
  userId: string,
): Promise<{ collective: CollectiveData | null; hasAccess: boolean }> {
  // Query collective with member roles (supporting multi-owner/admin)
  const { data: memberData, error: memberError } = await supabase
    .from('collective_members')
    .select(`
      role,
      collective:collectives!inner(
        id,
        owner_id,
        stripe_account_id
      )
    `)
    .eq('collective_id', collectiveId)
    .eq('user_id', userId)
    .in('role', ['owner', 'admin'])
    .single();

  if (memberError !== null || memberData === null) {
    // Fallback to direct owner check
    const { data: collectiveData, error: collectiveError } = await supabase
      .from('collectives')
      .select('id, owner_id, stripe_account_id')
      .eq('id', collectiveId)
      .eq('owner_id', userId)
      .single();

    if (collectiveError !== null || collectiveData === null) {
      return { collective: null, hasAccess: false };
    }

    return { collective: collectiveData as CollectiveData, hasAccess: true };
  }

  return { collective: memberData.collective as CollectiveData, hasAccess: true };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ collectiveId: string }> }, // Fixed: params IS a Promise in Next.js 15
): Promise<NextResponse> {
  const logger = createAPILogger(req, '/api/collectives/[collectiveId]/plans');
  const timer = createMetricsTimer();
  let userId: string | undefined;

  try {
    const { collectiveId } = await params; // Await params in Next.js 15
    if (collectiveId === null || collectiveId === undefined || collectiveId === '') {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/plans',
        method: 'POST',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        duration,
        error: 'Missing collectiveId',
      });

      return NextResponse.json(
        { error: 'Missing collectiveId' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Session-aware Supabase client with proper context
    const supabase = createRequestScopedSupabaseClient(req);
    
    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/plans',
        method: 'POST',
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        duration,
        error: 'Authentication failed',
      });

      logger.warn('Unauthorized plan creation attempt', {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        error: authError?.message,
        metadata: {
          collectiveId,
        },
      });

      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    userId = user.id;

    // Enhanced ownership check with admin role support
    const { collective, hasAccess } = await validateCollectiveAccess(
      supabase,
      collectiveId,
      userId,
    );

    if (!hasAccess || collective === null) {
      const statusCode = collective === null ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.FORBIDDEN;
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/plans',
        method: 'POST',
        statusCode,
        duration,
        userId,
        error: collective === null ? 'Collective not found' : 'Access denied',
      });

      const errorMessage = collective === null ? 'Collective not found' : 'Forbidden: Insufficient permissions';
      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode }
      );
    }

    // Check Stripe onboarding status
    if (collective.stripe_account_id === null || collective.stripe_account_id === undefined || collective.stripe_account_id === '') {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/plans',
        method: 'POST',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        duration,
        userId,
        error: 'Stripe account not configured',
      });

      return NextResponse.json(
        { error: 'Collective not onboarded to Stripe' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Initialize Stripe
    const stripe = getStripe();
    if (stripe === null || stripe === undefined) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/plans',
        method: 'POST',
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        duration,
        userId,
        error: 'Stripe not configured',
      });

      logger.error('Stripe not configured', {
        userId,
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        metadata: {
          collectiveId,
        },
      });

      return NextResponse.json(
        { error: 'Payment service unavailable' },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    // Validate request body
    const body: PlanRequestBody = await req.json() as PlanRequestBody;
    const validation = validatePlanRequest(body);
    
    if (!validation.isValid || validation.data === undefined) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/plans',
        method: 'POST',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        duration,
        userId,
        error: 'Invalid request body',
      });

      return NextResponse.json(
        { error: validation.error ?? 'Invalid request data' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const validatedData = validation.data;

    // 1. Fetch or create the Stripe Product for this collective
    let product: Stripe.Product;
    const { data: existingProduct, error: fetchProdErr } = await supabase
      .from('products')
      .select('id')
      .eq('collective_id', collectiveId)
      .maybeSingle();

    if (fetchProdErr !== null) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/plans',
        method: 'POST',
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        duration,
        userId,
        error: 'Database lookup failed',
      });

      logger.error('Failed to lookup existing product', {
        userId,
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        error: fetchProdErr,
        metadata: {
          collectiveId,
        },
      });

      return NextResponse.json(
        { error: 'Failed to lookup existing product' },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    if (existingProduct !== null) {
      // Reuse existing product so new prices become tiers under it
      product = await stripe.products.retrieve(existingProduct.id);
    } else {
      product = await stripe.products.create({
        name: validatedData.name,
        description: validatedData.description,
        metadata: { collectiveId },
      });

      const { error: productErr } = await supabase.from('products').insert({
        id: product.id,
        name: product.name,
        description: product.description,
        collective_id: collectiveId,
        active: true,
      });

      if (productErr !== null) {
        const duration = timer();
        recordAPIMetrics({
          endpoint: '/api/collectives/[collectiveId]/plans',
          method: 'POST',
          statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
          duration,
          userId,
          error: 'Product save failed',
        });

        logger.error('Failed to save product', {
          userId,
          statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
          error: productErr,
          metadata: {
            collectiveId,
            productId: product.id,
          },
        });

        return NextResponse.json(
          { error: 'Failed to save product' },
          { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
      }
    }

    // 2. Create Stripe Price (recurring)
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: validatedData.amount,
      currency: validatedData.currency,
      recurring: { interval: validatedData.interval },
      metadata: { collectiveId },
    });

    // 3. Store the new price in our database
    const { error: priceErr } = await supabase.from('prices').insert({
      id: price.id,
      product_id: product.id,
      unit_amount: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval,
      trial_period_days: validatedData.trial_period_days,
      active: true,
    });

    if (priceErr !== null) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/plans',
        method: 'POST',
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        duration,
        userId,
        error: 'Price save failed',
      });

      logger.error('Failed to save price', {
        userId,
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        error: priceErr,
        metadata: {
          collectiveId,
          productId: product.id,
          priceId: price.id,
        },
      });

      return NextResponse.json(
        { error: 'Failed to save price' },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    const duration = timer();
    recordAPIMetrics({
      endpoint: '/api/collectives/[collectiveId]/plans',
      method: 'POST',
      statusCode: 200,
      duration,
      userId,
    });

    logger.info('Subscription plan created successfully', {
      userId,
      statusCode: 200,
      duration,
      metadata: {
        collectiveId,
        productId: product.id,
        priceId: price.id,
        amount: validatedData.amount,
        currency: validatedData.currency,
        interval: validatedData.interval,
      },
    });

    return NextResponse.json({ product, price });

  } catch (error: unknown) {
    const duration = timer();
    recordAPIMetrics({
      endpoint: '/api/collectives/[collectiveId]/plans',
      method: 'POST',
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      duration,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    logger.error('Plan creation failed', {
      userId,
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      duration,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    return NextResponse.json(
      { error: 'Failed to create subscription plan' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
