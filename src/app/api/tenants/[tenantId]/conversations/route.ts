import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { withTenantAccess, createTenantErrorResponse, createTenantSuccessResponse } from '@/lib/api/tenant-helpers';

// Schema for creating tenant conversations/channels
const createConversationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().optional(),
  type: z.enum(['channel', 'group']).default('channel'),
  is_private: z.boolean().default(false),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;

    const result = await withTenantAccess(tenantId, 'member', async (supabase, userRole) => {
      // Fetch tenant conversations/channels
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
          id,
          title,
          description,
          type,
          is_private,
          created_at,
          created_by,
          tenant_id,
          collective_id,
          participants:conversation_participants(
            user_id,
            role,
            user:users(
              id,
              username,
              full_name,
              avatar_url
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tenant conversations:', error);
        throw new Error('Failed to fetch conversations');
      }

      // Filter conversations to only show channels/groups (not direct messages)
      const channels = conversations?.filter(c => c.type === 'channel' || c.type === 'group') || [];

      return {
        channels,
        count: channels.length,
      };
    });

    if (result.error) {
      return createTenantErrorResponse(result.error, result.status);
    }

    return createTenantSuccessResponse(result.data);
  } catch (error) {
    console.error('Error in tenant conversations GET:', error);
    return createTenantErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = createConversationSchema.safeParse(body);
    if (!validationResult.success) {
      return createTenantErrorResponse('Invalid request data', 400);
    }

    const { title, description, type, is_private } = validationResult.data;

    const result = await withTenantAccess(tenantId, 'editor', async (supabase, userRole) => {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }

      // Create the conversation
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          title,
          description,
          type,
          is_private,
          tenant_id: tenantId,
          created_by: user.id,
        })
        .select(`
          id,
          title,
          description,
          type,
          is_private,
          created_at,
          created_by,
          tenant_id,
          collective_id
        `)
        .single();

      if (conversationError) {
        console.error('Error creating conversation:', conversationError);
        throw new Error('Failed to create conversation');
      }

      // Add the creator as a participant with admin role
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: user.id,
          role: 'admin',
        });

      if (participantError) {
        console.error('Error adding creator as participant:', participantError);
        // Clean up the conversation if participant creation fails
        await supabase.from('conversations').delete().eq('id', conversation.id);
        throw new Error('Failed to set up conversation permissions');
      }

      return conversation;
    });

    if (result.error) {
      return createTenantErrorResponse(result.error, result.status);
    }

    return createTenantSuccessResponse(result.data, 201);
  } catch (error) {
    console.error('Error in tenant conversations POST:', error);
    return createTenantErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
} 