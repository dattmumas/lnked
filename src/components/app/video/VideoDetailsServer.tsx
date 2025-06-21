import { formatDistanceToNow } from 'date-fns';
import React from 'react';

import { VideoAsset } from '@/lib/data-access/schemas/video.schema';

// Constants
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;
const PADDING_LENGTH = 2;

interface VideoDetailsServerProps {
  video: VideoAsset;
}

function formatDuration(seconds: number | undefined): string {
  if (seconds === null || seconds === undefined || seconds <= 0)
    return 'Unknown duration';

  const hours = Math.floor(seconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const remainingSeconds = Math.floor(seconds % SECONDS_PER_MINUTE);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(PADDING_LENGTH, '0')}:${remainingSeconds.toString().padStart(PADDING_LENGTH, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(PADDING_LENGTH, '0')}`;
}

function formatUploadDate(dateString: string | undefined): string {
  if (
    dateString === null ||
    dateString === undefined ||
    dateString.length === 0
  )
    return 'Unknown date';

  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return 'Unknown date';
  }
}

export default function VideoDetailsServer({
  video,
}: VideoDetailsServerProps): React.ReactElement {
  return (
    <div className="w-full max-w-6xl mb-4">
      {/* Video title */}
      <h1 className="text-2xl font-bold text-foreground mb-2">
        {video.title !== null &&
        video.title !== undefined &&
        video.title.length > 0
          ? video.title
          : 'Untitled Video'}
      </h1>

      {/* Video metadata */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
        <span>Watchtime: {formatDuration(video.duration)}</span>
      </div>

      {/* Video description */}
      {video.description !== null &&
        video.description !== undefined &&
        video.description.length > 0 && (
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <p className="whitespace-pre-wrap">{video.description}</p>
          </div>
        )}

      {/* SEO meta information (hidden from users but available for crawlers) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'VideoObject',
            name:
              video.title !== null &&
              video.title !== undefined &&
              video.title.length > 0
                ? video.title
                : 'Untitled Video',
            description:
              video.description !== null &&
              video.description !== undefined &&
              video.description.length > 0
                ? video.description
                : '',
            duration:
              video.duration !== null &&
              video.duration !== undefined &&
              video.duration > 0
                ? `PT${video.duration}S`
                : undefined,
            uploadDate: formatUploadDate(video.created_at),
            thumbnailUrl:
              video.mux_playback_id !== null &&
              video.mux_playback_id !== undefined &&
              video.mux_playback_id.length > 0
                ? `https://image.mux.com/${video.mux_playback_id}/thumbnail.jpg`
                : undefined,
          }),
        }}
      />
    </div>
  );
}
