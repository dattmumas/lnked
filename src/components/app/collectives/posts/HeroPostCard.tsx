import Image from 'next/image';
import Link from 'next/link';

import type { Database } from '@/lib/database.types';

type Post = Database['public']['Tables']['posts']['Row'];

interface HeroPostCardProps {
  post: Post;
}

export function HeroPostCard({ post }: HeroPostCardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="col-span-1 md:order-last">
        {post.thumbnail_url && (
          <Link href={`/posts/${post.slug}`}>
            <Image
              src={post.thumbnail_url}
              alt={post.title ?? 'Post thumbnail'}
              width={500}
              height={300}
              className="object-cover w-full h-full"
            />
          </Link>
        )}
      </div>
      <div className="col-span-1">
        <p className="text-red-600 font-semibold text-sm mb-1">Live</p>
        <h2 className="text-3xl font-serif font-bold mb-2">
          <Link href={`/posts/${post.slug}`}>{post.title}</Link>
        </h2>
        <p className="text-gray-700 mb-4">
          {/* Placeholder for post summary */}
        </p>
        <p className="text-xs text-gray-500 uppercase">
          By {post.author_id} {/* Placeholder for author name */}
        </p>
      </div>
    </div>
  );
}
