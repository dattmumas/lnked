import { NextRequest, NextResponse } from 'next/server';

import {
  createTenantErrorResponse,
  createTenantSuccessResponse,
} from '@/lib/api/tenant-helpers';
import { checkTenantAccessCached } from '@/lib/cache/tenant-cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Constants
const HTTP_INTERNAL_SERVER_ERROR = 500;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; conversationId: string }> },
): Promise<NextResponse> {
  try {
    const { tenantId, conversationId } = await params;

    // Check tenant access with caching
    const access = await checkTenantAccessCached(tenantId, 'member');
    if (!access.hasAccess) {
      return createTenantErrorResponse(access.error || 'Access denied', 403);
    }

    const supabase = await createServerSupabaseClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return createTenantErrorResponse('Authentication required', 401);
    }

    // Verify the conversation belongs to this tenant
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, tenant_id, is_private')
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)
      .single();

    if (conversationError || conversation === null) {
      return createTenantErrorResponse(
        'Conversation not found in this tenant',
        404,
      );
    }

    // Check if user is already a participant
    const { data: existingParticipant } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (existingParticipant) {
      return createTenantSuccessResponse({
        message: 'Already a participant in this conversation',
      });
    }

    // Add user as participant
    const { error: participantError } = await supabase
      .from('conversation_participants')
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: 'member',
      });

    if (participantError) {
      console.error('Error adding participant:', participantError);
      return createTenantErrorResponse(
        'Failed to join conversation',
        HTTP_INTERNAL_SERVER_ERROR,
      );
    }

    return createTenantSuccessResponse({
      message: 'Successfully joined conversation',
    });
  } catch (error) {
    console.error('Error in join conversation:', error);
    return createTenantErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      HTTP_INTERNAL_SERVER_ERROR,
    );
  }
}
