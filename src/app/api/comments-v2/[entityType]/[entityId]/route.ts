import { NextRequest, NextResponse } from 'next/server';

import { commentsV2Service } from '@/lib/services/comments-v2';
import { CommentEntityType, CommentValidationError, CommentPermissionError } from '@/types/comments-v2';

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  try {
    const { entityType, entityId } = await params;
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (!['video', 'post', 'collective', 'profile'].includes(entityType)) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Limit must be between 1 and 100' }, { status: 400 });
    }

    const comments = await commentsV2Service.getComments(
      entityType as CommentEntityType,
      entityId,
      offset / limit + 1,
      limit,
    );

    return NextResponse.json({
      comments,
      pagination: { limit, offset, has_more: comments.length === limit }
    });

  } catch (error: unknown) {
    console.error('Error in GET /api/comments-v2:', error);
    if (error instanceof CommentValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  try {
    const { entityType, entityId } = await params;
    
    if (!['video', 'post', 'collective', 'profile'].includes(entityType)) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
    }

    const body = await request.json();
    const { content, parent_id } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const result = await commentsV2Service.addComment(
      entityType as CommentEntityType,
      entityId,
      '',
      content,
      parent_id || undefined,
    );

    return NextResponse.json(result, { status: 201 });

  } catch (error: unknown) {
    console.error('Error in POST /api/comments-v2:', error);
    if (error instanceof CommentValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof CommentPermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
} 