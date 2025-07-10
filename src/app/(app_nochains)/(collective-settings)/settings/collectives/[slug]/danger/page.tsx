import { Suspense } from 'react';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import { DangerZoneClient } from './DangerZoneClient';

function DangerZoneSkeleton() {
  return <div>Loading...</div>;
}

export default async function DangerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: collective } = await supabase
    .from('collectives')
    .select('id, name')
    .eq('slug', slug)
    .single();

  if (!collective) {
    return <div>Collective not found.</div>;
  }

  // Fetch a list of members to populate the 'transfer ownership' dropdown
  const { data: members } = await supabase
    .from('collective_members')
    .select('member:users(id, full_name)')
    .eq('collective_id', collective.id);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4 text-red-500">Danger Zone</h1>
      <Suspense fallback={<DangerZoneSkeleton />}>
        <DangerZoneClient
          collective={collective}
          members={members?.map((m) => m.member).filter(Boolean) || []}
        />
      </Suspense>
    </div>
  );
}
