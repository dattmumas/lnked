import { NextRequest, NextResponse } from 'next/server';

import { commentsV2Service } from '@/lib/services/comments-v2';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CommentEntityType, CommentValidationError, CommentPermissionError } from '@/types/comments-v2';

// Constants for validation
const DEFAULT_COMMENT_LIMIT = 20;
const DEFAULT_COMMENT_OFFSET = 0;
const MAX_COMMENT_LIMIT = 100;
const MIN_COMMENT_LIMIT = 1;

// Valid entity types
const VALID_ENTITY_TYPES = ['video', 'post', 'collective', 'profile'] as const;

interface CommentRequestBody {
  content?: unknown;
  parent_id?: unknown;
}

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
): Promise<NextResponse> {
  try {
    const { entityType, entityId } = await params;
    const { searchParams } = new URL(request.url);
    
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const limit = parseInt(limitParam ?? String(DEFAULT_COMMENT_LIMIT), 10);
    const offset = parseInt(offsetParam ?? String(DEFAULT_COMMENT_OFFSET), 10);
    
    if (!VALID_ENTITY_TYPES.includes(entityType as typeof VALID_ENTITY_TYPES[number])) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
    }

    if (limit < MIN_COMMENT_LIMIT || limit > MAX_COMMENT_LIMIT) {
      return NextResponse.json({ error: `Limit must be between ${MIN_COMMENT_LIMIT} and ${MAX_COMMENT_LIMIT}` }, { status: 400 });
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in GET /api/comments-v2:', errorMessage);
    if (error instanceof CommentValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
): Promise<NextResponse> {
  try {
    const { entityType, entityId } = await params;
    
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (!VALID_ENTITY_TYPES.includes(entityType as typeof VALID_ENTITY_TYPES[number])) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
    }

    const body: CommentRequestBody = await request.json() as CommentRequestBody;
    const { content, parent_id } = body;

    if (content === null || content === undefined || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const parentId = parent_id !== null && parent_id !== undefined && typeof parent_id === 'string' 
      ? parent_id 
      : undefined;

    const result = await commentsV2Service.addComment(
      entityType as CommentEntityType,
      entityId,
      user.id,
      content,
      parentId,
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