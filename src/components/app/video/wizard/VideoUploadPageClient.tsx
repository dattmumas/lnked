'use client';

import { useRouter } from 'next/navigation';
import React, { useCallback } from 'react';

import VideoUploadWizard from './VideoUploadWizard';

interface VideoUploadPageClientProps {
  collectiveId?: string;
}

export default function VideoUploadPageClient({
  collectiveId,
}: VideoUploadPageClientProps): React.ReactElement {
  const router = useRouter();

  const handleComplete = useCallback(
    (videoId: string): void => {
      // Redirect to the video page after successful upload
      void router.push(`/videos/${videoId}`);
    },
    [router],
  );

  const handleCancel = useCallback((): void => {
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
