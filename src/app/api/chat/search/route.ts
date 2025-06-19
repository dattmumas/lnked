import { NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

interface SearchResult {
  id: string;
  content: string;
  created_at: string;
  conversation_id: string;
  conversation_title: string | null;
  sender: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  reply_to?: {
    id: string;
    content: string;
    sender: {
      id: string;
      username: string | null;
      full_name: string | null;
    };
  } | null;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const conversationId = searchParams.get('conversationId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
    }

    // Get user's conversation IDs
    const { data: userConversations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (!userConversations || userConversations.length === 0) {
      return NextResponse.json({ results: [], total: 0 });
    }

    const userConversationIds = userConversations
      .map(c => c.conversation_id)
      .filter((id): id is string => id !== null);

    // Build search query
    let searchQuery = supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        conversation_id,
        conversations!inner(id, title),
        sender:users!messages_sender_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        ),
        reply_to:messages!reply_to_id(
          id,
          content,
          sender:users!messages_sender_id_fkey(
            id,
            username,
            full_name
          )
        )
      `, { count: 'exact' })
      .textSearch('content', query)
      .in('conversation_id', userConversationIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by specific conversation if provided
    if (conversationId) {
      // Verify user has access to this conversation
      if (!userConversationIds.includes(conversationId)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      searchQuery = searchQuery.eq('conversation_id', conversationId);
    }

    const { data: messages, error: searchError, count } = await searchQuery;

    if (searchError) {
      console.error('Search error:', searchError);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    // Transform results
    const results: SearchResult[] = (messages || []).map(msg => ({
      id: msg.id,
      content: msg.content,
      created_at: msg.created_at || new Date().toISOString(),
      conversation_id: msg.conversation_id || '',
      conversation_title: msg.conversations?.title || null,
      sender: msg.sender as SearchResult['sender'],
      reply_to: msg.reply_to ? {
        id: msg.reply_to.id,
        content: msg.reply_to.content,
        sender: msg.reply_to.sender as NonNullable<SearchResult['reply_to']>['sender']
      } : null
    }));

    // Highlight search terms in results
    const highlightedResults = results.map(result => ({
      ...result,
      highlighted_content: highlightSearchTerms(result.content, query)
    }));

    return NextResponse.json({
      results: highlightedResults,
      total: count || 0,
      query,
      limit,
      offset,
      has_more: (count || 0) > offset + limit
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/chat/search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Highlight search terms in text
 */
function highlightSearchTerms(text: string, query: string): string {
  const terms = query.split(/\s+/).filter(term => term.length >= 2);
  let highlighted = text;
  
  terms.forEach(term => {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
    highlighted = highlighted.replace(regex, '<mark>$1</mark>');
  });
  
  return highlighted;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
} 