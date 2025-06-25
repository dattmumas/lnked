import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateMuxSignedUrl, isMuxSigningConfigured, getMuxSigningConfig } from '@/lib/utils/mux-signed-urls';

// Video ID validation schema
const VIDEO_ID = z.string().uuid();

// HTTP status codes
const HTTP_STATUS_OK = 200;
const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_UNAUTHORIZED = 401;
const HTTP_STATUS_FORBIDDEN = 403;
const HTTP_STATUS_NOT_FOUND = 404;
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;
const HTTP_STATUS_SERVICE_UNAVAILABLE = 503;

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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    
    // Validate video ID format
    const videoId = VIDEO_ID.parse(id);
    
    // Check if Mux signing is configured
    if (!isMuxSigningConfigured()) {
      return NextResponse.json(
        { error: 'Signed URL generation is not available. Please contact support.' },
        { status: HTTP_STATUS_SERVICE_UNAVAILABLE }
      );
    }

    const supabase = await createServerSupabaseClient();
    
    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    
    if (authError !== null || user === null) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: HTTP_STATUS_UNAUTHORIZED }
      );
    }

    // Fetch video details with ownership and privacy checks - only active videos
    const { data: video, error: videoError } = await supabase
      .from('video_assets')
      .select('id, mux_playback_id, playback_policy, is_public, created_by, collective_id')
      .eq('id', videoId)
      .is('deleted_at', null) // Only active (non-deleted) videos
      .maybeSingle();

    if (videoError !== null) {
      return NextResponse.json(
        { error: 'Failed to fetch video details' },
        { status: HTTP_STATUS_INTERNAL_SERVER_ERROR }
      );
    }

    if (video === null) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: HTTP_STATUS_NOT_FOUND }
      );
    }

    // Check if video is public (no signed URL needed)
    if (video.is_public === true || video.playback_policy === 'public') {
      return NextResponse.json(
        { error: 'Signed URL not required for public videos' },
        { status: HTTP_STATUS_BAD_REQUEST }
      );
    }

    // Verify access permissions
    const isOwner = video.created_by === user.id;
    let hasAccess = isOwner;

    // If not the owner, check collective membership for collective videos
    if (!isOwner && video.collective_id !== null) {
      const { data: membership } = await supabase
        .from('collective_members')
        .select('role')
        .eq('collective_id', video.collective_id)
        .eq('user_id', user.id)
        .maybeSingle();

      hasAccess = membership !== null;
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: HTTP_STATUS_FORBIDDEN }
      );
    }

    // Check if video has a playback ID
    if (video.mux_playback_id === null || video.mux_playback_id === undefined) {
      return NextResponse.json(
        { error: 'Video is not ready for playback' },
        { status: HTTP_STATUS_BAD_REQUEST }
      );
    }

    // Generate signed URL with 1 hour expiration
    const signingConfig = getMuxSigningConfig();
    if (signingConfig === undefined) {
      return NextResponse.json(
        { error: 'Mux signing not configured' },
        { status: HTTP_STATUS_SERVICE_UNAVAILABLE }
      );
    }
    
    const signedUrl = generateMuxSignedUrl({
      keyId: signingConfig.keyId,
      keySecret: signingConfig.keySecret,
      playbackId: video.mux_playback_id,
      expiryHours: 1,
    });

    if (signedUrl === undefined) {
      return NextResponse.json(
        { error: 'Failed to generate signed URL' },
        { status: HTTP_STATUS_INTERNAL_SERVER_ERROR }
      );
    }

    // Set cache headers for signed URLs (short cache time)
    const response = NextResponse.json(
      { signedUrl },
      { status: HTTP_STATUS_OK }
    );
    
    // Cache for 5 minutes only (signed URLs are temporary)
    response.headers.set('Cache-Control', 'private, max-age=300');
    
    return response;

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid video ID format' },
        { status: HTTP_STATUS_BAD_REQUEST }
      );
    }

    console.error('Signed URL generation failed:', error);
    
    return NextResponse.json(
      { error: 'Failed to generate signed URL' },
      { status: HTTP_STATUS_INTERNAL_SERVER_ERROR }
    );
  }
} 