import { notFound } from 'next/navigation';
import React from 'react';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CollectiveProvider } from '@/providers/CollectiveProvider';

import { CollectivePageClient } from './CollectivePageClient';

export const revalidate = 600; // Revalidate every 10 minutes

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  // Verify collective exists
  const { data: collective } = await supabase
    .from('collectives')
    .select('id')
    .eq('slug', slug)
    .single();

  if (!collective) {
    notFound();
  }

  return (
    <CollectiveProvider slug={slug}>
      <main className="min-h-screen bg-background text-foreground">
        <CollectivePageClient slug={slug} />
      </main>
    </CollectiveProvider>
  );
}
