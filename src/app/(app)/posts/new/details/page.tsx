import { redirect } from 'next/navigation';
import React from 'react';

import { loadPostEditorData } from '@/lib/data-loaders/posts-loader';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import { NewPostDetailsClient } from './NewPostDetailsClient';

export default async function NewPostDetailsPage(): Promise<React.JSX.Element> {
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

  return <NewPostDetailsClient userCollectives={editorData.userCollectives} />;
}
