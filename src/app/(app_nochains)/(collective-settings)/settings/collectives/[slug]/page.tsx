import { Suspense } from 'react';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import { EditCollectiveSettingsForm } from './EditCollectiveSettingsForm';

function GeneralSettingsSkeleton() {
  return <div>Loading settings...</div>;
}

export default async function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: collective } = await supabase
    .from('collectives')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!collective) {
    return <div>Collective not found.</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">General Settings</h1>
      <Suspense fallback={<GeneralSettingsSkeleton />}>
        <EditCollectiveSettingsForm collective={collective} />
      </Suspense>
    </div>
  );
}
