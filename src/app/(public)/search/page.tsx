import { createServerSupabaseClient } from '@/lib/supabase/server';
import PostCard from '@/components/app/posts/molecules/PostCard';
import CollectiveCard from '@/components/app/dashboard/collectives/CollectiveCard';
import { Button } from '@/components/ui/button';
import type { Database } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const { q: queryParam } = await searchParams;
  const q = queryParam?.trim();

  type PostCardData = {
    id: string;
    title: string;
    content: string | null;
    meta_description: string | null;
    thumbnail_url: string | null;
    slug?: string | null;
    created_at: string;
    post_type: Database['public']['Enums']['post_type_enum'];
    metadata: Record<string, unknown> | null;
    like_count: number;
    dislike_count: number;
    collective_slug: string | null;
    current_user_has_liked?: boolean;
    author: {
      id: string;
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
    };
    collective: {
      id: string;
      name: string;
      slug: string;
    } | null;
  };

  type UserResult = Pick<
    Database['public']['Tables']['users']['Row'],
    'id' | 'full_name' | 'bio' | 'avatar_url' | 'username'
  >;

  type CollectiveResult = Pick<
    Database['public']['Tables']['collectives']['Row'],
    'id' | 'name' | 'slug' | 'description' | 'tags'
  >;

  type PostQueryRow = {
    id: string;
    title: string;
    content: string | null;
    meta_description: string | null;
    thumbnail_url: string | null;
    slug?: string | null;
    created_at: string;
    post_type: Database['public']['Enums']['post_type_enum'];
    metadata: Record<string, unknown> | null;
    like_count?: number | null;
    dislike_count?: number | null;
    author?: {
      id: string;
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
    collective?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  };

  let posts: PostCardData[] = [];
  let users: UserResult[] = [];
  let collectives: CollectiveResult[] = [];

  if (q && q.length > 0) {
    // Search posts using ilike for title and subtitle
    const { data: postsData } = await supabase
      .from('posts')
      .select(
        `
        *,
        author:users!author_id (
          id,
          username,
          full_name,
          avatar_url
        ),
        collective:collectives!posts_collective_id_fkey (
          id,
          name,
          slug
        )
      `,
      )
      .eq('is_public', true)
      .not('published_at', 'is', null)
      .or(`title.ilike.%${q}%,subtitle.ilike.%${q}%,content.ilike.%${q}%`)
      .order('published_at', { ascending: false })
      .limit(20);

    posts =
      (postsData as PostQueryRow[] | null)?.map((p) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        meta_description: p.meta_description,
        thumbnail_url: p.thumbnail_url,
        slug: (p as { slug?: string }).slug ?? null,
        created_at: p.created_at,
        post_type: p.post_type,
        metadata: p.metadata,
        like_count: p.like_count ?? 0,
        dislike_count: p.dislike_count ?? 0,
        collective_slug: p.collective?.slug ?? null,
        current_user_has_liked: undefined,
        author: {
          id: p.author?.id || '',
          username: p.author?.username || null,
          full_name: p.author?.full_name || null,
          avatar_url: p.author?.avatar_url || null,
        },
        collective: p.collective
          ? {
              id: p.collective.id,
              name: p.collective.name,
              slug: p.collective.slug,
            }
          : null,
      })) || [];

    // Search users using ilike for username and full_name
    const { data: usersData } = await supabase
      .from('users')
      .select('id, username, full_name, bio, avatar_url')
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%,bio.ilike.%${q}%`)
      .limit(20);

    users = (usersData as UserResult[] | null) || [];

    // Search collectives using ilike for name and description
    const { data: collectivesData } = await supabase
      .from('collectives')
      .select('id, name, slug, description, tags')
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      .limit(20);

    collectives = (collectivesData as CollectiveResult[] | null) || [];
  }

  const noResults =
    q && posts.length === 0 && users.length === 0 && collectives.length === 0;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">
          Search Results{q ? ` for "${q}"` : ''}
        </h1>
        <form action="" className="flex items-center gap-2 max-w-md">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search..."
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
          />
          <Button type="submit" size="sm" variant="outline">
            Search
          </Button>
        </form>
      </div>

      {posts.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Posts</h2>
          <div className="grid gap-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={{
                  id: post.id,
                  title: post.title,
                  content: post.content,
                  meta_description: post.meta_description,
                  thumbnail_url: post.thumbnail_url,
                  slug: post.slug ?? null,
                  created_at: post.created_at,
                  post_type: (post.post_type as 'text' | 'video') || 'text',
                  metadata: post.metadata,
                  author: post.author,
                  collective: post.collective,
                }}
                interactions={{
                  isLiked: false,
                  isDisliked: false,
                  isBookmarked: false,
                  likeCount: post.like_count || 0,
                  dislikeCount: post.dislike_count || 0,
                  commentCount: 0,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {users.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Users</h2>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
              >
                {user.avatar_url && (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name || user.username || 'User'}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {user.full_name || user.username || 'Unnamed User'}
                    </span>
                    {user.username && (
                      <span className="text-sm text-muted-foreground">
                        @{user.username}
                      </span>
                    )}
                  </div>
                  {user.bio && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {user.bio}
                    </p>
                  )}
                  {user.username && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      asChild
                    >
                      <a href={`/profile/${user.username}`}>View Profile</a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {collectives.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Collectives</h2>
          <div className="grid gap-4">
            {collectives.map((c) => (
              <CollectiveCard key={c.id} collective={c} />
            ))}
          </div>
        </div>
      )}

      {noResults && <p>No results found.</p>}
    </div>
  );
}
