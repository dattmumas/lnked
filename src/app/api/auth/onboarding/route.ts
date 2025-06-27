// User Onboarding API Route
// Handles new user setup with automatic personal tenant creation

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { tenantOnboardingService, type UserProfile } from '@/lib/auth/tenant-onboarding';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// =============================================================================
// CONSTANTS
// =============================================================================

const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 30;
const MIN_FULLNAME_LENGTH = 1;
const MAX_FULLNAME_LENGTH = 100;
const MAX_BIO_LENGTH = 500;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_INTERNAL_SERVER_ERROR = 500;

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const OnboardingSchema = z.object({
  username: z.string().min(MIN_USERNAME_LENGTH).max(MAX_USERNAME_LENGTH).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  full_name: z.string().min(MIN_FULLNAME_LENGTH).max(MAX_FULLNAME_LENGTH).optional(),
  avatar_url: z.string().url().optional(),
  bio: z.string().max(MAX_BIO_LENGTH).optional(),
  complete_onboarding: z.boolean().default(true),
});

// =============================================================================
// COMPLETE USER ONBOARDING
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: HTTP_UNAUTHORIZED }
      );
    }

    // Validate request body
    const body = await request.json();
    const validationResult = OnboardingSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid onboarding data',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: HTTP_BAD_REQUEST }
      );
    }

    const { username, full_name, avatar_url, bio, complete_onboarding } = validationResult.data;

    // Prepare user profile
    const profile: UserProfile = {
      ...(username ? { username } : {}),
      ...(full_name ? { full_name } : {}),
      ...(avatar_url ? { avatar_url } : {}),
      ...(bio ? { bio } : {}),
    };

    // Complete onboarding with tenant creation
    const result = await tenantOnboardingService.completeUserOnboarding(
      user.id,
      complete_onboarding ? profile : undefined
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Onboarding failed',
          details: result.details,
        },
        { status: HTTP_INTERNAL_SERVER_ERROR }
      );
    }

    // Get user's tenant context for session initialization
    const tenantContext = await tenantOnboardingService.getUserTenantContext(user.id);

    return NextResponse.json({
      success: true,
      user: result.user,
      personal_tenant: result.personalTenant,
      tenant_context: tenantContext,
      message: 'Onboarding completed successfully',
    });

  } catch (error) {
    console.error('Error in onboarding API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_INTERNAL_SERVER_ERROR }
    );
  }
}

// =============================================================================
// GET ONBOARDING STATUS
// =============================================================================

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: HTTP_UNAUTHORIZED }
      );
    }

    // Get tenant context (this will indicate if onboarding is complete)
    const tenantContext = await tenantOnboardingService.getUserTenantContext(user.id);

    // Determine onboarding status
    const hasPersonalTenant = Boolean(tenantContext.personalTenant);
    const hasProfile = Boolean((user.user_metadata?.['full_name'] as unknown) !== undefined || user.email !== null);
    const isOnboardingComplete = hasPersonalTenant;

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.['full_name'],
        created_at: user.created_at,
      },
      tenant_context: tenantContext,
      onboarding_status: {
        is_complete: isOnboardingComplete,
        has_personal_tenant: hasPersonalTenant,
        has_profile: hasProfile,
        steps_completed: {
          profile: hasProfile,
          tenant_creation: hasPersonalTenant,
        },
      },
    });

  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_INTERNAL_SERVER_ERROR }
    );
  }
} 