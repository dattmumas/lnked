'use client';

import { useRouter } from 'next/navigation';
import VideoUploadWizard from './VideoUploadWizard';

interface VideoUploadPageClientProps {
  collectiveId?: string;
}

export default function VideoUploadPageClient({
  collectiveId,
}: VideoUploadPageClientProps) {
  const router = useRouter();

  const handleComplete = (videoId: string) => {
    // Redirect to the video page after successful upload
    router.push(`/videos/${videoId}`);
  };

  const handleCancel = () => {
    // Go back to the previous page or home
    router.back();
  };

  return (
    <VideoUploadWizard
      collectiveId={collectiveId}
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}
