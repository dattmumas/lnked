import { redirect } from 'next/navigation';
import React from 'react';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import NewCollectiveForm from './NewCollectiveForm';

export default async function NewCollectivePage(): Promise<React.ReactElement> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/sign-in');
  }

  return <NewCollectiveForm />;
}
