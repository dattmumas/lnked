import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function ProfilePage(): Promise<never> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile?.username !== null && profile?.username !== undefined) {
    redirect(`/profile/${profile.username}`);
  }

  // If no username, redirect to onboarding
  redirect('/onboarding');
}
