/* eslint-disable no-magic-numbers */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createServerSupabaseClient } from '@/lib/supabase/server';

const enum HttpStatus {
  OK = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

const MESSAGE_MAX_LENGTH = 10000;

// Schema for updating a message
const UpdateMessageSchema = z.object({
  content: z.string().trim().min(1, 'Message content is required').max(MESSAGE_MAX_LENGTH),
});

// PUT /api/chat/[conversationId]/messages/[messageId] - Update a message
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string; messageId: string }> }
): Promise<NextResponse> {
  const { conversationId, messageId } = await context.params;
  
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HttpStatus.UNAUTHORIZED });
  }

  // Validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: HttpStatus.BAD_REQUEST });
  }

  const parseResult = UpdateMessageSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.errors[0].message },
      { status: HttpStatus.BAD_REQUEST }
    );
  }

  const { content } = parseResult.data;

  // Check if the message exists and belongs to the user
  const { data: message, error: messageError } = await supabase
    .from('messages')
    .select('id, sender_id')
    .eq('id', messageId)
    .eq('conversation_id', conversationId)
    .single();

  if (messageError !== null || message === null) {
    return NextResponse.json({ error: 'Message not found' }, { status: HttpStatus.NOT_FOUND });
  }

  // Only the sender can edit their own message
  if (message.sender_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: HttpStatus.FORBIDDEN });
  }

  // Update the message
  const { data: updatedMessage, error: updateError } = await supabase
    .from('messages')
    .update({
      content,
      edited_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .select('id, content, edited_at')
    .single();

  if (updateError !== null || updatedMessage === null) {
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: HttpStatus.INTERNAL_SERVER_ERROR }
    );
  }

  return NextResponse.json(updatedMessage);
}

// DELETE /api/chat/[conversationId]/messages/[messageId] - Delete a message
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string; messageId: string }> }
): Promise<NextResponse> {
  const { conversationId, messageId } = await context.params;
  
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HttpStatus.UNAUTHORIZED });
  }

  // Check if the message exists and get sender info
  const { data: message, error: messageError } = await supabase
    .from('messages')
    .select('id, sender_id, conversation_id')
    .eq('id', messageId)
    .eq('conversation_id', conversationId)
    .single();

  if (messageError !== null || message === null) {
    return NextResponse.json({ error: 'Message not found' }, { status: HttpStatus.NOT_FOUND });
  }

  // Check if user is the sender or an admin of the conversation
  // For now, only allow message authors to delete their own messages
  // TODO: Add admin/moderator check when role system is implemented
  if (message.sender_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: HttpStatus.FORBIDDEN });
  }

  // Soft delete the message by setting deleted_at
  const { error: deleteError } = await supabase
    .from('messages')
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq('id', messageId);

  if (deleteError !== null) {
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: HttpStatus.INTERNAL_SERVER_ERROR }
    );
  }

  return NextResponse.json({ success: true });
} 