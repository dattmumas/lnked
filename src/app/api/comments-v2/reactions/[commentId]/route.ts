import { NextRequest, NextResponse } from 'next/server';

import { commentsV2Service } from '@/lib/services/comments-v2';
import { ReactionType, CommentValidationError, CommentPermissionError, CommentNotFoundError } from '@/types/comments-v2';

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ commentId: string }> }
): Promise<NextResponse> {
  try {
    const { commentId } = await params;
    const body: { reaction_type?: unknown } = await request.json() as { reaction_type?: unknown };
    const { reaction_type } = body;

    if (reaction_type === null || reaction_type === undefined || 
        typeof reaction_type !== 'string' || 
        !['like', 'dislike'].includes(reaction_type)) {
      return NextResponse.json(
        { error: 'Valid reaction_type is required' }, 
        { status: 400 }
      );
    }

    const result = await commentsV2Service.toggleReaction(
      commentId,
      '',
      reaction_type as ReactionType,
    );

    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error('Error in POST /api/comments-v2/reactions:', error);
    
    if (error instanceof CommentValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    if (error instanceof CommentPermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    if (error instanceof CommentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Failed to toggle reaction' }, { status: 500 });
  }
}
