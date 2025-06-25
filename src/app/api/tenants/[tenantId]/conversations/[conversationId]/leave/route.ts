import { NextRequest, NextResponse } from 'next/server';

import { withTenantAccess, createTenantErrorResponse, createTenantSuccessResponse } from '@/lib/api/tenant-helpers';

const HTTP_INTERNAL_SERVER_ERROR = 500;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; conversationId: string }> }
): Promise<NextResponse> {
  try {
    const { tenantId, conversationId } = await params;

    const result = await withTenantAccess(tenantId, 'member', async (supabase, _userRole) => {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }

      // Verify the conversation belongs to this tenant
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .select('id, tenant_id, created_by')
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .single();

      if (conversationError || !conversation) {
        throw new Error('Conversation not found in this tenant');
      }

      // Prevent conversation creator from leaving (they should delete instead)
      if (conversation.created_by === user.id) {
        throw new Error('Conversation creator cannot leave. Delete the conversation instead.');
      }

      // Remove user from participants
      const { error: removeError } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      if (removeError) {
        console.error('Error removing participant:', removeError);
        throw new Error('Failed to leave conversation');
      }

      return { message: 'Successfully left conversation' };
    });

    if (result.error) {
      return createTenantErrorResponse(result.error, result.status);
    }

    return createTenantSuccessResponse(result.data);
  } catch (error) {
    console.error('Error in leave conversation:', error);
    return createTenantErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
} 