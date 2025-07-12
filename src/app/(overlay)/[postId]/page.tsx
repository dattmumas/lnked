import { notFound } from 'next/navigation';
import React from 'react';

import { createServerSupabaseClient } from '@/lib/supabase/server';

interface Params {
  postId: string;
}

export const dynamic = 'force-static';
export const revalidate = 60; // 1 min

export default async function PostPage({
  params,
}: {
  params: Promise<Params>;
}): Promise<React.ReactElement> {
  const resolvedParams = await params;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('v_user_visible_posts')
    .select(`*, video_assets(id, mux_playback_id, status)`)
    .eq('id', resolvedParams.postId)
    .single();

  if (error || !data) {
    notFound();
  }

  return (
    <article className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl py-10">
      <h1>{data.title}</h1>
      {data.post_type === 'video' && data.video_assets?.mux_playback_id && (
        <img
          src={`https://image.mux.com/${data.video_assets.mux_playback_id}/thumbnail.jpg`}
          alt={data.title ?? 'Video thumbnail'}
          className="w-full h-auto my-6 rounded-lg"
        />
      )}
      {data.content && (
        <p className="prose-prewrap whitespace-pre-wrap">{data.content}</p>
      )}
    </article>
  );
}
