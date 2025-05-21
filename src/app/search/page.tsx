import { createServerSupabaseClient } from '@/lib/supabase/server';
import PostCard from '@/components/app/posts/molecules/PostCard';
import CollectiveCard from '@/components/app/dashboard/collectives/CollectiveCard';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { Database } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = await createServerSupabaseClient();
  const q = searchParams.q?.trim();

  type PostRow = Database['public']['Tables']['posts']['Row'];
  type PostResult = PostRow & {
    collective_slug?: string | null;
    like_count?: number | null;
    dislike_count?: number | null;
    current_user_has_liked?: boolean;
  };

  type UserResult = Pick<
    Database['public']['Tables']['users']['Row'],
    'id' | 'full_name' | 'bio' | 'avatar_url'
  >;

  type CollectiveResult = Pick<
    Database['public']['Tables']['collectives']['Row'],
    'id' | 'name' | 'slug' | 'description' | 'tags'
  >;

  let posts: PostResult[] = [];
  let users: UserResult[] = [];
  let collectives: CollectiveResult[] = [];

  if (q && q.length > 0) {
    const { data: postsData } = await supabase
      .from('posts')
      .select('*, collective:collectives!posts_collective_id_fkey(slug)')
      .eq('is_public', true)
      .not('published_at', 'is', null)
      .textSearch('tsv', q, { type: 'websearch' })
      .limit(10);

    posts =
      (postsData as (PostRow & { collective?: { slug: string } | null })[] | null)?.map(
        (p) => ({
          ...p,
          like_count: p.like_count ?? 0,
          dislike_count: p.dislike_count ?? 0,
          collective_slug: p.collective?.slug ?? null,
          current_user_has_liked: undefined,
        }),
      ) || [];

    const { data: usersData } = await supabase
      .from('users')
      .select('id, username, full_name, bio, avatar_url')
      .textSearch('tsv', q, { type: 'websearch' })
      .limit(10);

    users = (usersData as UserResult[] | null) || [];

    const { data: collectivesData } = await supabase
      .from('collectives')
      .select('id, name, slug, description, tags')
      .textSearch('tsv', q, { type: 'websearch' })
      .limit(10);

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
                post={post}
                collectiveSlug={post.collective_slug ?? null}
              />
            ))}
          </div>
        </div>
      )}

      {users.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Users</h2>
          <ul className="space-y-2">
            {users.map((u) => (
              <li key={u.id} className="">
                <Link
                  href={`/@${u.username}`}
                  className="font-medium text-primary hover:underline"
                >
                  {u.full_name || 'Unnamed User'}
                </Link>
                {u.bio && (
                  <p className="text-sm text-muted-foreground">{u.bio}</p>
                )}
              </li>
            ))}
          </ul>
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
