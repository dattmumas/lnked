import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';


// Constants for HTTP status codes
const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_SERVER_ERROR = 500;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
): Promise<NextResponse> {
  try {
    const { conversationId } = await params;
    const supabase = await createServerSupabaseClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: HTTP_UNAUTHORIZED }
      );
    }

    // Check if user is a participant in the conversation
    const { data: participantData, error: participantError } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (participantError !== null || participantData === null) {
      return NextResponse.json(
        { error: 'You are not a participant in this conversation' },
        { status: HTTP_FORBIDDEN }
      );
    }

    // Get conversation details to check ownership
    const { data: conversationData, error: conversationError } = await supabase
      .from('conversations')
      .select('created_by, type')
      .eq('id', conversationId)
      .single();

    if (conversationError !== null || conversationData === null) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: HTTP_NOT_FOUND }
      );
    }

    // Only allow deletion by conversation creator or admin participants
    const canDelete = 
      conversationData.created_by === user.id || 
      participantData.role === 'admin';

    if (!canDelete) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this conversation' },
        { status: HTTP_FORBIDDEN }
      );
    }

    // Delete the conversation (this will cascade to participants and messages)
    const { error: deleteError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (deleteError !== null) {
      console.error('Error deleting conversation:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete conversation' },
        { status: HTTP_INTERNAL_SERVER_ERROR }
      );
    }

    return NextResponse.json(
      { message: 'Conversation deleted successfully' },
      { status: HTTP_OK }
    );
  } catch (error: unknown) {
    console.error('Error in DELETE /api/chat/[conversationId]/delete:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_INTERNAL_SERVER_ERROR }
    );
  }
} 