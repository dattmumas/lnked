import { notFound } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import { ProfilePageClient } from './ProfilePageClient';

import type { Database } from '@/lib/database.types';

type PostRow = Database['public']['Tables']['posts']['Row'];

export const revalidate = 300; // 5 minutes

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<React.JSX.Element> {
  const { username } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const { data: profileData } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single();

  if (!profileData) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <ProfilePageClient
        username={username}
        {...(authUser?.id && { currentUserId: authUser.id })}
      />
    </main>
  );
}
