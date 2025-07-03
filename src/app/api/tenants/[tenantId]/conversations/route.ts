// Tenant-Scoped Conversations API Route
// Provides tenant-isolated conversation management with proper access control

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createTenantErrorResponse,
  createTenantSuccessResponse,
} from '@/lib/api/tenant-helpers';
import { checkTenantAccessCached } from '@/lib/cache/tenant-cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface TenantConversation {
  id: string;
  title: string | null;
  type: 'direct' | 'group' | 'channel';
  description: string | null;
  is_private: boolean;
  participant_count: number;
  created_at: string;
  updated_at: string;
}

interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  role: string;
  user: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface LastMessage {
  id: string;
  conversation_id: string;
  content: string;
  created_at: string;
  sender: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

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
  { params }: { params: Promise<{ tenantId: string }> },
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;

    // Check tenant access with caching
    const access = await checkTenantAccessCached(tenantId, 'member');
    if (!access.hasAccess) {
      return createTenantErrorResponse(access.error || 'Access denied', 403);
    }

    const supabase = await createServerSupabaseClient();

    // Use the new RPC to get tenant-scoped conversations
    const { data: conversations, error } = await supabase.rpc(
      'get_tenant_conversations',
      {
        target_tenant_id: tenantId,
      },
    );

    if (error) {
      throw new Error(`Failed to fetch conversations: ${error.message}`);
    }

    const typedConversations = conversations as TenantConversation[] | null;

    // Get detailed participant information for each conversation
    const conversationIds = typedConversations?.map((c) => c.id) || [];

    if (conversationIds.length === 0) {
      return createTenantSuccessResponse({
        conversations: [],
        meta: {
          tenant_id: tenantId,
          user_role: access.userRole,
          total: 0,
        },
      });
    }

    // Fetch participants for all conversations
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select(
        `
            conversation_id,
            user_id,
            role,
            user:users!conversation_participants_user_id_fkey(
              id,
              username,
              full_name,
              avatar_url
            )
      `,
      )
      .in('conversation_id', conversationIds)
      .is('deleted_at', null);

    // Fetch last messages for all conversations
    const { data: lastMessages } = await supabase
      .from('messages')
      .select(
        `
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
    `,
      )
      .in('conversation_id', conversationIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    const typedParticipants = participants as ConversationParticipant[] | null;
    const typedLastMessages = lastMessages as LastMessage[] | null;

    // Group participants and messages by conversation
    const participantsMap = new Map<
      string,
      Omit<ConversationParticipant, 'conversation_id'>[]
    >();
    typedParticipants?.forEach((p) => {
      if (!participantsMap.has(p.conversation_id)) {
        participantsMap.set(p.conversation_id, []);
      }
      participantsMap.get(p.conversation_id)?.push({
        user_id: p.user_id,
        role: p.role,
        user: p.user,
      });
    });

    const lastMessagesMap = new Map<
      string,
      Omit<LastMessage, 'conversation_id'>
    >();
    typedLastMessages?.forEach((msg) => {
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
    const enhancedConversations = typedConversations?.map((conv) => ({
      ...conv,
      participants: participantsMap.get(conv.id) || [],
      last_message: lastMessagesMap.get(conv.id) || null,
    }));

    return createTenantSuccessResponse({
      conversations: enhancedConversations,
      meta: {
        tenant_id: tenantId,
        user_role: access.userRole,
        total: typedConversations?.length || 0,
      },
    });
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
  { params }: { params: Promise<{ tenantId: string }> },
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = CreateConversationSchema.safeParse(body);
    if (!validationResult.success) {
      return createTenantErrorResponse(
        `Invalid request data: ${validationResult.error.message}`,
        400,
      );
    }

    const { title, type, description, is_private, participant_ids } =
      validationResult.data;

    // Validate participants for conversation type
    if (type === 'direct' && participant_ids.length !== 1) {
      return createTenantErrorResponse(
        'Direct conversations must have exactly one other participant',
        400,
      );
    }

    if (type === 'group' && participant_ids.length < 1) {
      return createTenantErrorResponse(
        'Group conversations must have at least one other participant',
        400,
      );
    }

    // Check tenant access with caching
    const access = await checkTenantAccessCached(tenantId, 'member');
    if (!access.hasAccess) {
      return createTenantErrorResponse(access.error || 'Access denied', 403);
    }

    const supabase = await createServerSupabaseClient();

    // Check for existing direct conversation if type is direct
    if (type === 'direct') {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return createTenantErrorResponse('Authentication required', 401);
      }

      const otherUserId = participant_ids[0]; // Direct conversations have exactly 1 other participant

      // Use the safe function to find or create direct conversation
      const { data: conversationId, error: findError } = await supabase.rpc(
        'find_or_create_direct_conversation',
        {
          user1_id: user.id,
          user2_id: otherUserId!,
          target_tenant_id: tenantId,
        },
      );

      if (findError) {
        throw new Error(
          `Failed to find/create direct conversation: ${findError.message}`,
        );
      }

      // Fetch the conversation details
      const { data: fullConversation } = await supabase.rpc(
        'get_tenant_conversations',
        {
          target_tenant_id: tenantId,
        },
      );

      const typedConversations = fullConversation as
        | TenantConversation[]
        | null;
      const conversation = typedConversations?.find(
        (conv) => conv.id === conversationId,
      );

      if (!conversation) {
        throw new Error('Conversation not found after creation');
      }

      // Fetch participants for the conversation
      const { data: rawParticipants } = await supabase
        .from('conversation_participants')
        .select(
          `
              user_id,
              role,
              user:users!conversation_participants_user_id_fkey(
                id,
                username,
                full_name,
                avatar_url
              )
        `,
        )
        .eq('conversation_id', conversation.id)
        .is('deleted_at', null);

      const participants = (rawParticipants ?? []).map((p) => ({
        user_id: p.user_id,
        role: p.role,
        user: p.user,
      }));

      return createTenantSuccessResponse(
        {
          conversation: {
            ...conversation,
            participants,
            last_message: null,
          },
          existing: true, // Could be existing or newly created
          message: 'Direct conversation ready',
        },
        201,
      );
    }

    // For non-direct conversations (groups, channels), use the RPC
    const { data: newConversation, error } = await supabase.rpc(
      'create_tenant_conversation',
      {
        target_tenant_id: tenantId,
        conversation_title: title || '',
        conversation_type: type,
        conversation_description: description || '',
        is_private_conversation: is_private,
        participant_user_ids: participant_ids,
      },
    );

    if (error) {
      throw new Error(`Failed to create conversation: ${error.message}`);
    }

    const typedNewConversation = newConversation as unknown as
      | TenantConversation[]
      | null;

    if (!typedNewConversation || typedNewConversation.length === 0) {
      throw new Error('No conversation returned from creation');
    }

    const newConv = typedNewConversation[0]!;

    /* ------------------------------------------------------------------
     * Fetch participants so the client immediately receives a hydrated
     * conversation object (id, title, participants, etc.).
     * ------------------------------------------------------------------ */
    const { data: rawParticipants } = await supabase
      .from('conversation_participants')
      .select(
        `
            user_id,
            role,
            user:users!conversation_participants_user_id_fkey(
              id,
              username,
              full_name,
              avatar_url
            )
      `,
      )
      .eq('conversation_id', newConv.id)
      .is('deleted_at', null);

    const participants = (rawParticipants ?? []).map((p) => ({
      user_id: p.user_id,
      role: p.role,
      user: p.user,
    }));

    return createTenantSuccessResponse(
      {
        conversation: {
          ...newConv,
          participants,
          last_message: null,
        },
        existing: false,
        message: 'Conversation created successfully',
      },
      201,
    );
  } catch (error) {
    console.error('Error creating tenant conversation:', error);
    return createTenantErrorResponse('Internal server error', 500);
  }
}
