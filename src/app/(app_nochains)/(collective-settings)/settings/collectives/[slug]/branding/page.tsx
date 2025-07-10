import { Suspense } from 'react';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import { BrandingSettingsForm } from './BrandingSettingsForm';

function BrandingSkeleton() {
  return <div>Loading branding settings...</div>;
}

export default async function BrandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createServerSupabaseClient();

  const { data: collective } = await supabase
    .from('collectives')
    .select('id, logo_url, cover_image_url')
    .eq('slug', slug)
    .single();

  if (!collective) {
    return <div>Collective not found.</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Branding</h1>
      <Suspense fallback={<BrandingSkeleton />}>
        <BrandingSettingsForm collective={collective} slug={slug} />
      </Suspense>
    </div>
  );
}
