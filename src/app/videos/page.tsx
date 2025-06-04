import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import VideosPageClient from './VideosPageClient';

export default async function VideosPage() {
  // Server-side authentication check
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // If there's an auth error or no user, redirect to sign-in
  if (authError || !user) {
    redirect('/sign-in?redirect=/videos');
  }

  // Pass user data to client component
  return <VideosPageClient user={user} />;
}
