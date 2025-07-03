import { NextRequest, NextResponse } from 'next/server';

import {
  createTenantErrorResponse,
  createTenantSuccessResponse,
} from '@/lib/api/tenant-helpers';
import { checkTenantAccessCached } from '@/lib/cache/tenant-cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
      .select('id, tenant_id, created_by')
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)
      .single();

    if (conversationError || !conversation) {
      return createTenantErrorResponse(
        'Conversation not found in this tenant',
        404,
      );
    }

    // Prevent conversation creator from leaving (they should delete instead)
    if (conversation.created_by === user.id) {
      return createTenantErrorResponse(
        'Conversation creator cannot leave. Delete the conversation instead.',
        400,
      );
    }

    // Remove user from participants
    const { error: removeError } = await supabase
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    if (removeError) {
      console.error('Error removing participant:', removeError);
      return createTenantErrorResponse(
        'Failed to leave conversation',
        HTTP_INTERNAL_SERVER_ERROR,
      );
    }

    return createTenantSuccessResponse({
      message: 'Successfully left conversation',
    });
  } catch (error) {
    console.error('Error in leave conversation:', error);
    return createTenantErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500,
    );
  }
}
