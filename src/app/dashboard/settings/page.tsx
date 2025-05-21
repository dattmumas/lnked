import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import EditUserSettingsForm from '@/components/app/settings/EditUserSettingsForm';
import DeleteAccountSection from '@/components/app/settings/DeleteAccountSection';

export default async function UserSettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/error');
  }

  // Fetch user profile data
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id, full_name, bio, tags')
    .eq('id', authUser.id)
    .single();

  if (profileError || !userProfile) {
    console.error(
      `Error fetching user profile for settings:`,
      profileError?.message,
    );
    redirect('/error');
  }

  const defaultValues = {
    full_name: userProfile.full_name || '',
    bio: userProfile.bio || '',
    tags_string: Array.isArray(userProfile.tags)
      ? userProfile.tags.join(', ')
      : '',
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-2xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your personal information and preferences.
        </p>
      </header>
      <EditUserSettingsForm defaultValues={defaultValues} />
      <DeleteAccountSection userEmail={authUser.email ?? ''} />
    </div>
  );
}
