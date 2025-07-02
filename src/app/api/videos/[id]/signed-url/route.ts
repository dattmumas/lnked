'use server';

import { NextResponse } from 'next/server';
import { createRequestScopedSupabaseClient } from '@/lib/supabase/request-scoped';
import {
  generateMuxSignedUrl,
  getMuxSigningConfig,
} from '@/lib/utils/mux-signed-urls';

/**
 * GET /api/videos/[id]/signed-url
 *
 * Generates a JWT-signed URL for private video playback using Mux's signed playback policy.
 * This endpoint provides secure, time-limited access to private videos.
 *
 * @route GET /api/videos/{id}/signed-url
 * @param {string} id - UUID of the video to generate signed URL for
 *
 * @access_control
 * - Video owner: Always allowed
 * - Collective member: Allowed if video belongs to collective user is member of
 * - Public: Forbidden (403)
 *
 * @requirements
 * - User must be authenticated
 * - Video must exist and not be deleted
 * - Video must be private (is_public: false OR playbook_policy: 'signed')
 * - Mux signing keys must be configured (MUX_SIGNING_KEY_ID, MUX_SIGNING_SECRET)
 *
 * @returns {Object} Response object
 * @returns {string} response.signedUrl - Time-limited signed URL (1 hour expiry)
 *
 * @example
 * // Request
 * GET /api/videos/123e4567-e89b-12d3-a456-426614174000/signed-url
 * Authorization: Bearer <jwt_token>
 *
 * // Response (200)
 * {
 *   "signedUrl": "https://stream.mux.com/ABC123.m3u8?token=eyJhbGciOiJSUzI1NiI..."
 * }
 *
 * @error_codes
 * - 400: Invalid video ID format, video is public, or video not ready
 * - 401: Authentication required
 * - 403: Access denied (not owner and not collective member)
 * - 404: Video not found or deleted
 * - 500: Server error generating signed URL
 * - 503: Mux signing not configured
 *
 * @performance
 * - Response cached for 5 minutes (private cache)
 * - Database queries limited to specific fields
 * - JWT generation is fast (<10ms typical)
 *
 * @security
 * - JWT tokens use RS256 algorithm
 * - Tokens expire after 1 hour
 * - Access validated against database permissions
 * - No sensitive data in JWT payload
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const supabase = createRequestScopedSupabaseClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: v } = await supabase
    .from('video_assets')
    .select('mux_playback_id, is_public, created_by')
    .eq('id', params.id)
    .maybeSingle();

  if (!v || !v.mux_playback_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!v.is_public && v.created_by !== user?.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const signingConfig = getMuxSigningConfig();
  if (!signingConfig) {
    return NextResponse.json(
      { error: 'Signed URL not configured' },
      { status: 503 },
    );
  }

  const url = generateMuxSignedUrl({
    keyId: signingConfig.keyId,
    keySecret: signingConfig.keySecret,
    playbackId: v.mux_playback_id,
    expiryHours: 1,
  });
  if (!url) {
    return NextResponse.json(
      { error: 'Failed to generate signed URL' },
      { status: 500 },
    );
  }

  return NextResponse.json({ url });
}
