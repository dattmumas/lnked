import { NextRequest, NextResponse } from 'next/server';

import { withTenantAccess, createTenantErrorResponse, createTenantSuccessResponse } from '@/lib/api/tenant-helpers';

// Constants
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
        .select('id, tenant_id, is_private')
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .single();

      if (conversationError || conversation === null) {
        throw new Error('Conversation not found in this tenant');
      }

      // Check if user is already a participant
      const { data: existingParticipant } = await supabase
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .single();

      if (existingParticipant) {
        return { message: 'Already a participant in this conversation' };
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
        throw new Error('Failed to join conversation');
      }

      return { message: 'Successfully joined conversation' };
    });

    if (result.error !== null && result.error !== undefined) {
      return createTenantErrorResponse(result.error, result.status);
    }

    return createTenantSuccessResponse(result.data);
  } catch (error) {
    console.error('Error in join conversation:', error);
    return createTenantErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      HTTP_INTERNAL_SERVER_ERROR
    );
  }
} 