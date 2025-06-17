import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function ProfileRedirectPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // If not authenticated, redirect to sign-in
    redirect('/sign-in?redirect=/profile');
  }

  // Get the user's username from the database
  const { data: userData } = await supabase
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single();

  if (!userData?.username) {
    // If no username found, redirect to profile edit to set one up
    redirect('/dashboard/profile/edit');
  }

  // Redirect to the user's profile page
  redirect(`/profile/${userData.username}`);
}
