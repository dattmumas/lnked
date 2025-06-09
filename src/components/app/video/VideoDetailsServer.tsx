import { formatDistanceToNow } from 'date-fns';

// Type based on database schema
interface VideoAsset {
  id: string;
  title: string | null;
  description: string | null;
  status: string | null;
  duration: number | null;
  aspect_ratio: string | null;
  created_at: string | null;
  updated_at: string | null;
  mux_asset_id: string;
  mux_playback_id: string | null;
  created_by: string | null;
  mp4_support?: string | null;
}

interface VideoDetailsServerProps {
  video: VideoAsset;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return 'Unknown duration';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatUploadDate(dateString: string | null): string {
  if (!dateString) return 'Unknown date';

  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return 'Unknown date';
  }
}

export default function VideoDetailsServer({ video }: VideoDetailsServerProps) {
  return (
    <div className="w-full max-w-6xl mb-4">
      {/* Video title */}
      <h1 className="text-2xl font-bold text-foreground mb-2">
        {video.title || 'Untitled Video'}
      </h1>

      {/* Video metadata */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
        <span>Watchtime: {formatDuration(video.duration)}</span>
      </div>

      {/* Video description */}
      {video.description && (
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
            name: video.title || 'Untitled Video',
            description: video.description || '',
            duration: video.duration ? `PT${video.duration}S` : undefined,
            uploadDate: video.created_at || undefined,
            thumbnailUrl: video.mux_playback_id
              ? `https://image.mux.com/${video.mux_playback_id}/thumbnail.jpg`
              : undefined,
          }),
        }}
      />
    </div>
  );
}
