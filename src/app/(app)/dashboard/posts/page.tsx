import PostListItem from '@/components/app/dashboard/posts/PostListItem';
import { fetchUnifiedFeed } from '@/lib/server/fetchUnifiedFeed';
import { FeedItem } from '@/types/home/types';

type Post = FeedItem;

export default async function DashboardPostsPage() {
  const limit = 20;

  try {
    const data = await fetchUnifiedFeed({
      limit,
      cursor: 0,
      scope: { type: 'global' }, // Default to global scope for now
    });

    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">My Posts</h1>
        <div className="space-y-4">
          {data.items.map((post: Post) => (
            <PostListItem
              key={post.id}
              post={{
                ...post,
                created_at: post.published_at,
                collective: post.collective
                  ? { ...post.collective, id: post.tenant?.id ?? '' }
                  : null,
                // Ensure other required fields are present, even if null
                description: post.content ?? null,
                slug: post.id, // Assuming slug can fallback to id for now
                video: post.metadata?.videoAssetId
                  ? {
                      id: post.metadata.videoAssetId,
                      title: post.title,
                    }
                  : null,
              }}
              queryKey={['dashboard-posts']} // Static key for server component
              variant="table"
            />
          ))}
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">My Posts</h1>
        <div className="text-center py-8">
          <p className="text-destructive">
            Error loading posts:{' '}
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }
}
