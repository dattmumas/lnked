'use server';

import crypto from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createRequestScopedSupabaseClient } from '@/lib/supabase/request-scoped';

import type { TablesInsert } from '@/lib/database.types';

const PostSchema = z.object({
  type: z.literal('video'),
  video_id: z.string().uuid(),
  title: z.string().min(1).max(300),
  body: z.string().optional(),
  is_public: z.boolean().default(false),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const json = await request.json();
    const parsed = PostSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid payload',
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const { video_id, title, body, is_public } = parsed.data;

    const supabase = createRequestScopedSupabaseClient(request);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 },
      );
    }

    // Check video ownership & readiness
    const { data: videoAsset, error: videoErr } = await supabase
      .from('video_assets')
      .select('id, created_by, status')
      .eq('id', video_id)
      .maybeSingle();

    if (
      videoErr !== null ||
      videoAsset === null ||
      videoAsset.created_by !== user.id ||
      !videoAsset.status ||
      !['ready', 'processing', 'complete', 'preparing'].includes(
        videoAsset.status,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Video not found, not ready, or not owned by user',
        },
        { status: 400 },
      );
    }

    // Generate slug from title
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
    const uniqueSlug = `${baseSlug}-${crypto.randomUUID().substring(0, 8)}`;

    // Insert post row
    const payload: TablesInsert<'posts'> = {
      post_type: 'video',
      video_id,
      author_id: user.id,
      tenant_id: user.id,
      slug: uniqueSlug,
      status: 'active',
      is_public,
      title,
      content: body ?? null,
      published_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('posts')
      .insert(payload)
      .select('id')
      .single();

    if (insertErr !== null || inserted === null) {
      return NextResponse.json(
        { success: false, error: insertErr?.message ?? 'Insert failed' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, id: inserted.id },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error('POST /api/posts error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
