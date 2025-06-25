import { redirect } from 'next/navigation';
import React from 'react';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import EditProfileForm from './EditProfileForm'; // Client component for the form

export default async function EditProfilePage(): Promise<React.ReactElement> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user: authUser }, // Renamed to authUser to avoid conflict
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect('/sign-in');
  }

  // Fetch the user's profile from the public.users table
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('full_name, bio, tags, avatar_url')
    .eq('id', authUser.id)
    .single();

  if (profileError) {
    console.error('Error fetching user profile:', profileError.message);
    // Handle error appropriately, maybe redirect to dashboard with an error message
    // For now, we can pass null or empty defaults to the form
  }

  const defaultValues = {
    full_name:
      (userProfile?.full_name ?? '').length > 0
        ? (userProfile?.full_name ?? '')
        : '',
    bio: (userProfile?.bio ?? '').length > 0 ? (userProfile?.bio ?? '') : '',
    // Convert tags array to comma-separated string for the form field
    tags_string:
      userProfile?.tags !== undefined &&
      userProfile.tags !== null &&
      userProfile.tags.length > 0
        ? userProfile.tags.join(', ')
        : '',
    avatar_url:
      (userProfile?.avatar_url ?? '').length > 0
        ? (userProfile?.avatar_url ?? '')
        : '',
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-2xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Edit Your Profile</h1>
      </header>
      <EditProfileForm defaultValues={defaultValues} />
    </div>
  );
}
