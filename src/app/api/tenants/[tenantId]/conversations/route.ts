// Tenant-Scoped Conversations API Route
// Provides tenant-isolated conversation management with proper access control

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { withTenantAccess, createTenantErrorResponse, createTenantSuccessResponse } from '@/lib/api/tenant-helpers';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const CreateConversationSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  type: z.enum(['direct', 'group', 'channel']).default('group'),
  description: z.string().max(500).optional(),
  is_private: z.boolean().default(false),
  participant_ids: z.array(z.string().uuid()).default([]),
});

// =============================================================================
// GET TENANT CONVERSATIONS
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;

    // Execute with tenant access validation
    const result = await withTenantAccess(
      tenantId,
      'member', // Any member can view conversations
      async (supabase, userRole) => {
        // Use the new RPC to get tenant-scoped conversations
        const { data: conversations, error } = await supabase.rpc('get_tenant_conversations', {
          target_tenant_id: tenantId,
        });

        if (error) {
          throw new Error(`Failed to fetch conversations: ${error.message}`);
        }

        // Get detailed participant information for each conversation
        const conversationIds = conversations?.map((c: any) => c.id) || [];
        
        if (conversationIds.length === 0) {
          return {
            conversations: [],
            meta: {
              tenant_id: tenantId,
              user_role: userRole,
              total: 0,
            },
          };
        }

        // Fetch participants for all conversations
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select(`
            conversation_id,
            user_id,
            role,
            user:users!conversation_participants_user_id_fkey(
              id,
              username,
              full_name,
              avatar_url
            )
          `)
          .in('conversation_id', conversationIds)
          .is('deleted_at', null);

        // Fetch last messages for all conversations
        const { data: lastMessages } = await supabase
          .from('messages')
          .select(`
            id,
            conversation_id,
            content,
            created_at,
            sender:users!messages_sender_id_fkey(
              id,
              username,
              full_name,
              avatar_url
            )
          `)
          .in('conversation_id', conversationIds)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        // Group participants and messages by conversation
        const participantsMap = new Map();
        participants?.forEach(p => {
          if (!participantsMap.has(p.conversation_id)) {
            participantsMap.set(p.conversation_id, []);
          }
          participantsMap.get(p.conversation_id).push({
            user_id: p.user_id,
            role: p.role,
            user: p.user,
          });
        });

        const lastMessagesMap = new Map();
        lastMessages?.forEach(msg => {
          if (!lastMessagesMap.has(msg.conversation_id)) {
            lastMessagesMap.set(msg.conversation_id, {
              id: msg.id,
              content: msg.content,
              created_at: msg.created_at,
              sender: msg.sender,
            });
          }
        });

        // Enhance conversations with participant and message data
        const enhancedConversations = conversations?.map((conv: any) => ({
          ...conv,
          participants: participantsMap.get(conv.id) || [],
          last_message: lastMessagesMap.get(conv.id) || null,
        }));

        return {
          conversations: enhancedConversations,
          meta: {
            tenant_id: tenantId,
            user_role: userRole,
            total: conversations?.length || 0,
          },
        };
      }
    );

    if (result.error) {
      return createTenantErrorResponse(result.error, result.status);
    }

    return createTenantSuccessResponse(result.data);

  } catch (error) {
    console.error('Error fetching tenant conversations:', error);
    return createTenantErrorResponse('Internal server error', 500);
  }
}

// =============================================================================
// CREATE TENANT CONVERSATION
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;
    const body = await request.json();
    
    // Validate request body
    const validationResult = CreateConversationSchema.safeParse(body);
    if (!validationResult.success) {
      return createTenantErrorResponse(
        `Invalid request data: ${validationResult.error.message}`,
        400
      );
    }

    const { title, type, description, is_private, participant_ids } = validationResult.data;

    // Validate participants for conversation type
    if (type === 'direct' && participant_ids.length !== 1) {
      return createTenantErrorResponse(
        'Direct conversations must have exactly one other participant',
        400
      );
    }

    if (type === 'group' && participant_ids.length < 1) {
      return createTenantErrorResponse(
        'Group conversations must have at least one other participant',
        400
      );
    }

    // Execute with tenant access validation
    const result = await withTenantAccess(
      tenantId,
      'member', // Any member can create conversations
      async (supabase, userRole) => {
        // Check for existing direct conversation if type is direct
        if (type === 'direct') {
          const { data: existingConversations } = await supabase.rpc('get_tenant_conversations', {
            target_tenant_id: tenantId,
          });

                     const existingDirectConv = existingConversations?.find((conv: any) => {
             return conv.type === 'direct' && 
                    conv.participant_count === 2; // Direct convs should have exactly 2 participants
           });

          if (existingDirectConv) {
            return {
              conversation: existingDirectConv,
              existing: true,
              message: 'Direct conversation already exists',
            };
          }
        }

        // Create conversation using RPC
        const { data: newConversation, error } = await supabase.rpc('create_tenant_conversation', {
          target_tenant_id: tenantId,
          conversation_title: title || null,
          conversation_type: type,
          conversation_description: description || null,
          is_private_conversation: is_private,
          participant_user_ids: participant_ids,
        });

        if (error) {
          throw new Error(`Failed to create conversation: ${error.message}`);
        }

        if (!newConversation || newConversation.length === 0) {
          throw new Error('No conversation returned from creation');
        }

        const conversation = newConversation[0];

        return {
          conversation,
          existing: false,
          message: 'Conversation created successfully',
        };
      }
    );

    if (result.error) {
      return createTenantErrorResponse(result.error, result.status);
    }

    return createTenantSuccessResponse(result.data, 201);

  } catch (error) {
    console.error('Error creating tenant conversation:', error);
    return createTenantErrorResponse('Internal server error', 500);
  }
} 