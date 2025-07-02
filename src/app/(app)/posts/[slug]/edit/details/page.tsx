import { redirect } from 'next/navigation';
import React from 'react';

import { loadPostEditorData } from '@/lib/data-loaders/posts-loader';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import { EditPostDetailsClient } from './EditPostDetailsClient';

export default async function EditPostDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/sign-in');
  }

  // Load post editor data server-side
  const editorData = await loadPostEditorData(user.id);

  return (
    <EditPostDetailsClient
      postId={slug}
      userCollectives={editorData.userCollectives}
    />
  );
}
