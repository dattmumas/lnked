import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import HomePageClient from './HomePageClient';

export default async function HomePage() {
  // Server-side authentication check
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // If there's an auth error or no user, redirect to sign-in
  if (authError || !user) {
    redirect('/sign-in?redirect=/home');
  }

  // Fetch user profile for authenticated user
  const { data: profile } = await supabase
    .from('users')
    .select('id, username, full_name, avatar_url, bio')
    .eq('id', user.id)
    .single();

  // Pass user data to client component
  return <HomePageClient user={user} profile={profile} />;
}
