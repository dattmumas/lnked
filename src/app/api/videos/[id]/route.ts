// ---------------------------------------------------------------------------
// /api/videos/[id]/route.ts
//
// RESTful handler for single‑video operations (GET, PATCH, DELETE).
// Keeps the route **static‑cacheable** by calling `cookies()` exactly once.
// Uses Zod for parameter / body validation and returns uniform JSON envelopes.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import Mux from '@mux/mux-node';
import type { Database } from '@/lib/database.types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants & Helpers
// ─────────────────────────────────────────────────────────────────────────────
const VIDEO_ID = z.string().uuid('invalid_video_id');

function getSupabase() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Supabase env vars missing');

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      get: async (name) => {
        const store = await cookies();
        return store.get(name)?.value;
      },
      // read‑only route → no set/remove needed
      set: async (name, value, options) => {
        try {
          (await cookies()).set(name, value, options);
        } catch {
          console.warn('Warning: Cannot set cookies in Server Component context');
        }
      },
      remove: async (name, options) => {
        try {
          (await cookies()).set(name, '', { ...options, maxAge: 0 });
        } catch {
          console.warn('Warning: Cannot remove cookies in Server Component context');
        }
      },
    },
  });
}

async function assertOwnership(
  db: ReturnType<typeof getSupabase>,
  userId: string,
  id: string,
) {
  const { data, error } = await db
    .from('video_assets')
    .select('*')
    .eq('id', id)
    .eq('created_by', userId)
    .single();
  if (error || !data) throw new Response('not_found', { status: 404 });
  return data;
}

function getMuxClient() {
  const id = process.env.MUX_TOKEN_ID;
  const secret = process.env.MUX_TOKEN_SECRET;
  if (!id || !secret) throw new Error('MUX env vars missing');
  return new Mux({ tokenId: id, tokenSecret: secret });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/videos/[id]
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Response('unauthorized', { status: 401 });

    const videoId = VIDEO_ID.parse(id);
    const video   = await assertOwnership(supabase, user.id, videoId);
    return NextResponse.json({ data: video });
  } catch (e) {
    return e instanceof Response
      ? e
      : NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/videos/[id]
// ─────────────────────────────────────────────────────────────────────────────
const UpdateSchema = z.object({
  title:           z.string().trim().min(1).optional(),
  description:     z.string().trim().optional(),
  privacy_setting: z.enum(['public', 'private']).optional(),
  encoding_tier:   z.string().optional(),
  collective_id:   z.string().uuid().nullable().optional(),
  post_id:         z.string().uuid().nullable().optional(),
}).strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Response('unauthorized', { status: 401 });

    const videoId = VIDEO_ID.parse(id);
    await assertOwnership(supabase, user.id, videoId);

    const body = UpdateSchema.parse(await request.json());
    const updateData: Record<string, unknown> = { ...body };

    if (body.privacy_setting !== undefined) {
      const isPublic      = body.privacy_setting === 'public';
      updateData.is_public       = isPublic;
      updateData.playback_policy = isPublic ? 'public' : 'signed';
      delete updateData.privacy_setting;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ data: { unchanged: true } });
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('video_assets')
      .update(updateData)
      .eq('id', videoId)
      .eq('created_by', user.id)
      .single();

    if (error) throw new Response('update_failed', { status: 500 });
    return NextResponse.json({ data });
  } catch (e) {
    return e instanceof Response
      ? e
      : NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/videos/[id]
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Response('unauthorized', { status: 401 });

    const videoId = VIDEO_ID.parse(id);
    const video   = await assertOwnership(supabase, user.id, videoId);

    const mux = getMuxClient();
    if (video.mux_asset_id) {
      await mux.video.assets.delete(video.mux_asset_id);
    } else if (video.mux_upload_id) {
      try {
        await mux.video.uploads.cancel(video.mux_upload_id);
      } catch (err) {
        /* ignore 400 = already finished */
      }
    }

    const { error } = await supabase
      .from('video_assets')
      .delete()
      .eq('id', videoId);

    if (error) throw new Response('db_delete_failed', { status: 500 });
    return NextResponse.json({ deleted: true });
  } catch (e) {
    return e instanceof Response
      ? e
      : NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}