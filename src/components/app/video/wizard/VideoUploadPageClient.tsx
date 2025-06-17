'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import VideoUploadWizard from './VideoUploadWizard';

interface VideoUploadPageClientProps {
  collectiveId?: string;
}

export default function VideoUploadPageClient({
  collectiveId,
}: VideoUploadPageClientProps) {
  const router = useRouter();

  const handleComplete = useCallback(
    (videoId: string) => {
      // Redirect to the video page after successful upload
      router.push(`/videos/${videoId}`);
    },
    [router],
  );

  const handleCancel = useCallback(() => {
    // Go back to the previous page or home
    router.back();
  }, [router]);

  return (
    <VideoUploadWizard
      collectiveId={collectiveId}
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}
