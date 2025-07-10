import { notFound, redirect } from 'next/navigation';
import React from 'react';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import { CollectiveSettingsNav } from './CollectiveSettingsNav';

export default async function CollectiveSettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const { data: collective } = await supabase
    .from('collectives')
    .select('id, slug, owner_id')
    .eq('slug', slug)
    .single();

  if (!collective) {
    notFound();
  }

  const { data: member } = await supabase
    .from('collective_members')
    .select('role')
    .eq('collective_id', collective.id)
    .eq('member_id', user.id)
    .single();

  const userRole = member?.role;
  const isOwner = collective.owner_id === user.id;

  if (!isOwner && userRole !== 'admin') {
    // If the user is not the owner or an admin, they can't see the settings.
    redirect(`/collectives/${collective.slug}`);
  }

  return (
    <div className="space-y-6 p-10 pb-16 md:block">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">
          Collective Settings
        </h2>
        <p className="text-muted-foreground">
          Manage your collective's settings, members, and content.
        </p>
      </div>
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="-mx-4 lg:w-1/5">
          <CollectiveSettingsNav />
        </aside>
        <div className="flex-1 lg:max-w-2xl">{children}</div>
      </div>
    </div>
  );
}
