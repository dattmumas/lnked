import Link from 'next/link';
import { redirect } from 'next/navigation';

import VideoUploadPageClient from '@/components/app/video/wizard/VideoUploadPageClient';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function VideoUploadPage({
  searchParams,
}: {
  searchParams: Promise<{ collective?: string }>;
}) {
  const supabase = await createServerSupabaseClient();

  // Check authentication
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/sign-in?redirectTo=/videos/upload');
  }

  const resolvedSearchParams = await searchParams;
  const collectiveId = resolvedSearchParams.collective;

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold">Upload Video</h1>
              <div className="hidden sm:block">
                <p className="text-sm text-muted-foreground">
                  Share your content with the community
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/videos"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Manage Videos
              </Link>
              <Link
                href="/home"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <VideoUploadPageClient collectiveId={collectiveId} />
      </div>
    </div>
  );
}
