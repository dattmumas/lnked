import { NextRequest, NextResponse } from 'next/server';
import { commentsV2Service } from '@/lib/services/comments-v2';
import { CommentReactionType, CommentValidationError, CommentPermissionError, CommentNotFoundError } from '@/types/comments-v2';

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params;
    const body = await request.json();
    const { reaction_type } = body;

    if (!reaction_type || !['like', 'heart', 'laugh', 'angry', 'sad', 'wow'].includes(reaction_type)) {
      return NextResponse.json(
        { error: 'Valid reaction_type is required' }, 
        { status: 400 }
      );
    }

    const result = await commentsV2Service.toggleReaction({
      comment_id: commentId,
      reaction_type: reaction_type as CommentReactionType
    });

    return NextResponse.json(result);

  } catch (error) {
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