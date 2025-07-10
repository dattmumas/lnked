import { redirect } from 'next/navigation';

import EditUserSettingsForm from '@/components/app/settings/EditUserSettingsForm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function UserProfileSettingsPage(): Promise<React.ReactElement> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/sign-in');
  }

  // Fetch user profile data
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id, full_name, username, bio, tags, avatar_url')
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
    username: userProfile.username || '',
    bio: userProfile.bio || '',
    avatar_url: userProfile.avatar_url || '',
    tags_string: Array.isArray(userProfile.tags)
      ? userProfile.tags.join(', ')
      : '',
  };

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
        <p className="text-muted-foreground">
          Update your profile information and how you appear to others.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your profile details that are visible to other users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditUserSettingsForm defaultValues={defaultValues} />
        </CardContent>
      </Card>
    </>
  );
}
