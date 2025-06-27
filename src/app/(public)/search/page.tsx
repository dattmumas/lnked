import CollectiveCard from '@/components/app/dashboard/collectives/CollectiveCard';
import PostCard from '@/components/app/posts/molecules/PostCard';
import { Button } from '@/components/ui/button';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { buildWebsearchQuery, escapeLike } from '@/lib/utils/search';

import type { Database } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

// Constants for configuration
const MIN_FTS_LENGTH = 3;
const RESULTS_LIMIT = 20;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<React.JSX.Element> {
  const supabase = await createServerSupabaseClient();
  const { q: queryParam } = await searchParams;
  const rawQ = queryParam?.trim() ?? '';
  const q = rawQ;
  const tsQuery = buildWebsearchQuery(rawQ);
  const useFTS = tsQuery.length >= MIN_FTS_LENGTH;

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

  if (q !== null && q !== undefined && q.length > 0) {
    let postQuery = supabase
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
      .not('published_at', 'is', null);

    if (useFTS) {
      postQuery = postQuery.textSearch('tsv', tsQuery, { type: 'websearch' });
    } else {
      postQuery = postQuery.or(
        `title.ilike.%${escapeLike(q)}%,subtitle.ilike.%${escapeLike(q)}%,content.ilike.%${escapeLike(q)}%`,
      );
    }

    const { data: postsData } = await postQuery
      .order('published_at', { ascending: false })
      .limit(RESULTS_LIMIT);

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
        author: {
          id:
            p.author?.id !== null && p.author?.id !== undefined
              ? p.author.id
              : '',
          username: p.author?.username ?? null,
          full_name: p.author?.full_name ?? null,
          avatar_url: p.author?.avatar_url ?? null,
        },
        collective:
          p.collective !== null && p.collective !== undefined
            ? {
                id: p.collective.id,
                name: p.collective.name,
                slug: p.collective.slug,
              }
            : null,
      })) ?? [];

    let userQuery = supabase
      .from('users')
      .select('id, username, full_name, bio, avatar_url');

    if (useFTS) {
      userQuery = userQuery.textSearch('tsv', tsQuery, { type: 'websearch' });
    } else {
      userQuery = userQuery.or(
        `username.ilike.%${escapeLike(q)}%,full_name.ilike.%${escapeLike(q)}%,bio.ilike.%${escapeLike(q)}%`,
      );
    }

    const { data: usersData } = await userQuery.limit(RESULTS_LIMIT);

    users = (usersData as UserResult[] | null) ?? [];

    let collectiveQuery = supabase
      .from('collectives')
      .select('id, name, slug, description, tags');

    if (useFTS) {
      collectiveQuery = collectiveQuery.textSearch('tsv', tsQuery, {
        type: 'websearch',
      });
    } else {
      collectiveQuery = collectiveQuery.or(
        `name.ilike.%${escapeLike(q)}%,description.ilike.%${escapeLike(q)}%`,
      );
    }

    const { data: collectivesData } =
      await collectiveQuery.limit(RESULTS_LIMIT);

    collectives = (collectivesData as CollectiveResult[] | null) ?? [];
  }

  const noResults =
    q !== null &&
    q !== undefined &&
    posts.length === 0 &&
    users.length === 0 &&
    collectives.length === 0;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">
          Search Results{q !== null && q !== undefined ? ` for "${q}"` : ''}
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
                  ...(post.slug !== null && post.slug !== undefined
                    ? { slug: post.slug }
                    : {}),
                  created_at: post.created_at,
                  post_type:
                    post.post_type !== null && post.post_type !== undefined
                      ? post.post_type
                      : 'text',
                  metadata: post.metadata,
                  author: post.author,
                  collective: post.collective,
                }}
                interactions={{
                  isLiked: false,
                  isDisliked: false,
                  isBookmarked: false,
                  likeCount:
                    post.like_count !== null && post.like_count !== undefined
                      ? post.like_count
                      : 0,
                  dislikeCount:
                    post.dislike_count !== null &&
                    post.dislike_count !== undefined
                      ? post.dislike_count
                      : 0,
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
                {user.avatar_url !== null && user.avatar_url !== undefined && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar_url}
                    alt={
                      user.full_name !== null && user.full_name !== undefined
                        ? user.full_name
                        : user.username !== null && user.username !== undefined
                          ? user.username
                          : 'User'
                    }
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {user.full_name !== null && user.full_name !== undefined
                        ? user.full_name
                        : user.username !== null && user.username !== undefined
                          ? user.username
                          : 'Unnamed User'}
                    </span>
                    {user.username !== null && user.username !== undefined && (
                      <span className="text-sm text-muted-foreground">
                        @{user.username}
                      </span>
                    )}
                  </div>
                  {user.bio !== null && user.bio !== undefined && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {user.bio}
                    </p>
                  )}
                  {user.username !== null && user.username !== undefined && (
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
      {noResults === true && <p>No results found.</p>}
    </div>
  );
}
