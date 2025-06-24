import { NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

enum HttpStatus {
  OK = 200,
  UNAUTHORIZED = 401,
  NOT_FOUND = 404,
  FORBIDDEN = 403,
  INTERNAL = 500,
}

// POST /api/chat/[conversationId]/delete
export async function POST(
  _request: Request,
  context: { params: Promise<{ conversationId: string }> },
): Promise<NextResponse> {
  const { conversationId } = await context.params;

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HttpStatus.UNAUTHORIZED });
  }

  // Ensure the participant row exists
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .single();

  if (participant === null) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: HttpStatus.NOT_FOUND });
  }

  const { error } = await supabase
    .from('conversation_participants')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ deleted_at: new Date().toISOString() } as any)
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);

  if (error !== null) {
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: HttpStatus.INTERNAL });
  }

  return NextResponse.json({ success: true }, { status: HttpStatus.OK });
} 