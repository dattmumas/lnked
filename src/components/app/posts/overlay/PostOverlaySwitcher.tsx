'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect } from 'react';

import { CenteredSpinner } from '@/components/ui/CenteredSpinner';
import GlassPanel from '@/components/ui/GlassPanel';
import supabase from '@/lib/supabase/browser';

const PostOverlay = dynamic(() => import('./PostOverlay'));

// Track which posts have been reported this session
const reported = new Set<string>();

export default function PostOverlaySwitcher(): React.ReactElement | null {
  const params = useSearchParams();
  const id = params.get('post');

  // Increment view count once per session for this post
  useEffect(() => {
    if (!id || reported.has(id)) return;
    reported.add(id);
    void supabase.rpc('increment_view_count', { post_id_to_increment: id });
  }, [id]);

  if (!id) return null;

  return (
    <GlassPanel onClose={() => history.back()}>
      <Suspense fallback={<CenteredSpinner />}>
        <PostOverlay postId={id} />
      </Suspense>
    </GlassPanel>
  );
}
