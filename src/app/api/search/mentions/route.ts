import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check for the @username/postname format
    if (query.includes('/')) {
      const [username, postQuery] = query.split('/');

      if (!username || !postQuery) {
        return NextResponse.json(
          { error: 'Invalid mention format' },
          { status: 400 },
        );
      }

      // Find the user first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (userError || !userData) {
        return NextResponse.json([]); // No user found, so no posts to return
      }

      // Now search for posts by that user
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, published_at, author:users!author_id(username)')
        .eq('author_id', userData.id)
        .eq('is_public', true) // Only public posts
        .eq('status', 'active') // Only active posts
        .ilike('title', `%${postQuery}%`)
        .order('published_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      // Tag results to identify them as posts on the client
      return NextResponse.json(
        data?.map((p) => ({
          id: p.id,
          title: p.title,
          published_at: p.published_at,
          username: p.author?.username, // Extract the username
          type: 'post',
        })) ?? [],
      );
    }

    // If no slash, search for users only
    const { data, error } = await supabase
      .from('users')
      .select('id, username, full_name, avatar_url')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(5);

    if (error) throw error;
    // Tag results to identify them as users on the client
    return NextResponse.json(data?.map((u) => ({ ...u, type: 'user' })) ?? []);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
