import Mux from '@mux/mux-node';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createServerSupabaseClient } from '@/lib/supabase/server';

// Helper for non-empty string validation
const nonEmpty = (v?: string): v is string => typeof v === 'string' && v.trim() !== '';

// Privacy settings enum for consistency
const Privacy = {
  PUBLIC: 'public',
  PRIVATE: 'private',
} as const;

// Encoding tiers enum
const EncodingTier = {
  SMART: 'smart',
  BASELINE: 'baseline',
} as const;

// Constants for validation limits
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 1000;
const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_TOO_MANY_REQUESTS = 429;
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;
const RETRY_AFTER_SECONDS = 60;

// Request payload validation schema
const UploadUrlRequestSchema = z.object({
  title: z.string().max(MAX_TITLE_LENGTH).optional(),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  collective_id: z.string().uuid().optional(),
  post_id: z.string().uuid().optional(),
  privacySetting: z.enum([Privacy.PUBLIC, Privacy.PRIVATE]).default(Privacy.PUBLIC),
  encoding_tier: z.enum([EncodingTier.SMART, EncodingTier.BASELINE]).default(EncodingTier.SMART),
});

// Interface for Mux error handling
interface MuxError extends Error {
  statusCode?: number;
  message: string;
}

type UploadUrlRequest = z.infer<typeof UploadUrlRequestSchema>;

/**
 * POST /api/videos/upload-url
 * Create MUX direct upload URL - Enhanced with security and validation
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Environment variable validation inside handler to avoid module-level crashes
    const { MUX_TOKEN_ID, MUX_TOKEN_SECRET, NODE_ENV, NEXT_PUBLIC_APP_URL } = process.env;
    
           if (!nonEmpty(MUX_TOKEN_ID)) {
         console.error('MUX_TOKEN_ID environment variable missing or empty');
         return NextResponse.json({ error: 'Service configuration error' }, { status: HTTP_STATUS_INTERNAL_SERVER_ERROR });
       }
       
       if (!nonEmpty(MUX_TOKEN_SECRET)) {
         console.error('MUX_TOKEN_SECRET environment variable missing or empty');
         return NextResponse.json({ error: 'Service configuration error' }, { status: HTTP_STATUS_INTERNAL_SERVER_ERROR });
       }

    // Initialize MUX client with validated credentials
    const mux = new Mux({
      tokenId: MUX_TOKEN_ID,
      tokenSecret: MUX_TOKEN_SECRET,
    });

    // Create Supabase client with proper auth context
    const supabase = await createServerSupabaseClient();

    // Get current user with proper error handling
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

         // Validate and parse request payload with Zod
     let requestData: UploadUrlRequest;
     try {
       const rawBody: unknown = await request.json();
       requestData = UploadUrlRequestSchema.parse(rawBody);
     } catch (error: unknown) {
       console.error('Payload validation failed:', { error: error instanceof Error ? error.message : 'Unknown error' });
       return NextResponse.json(
         { error: 'Invalid request payload', details: error instanceof z.ZodError ? error.errors : undefined },
         { status: HTTP_STATUS_BAD_REQUEST }
       );
     }

    const { 
      title, 
      description, 
      collective_id, 
      post_id, 
      privacySetting,
      encoding_tier
    } = requestData;

    // Map privacy setting to database fields (single source of truth)
    const is_public = privacySetting === Privacy.PUBLIC;
    const playback_policy = is_public ? 'public' : 'signed';

    // Validate collective_id if provided (use maybeSingle to avoid 500 on duplicates)
    if (nonEmpty(collective_id)) {
      const { data: collective, error: collectiveError } = await supabase
        .from('collectives')
        .select('id')
        .eq('id', collective_id)
        .maybeSingle();

      if (collectiveError !== null) {
        console.error('Collective lookup error:', { code: collectiveError.code, collective_id });
                 return NextResponse.json(
           { error: 'Database error during collective validation' },
           { status: HTTP_STATUS_INTERNAL_SERVER_ERROR }
         );
      }

      if (collective === null) {
                 return NextResponse.json(
           { error: 'Invalid collective ID' },
           { status: HTTP_STATUS_BAD_REQUEST }
         );
      }

      // Check collective membership (use maybeSingle)
      const { data: membership, error: membershipError } = await supabase
        .from('collective_members')
        .select('id')
        .eq('collective_id', collective_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (membershipError !== null) {
        console.error('Membership lookup error:', { code: membershipError.code, collective_id, user_id: user.id });
        return NextResponse.json(
          { error: 'Database error during membership validation' },
          { status: 500 }
        );
      }

      if (membership === null) {
        return NextResponse.json(
          { error: 'Not authorized to upload to this collective' },
          { status: 403 }
        );
      }
    }

    // Validate post_id if provided (use maybeSingle)
    if (nonEmpty(post_id)) {
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('id, author_id')
        .eq('id', post_id)
        .maybeSingle();

      if (postError !== null) {
        console.error('Post lookup error:', { code: postError.code, post_id });
        return NextResponse.json(
          { error: 'Database error during post validation' },
          { status: 500 }
        );
      }

      if (post === null) {
        return NextResponse.json(
          { error: 'Invalid post ID' },
          { status: 400 }
        );
      }

      if (post.author_id !== user.id) {
        return NextResponse.json(
          { error: 'Not authorized to attach video to this post' },
          { status: 403 }
        );
      }
    }

    // CORS origin handling - fail hard if missing in production
    let corsOrigin: string;
    if (NODE_ENV === 'development') {
      corsOrigin = 'http://localhost:3000';
    } else {
             if (!nonEmpty(NEXT_PUBLIC_APP_URL)) {
         console.error('NEXT_PUBLIC_APP_URL missing in production');
         return NextResponse.json({ error: 'Service configuration error' }, { status: HTTP_STATUS_INTERNAL_SERVER_ERROR });
       }
      corsOrigin = NEXT_PUBLIC_APP_URL;
    }

    // Create MUX direct upload with specific error handling
    let directUpload;
    try {
      directUpload = await mux.video.uploads.create({
        cors_origin: corsOrigin,
        new_asset_settings: {
          playback_policy: [playback_policy],
          mp4_support: 'capped-1080p',
          encoding_tier,
        },
      });
    } catch (error: unknown) {
      // Handle specific MUX errors with proper type checking
      const muxError = error as MuxError;
      const {statusCode} = muxError;
      
      if (statusCode === HTTP_STATUS_TOO_MANY_REQUESTS) {
        return NextResponse.json(
          { error: 'Mux rate limit exceeded. Please try again later.' },
          { 
            status: HTTP_STATUS_TOO_MANY_REQUESTS, 
            headers: { 'Retry-After': RETRY_AFTER_SECONDS.toString() } 
          }
        );
      }
      
      if (statusCode !== undefined && statusCode >= HTTP_STATUS_BAD_REQUEST && statusCode < HTTP_STATUS_INTERNAL_SERVER_ERROR) {
        console.error('Mux client error:', { 
          code: statusCode, 
          message: muxError.message 
        });
        return NextResponse.json(
          { error: 'Invalid upload configuration' },
          { status: HTTP_STATUS_BAD_REQUEST }
        );
      }
      
      console.error('Mux service error:', { 
        code: statusCode, 
        message: muxError.message 
      });
      return NextResponse.json(
        { error: 'Upload service temporarily unavailable' },
        { status: 503 }
      );
    }

    // Save video metadata to database (RLS should enforce created_by = auth.uid())
    const { data: videoRecord, error: dbError } = await supabase
      .from('video_assets')
      .insert({
        title: nonEmpty(title) ? title : null,
        description: nonEmpty(description) ? description : null,
        mux_upload_id: directUpload.id,
        mux_asset_id: null,
        status: 'preparing',
        // Note: created_by should be enforced by RLS policy, not client input
        created_by: user.id,
        mp4_support: 'capped-1080p',
        is_public,
        playback_policy,
        encoding_tier,
        collective_id: nonEmpty(collective_id) ? collective_id : null,
        post_id: nonEmpty(post_id) ? post_id : null,
      })
      .select('id, status, mux_upload_id, is_public, playback_policy') // Only return safe fields
      .single();

    if (dbError !== null) {
      console.error('Database error during video record creation:', { code: dbError.code });
      return NextResponse.json(
        { error: 'Failed to save video metadata' },
        { status: 500 }
      );
    }

    // Return only necessary, non-sensitive fields
    return NextResponse.json({
      success: true,
      uploadUrl: directUpload.url,
      video: {
        id: videoRecord.id,
        status: videoRecord.status,
        mux_upload_id: videoRecord.mux_upload_id,
        is_public: videoRecord.is_public,
      },
    });
  } catch (error: unknown) {
    console.error('Upload URL creation error:', { message: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Failed to create upload URL' },
      { status: 500 }
    );
  }
} 