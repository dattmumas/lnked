import Link from 'next/link';

import type { Database } from '@/lib/database.types';

type Post = Database['public']['Tables']['posts']['Row'];

interface StandardPostCardProps {
  post: Post;
}

export function StandardPostCard({ post }: StandardPostCardProps) {
  return (
    <div className="border-t border-gray-300 py-4">
      <h3 className="text-xl font-serif font-bold">
        <Link href={`/posts/${post.slug}`}>{post.title}</Link>
      </h3>
      <p className="text-xs text-gray-500 uppercase mt-1">
        By {post.author_id} {/* Placeholder for author name */}
      </p>
    </div>
  );
}
