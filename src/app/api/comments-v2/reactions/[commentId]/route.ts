import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';


// Constants for HTTP status codes
const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_SERVER_ERROR = 500;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
): Promise<NextResponse> {
  try {
    const { commentId } = await params;
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

    // Parse request body
    const body = await request.json() as { reaction_type?: unknown };
    const { reaction_type } = body;

    // Validate reaction type
    const validReactionTypes = ['like', 'heart', 'laugh', 'angry', 'sad', 'wow', 'dislike'] as const;
    if (typeof reaction_type !== 'string' || !validReactionTypes.includes(reaction_type as typeof validReactionTypes[number])) {
      return NextResponse.json(
        { error: 'Invalid reaction type' },
        { status: HTTP_BAD_REQUEST }
      );
    }

    const validatedReactionType = reaction_type as typeof validReactionTypes[number];

    // Check if comment exists
    const { data: commentData, error: commentError } = await supabase
      .from('comments')
      .select('id')
      .eq('id', commentId)
      .single();

    if (commentError !== null || commentData === null) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: HTTP_NOT_FOUND }
      );
    }

    // Check if user already reacted with this type
    const { data: existingReaction } = await supabase
      .from('comment_reactions')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .eq('reaction_type', validatedReactionType)
      .single();

    if (existingReaction !== null) {
      // Remove existing reaction (toggle off)
      const { error: deleteError } = await supabase
        .from('comment_reactions')
        .delete()
        .eq('id', existingReaction.id);

      if (deleteError !== null) {
        console.error('Error removing reaction:', deleteError);
        return NextResponse.json(
          { error: 'Failed to remove reaction' },
          { status: HTTP_INTERNAL_SERVER_ERROR }
        );
      }

      return NextResponse.json(
        { message: 'Reaction removed successfully' },
        { status: HTTP_OK }
      );
    } else {
      // Add new reaction
      const { data: newReaction, error: insertError } = await supabase
        .from('comment_reactions')
        .insert({
          comment_id: commentId,
          user_id: user.id,
          reaction_type: validatedReactionType,
        })
        .select()
        .single();

      if (insertError !== null) {
        console.error('Error adding reaction:', insertError);
        return NextResponse.json(
          { error: 'Failed to add reaction' },
          { status: HTTP_INTERNAL_SERVER_ERROR }
        );
      }

      return NextResponse.json(
        { 
          message: 'Reaction added successfully',
          reaction: newReaction
        },
        { status: HTTP_CREATED }
      );
    }
  } catch (error: unknown) {
    console.error('Error in POST /api/comments-v2/reactions/[commentId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_INTERNAL_SERVER_ERROR }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
): Promise<NextResponse> {
  try {
    const { commentId } = await params;
    const supabase = await createServerSupabaseClient();

    // Get the current user (optional for GET)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get all reactions for this comment
    const { data: reactions, error: reactionsError } = await supabase
      .from('comment_reactions')
      .select(`
        id,
        reaction_type,
        created_at,
        user:users(id, username, full_name, avatar_url)
      `)
      .eq('comment_id', commentId)
      .order('created_at', { ascending: true });

    if (reactionsError !== null) {
      console.error('Error fetching reactions:', reactionsError);
      return NextResponse.json(
        { error: 'Failed to fetch reactions' },
        { status: HTTP_INTERNAL_SERVER_ERROR }
      );
    }

    // Group reactions by type and count them
    const reactionCounts: Record<string, number> = {};
    const userReaction = reactions?.find(r => r.user?.id === user?.id)?.reaction_type || null;

    reactions?.forEach(reaction => {
      if (reaction.reaction_type) {
        reactionCounts[reaction.reaction_type] = (reactionCounts[reaction.reaction_type] || 0) + 1;
      }
    });

    return NextResponse.json(
      { 
        reactions: reactions || [],
        reactionCounts,
        userReaction
      },
      { status: HTTP_OK }
    );
  } catch (error: unknown) {
    console.error('Error in GET /api/comments-v2/reactions/[commentId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_INTERNAL_SERVER_ERROR }
    );
  }
}
