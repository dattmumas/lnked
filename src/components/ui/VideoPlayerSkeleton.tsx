import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoPlayerSkeletonProps {
  className?: string;
}

export function VideoPlayerSkeleton({ className }: VideoPlayerSkeletonProps) {
  return (
    <div
      className={cn(
        'w-full aspect-video bg-slate-200 rounded-lg animate-pulse flex items-center justify-center',
        className,
      )}
      aria-label="Loading video player"
    >
      <div className="w-16 h-16 bg-slate-300 rounded-full flex items-center justify-center">
        <Play className="w-8 h-8 text-slate-400 fill-slate-400" />
      </div>
    </div>
  );
}
