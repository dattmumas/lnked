'use client';

import Link from 'next/link';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import VideoThumbnail from '@/components/app/posts/molecules/VideoThumbnail';
import type { VideoAsset } from '@/lib/data-access/schemas/video.schema';

interface VideoPostCardProps {
  post: {
    id: string;
    title: string;
    created_at: string;
    post_type: 'video';
  };
  video: Pick<
    VideoAsset,
    'mux_playback_id' | 'status' | 'is_public' | 'duration'
  >;
  author: { full_name: string | null; avatar_url: string | null };
}

export default function VideoPostCard({
  post,
  video,
  author,
}: VideoPostCardProps) {
  const isProcessing = video.status !== 'ready';
  const isPrivate = video.is_public === false;

  return (
    <article className="border rounded-lg bg-card overflow-hidden">
      <Link href={`/videos/${video.mux_playback_id || ''}`}>
        <VideoThumbnail
          playbackId={video.mux_playback_id ?? ''}
          isProcessing={isProcessing}
        />
      </Link>

      <div className="p-4 space-y-2">
        <header className="flex items-center gap-2 text-sm text-muted-foreground">
          <Avatar className="h-6 w-6">
            <AvatarImage src={author.avatar_url ?? undefined} />
          </Avatar>
          <span>{author.full_name ?? 'Unknown'}</span>
          <span className="mx-1">•</span>
          <time dateTime={post.created_at}>
            {new Date(post.created_at).toLocaleDateString()}
          </time>
        </header>

        <h3 className="text-base font-semibold leading-snug line-clamp-2">
          {post.title}
        </h3>
      </div>
    </article>
  );
}
