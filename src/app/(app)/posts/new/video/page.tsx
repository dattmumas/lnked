import { redirect } from 'next/navigation';
import React from 'react';

import VideoPostCreationClient from '@/app/(app)/posts/new/video/VideoPostCreationClient';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { loadPostEditorData } from '@/lib/data-loaders/posts-loader';

export default async function NewVideoPostPage(): Promise<React.ReactElement> {
  const supabase = await createServerSupabaseClient();

  // Check authentication
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/sign-in?redirectTo=/posts/new/video');
  }

  // Load user's collectives for sharing options
  const { userCollectives } = await loadPostEditorData(session.user.id);

  return (
    <div className="min-h-screen bg-background">
      <VideoPostCreationClient userCollectives={userCollectives} />
    </div>
  );
}
