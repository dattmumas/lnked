import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'node:crypto';

// MUX webhook signing secret
const WEBHOOK_SECRET = process.env.MUX_WEBHOOK_SECRET || 'dnc1qcjo4fe022874u62ms5hmk0gm13h';

/**
 * POST /api/mux-webhook
 * MUX webhook handler with signature verification
 * Following: https://docs.mux.com/guides/video/verify-webhook-signatures
 */
export async function POST(request: NextRequest) {
  console.log('🔵 [MUX-WEBHOOK] Incoming webhook request received');
  
  try {
    console.log('🔵 [MUX-WEBHOOK] Reading request body...');
    // Get the raw body for signature verification
    const rawBody = await request.text();
    console.log('🔵 [MUX-WEBHOOK] Raw body length:', rawBody.length);
    
    console.log('🔵 [MUX-WEBHOOK] Checking for Mux-Signature header...');
    // Get signature header
    const signatureHeader = request.headers.get('Mux-Signature');
    if (!signatureHeader) {
      console.error('❌ [MUX-WEBHOOK] Missing Mux-Signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }
    console.log('🔵 [MUX-WEBHOOK] Signature header found:', signatureHeader.substring(0, 50) + '...');

    console.log('🔵 [MUX-WEBHOOK] Verifying webhook signature...');
    console.log('🔵 [MUX-WEBHOOK] Using webhook secret:', WEBHOOK_SECRET ? `${WEBHOOK_SECRET.substring(0, 8)}...` : 'NOT SET');
    
    // Verify the signature
    if (!isValidMuxSignature(rawBody, signatureHeader, WEBHOOK_SECRET)) {
      console.error('❌ [MUX-WEBHOOK] Invalid webhook signature - authentication failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    console.log('✅ [MUX-WEBHOOK] Signature verification successful');

    console.log('🔵 [MUX-WEBHOOK] Parsing webhook body...');
    // Parse the verified body
    const body = JSON.parse(rawBody);
    const { type, data } = body;

    console.log('🔵 [MUX-WEBHOOK] Webhook type:', type);
    console.log('🔵 [MUX-WEBHOOK] Webhook data ID:', data?.id);
    console.log('🔵 [MUX-WEBHOOK] Full webhook data:', JSON.stringify(data, null, 2));

    console.log('🔵 [MUX-WEBHOOK] Routing to appropriate handler...');
    // Handle different webhook types
    switch (type) {
      case 'video.asset.ready':
        console.log('🟢 [MUX-WEBHOOK] Routing to handleAssetReady');
        await handleAssetReady(data);
        break;
      case 'video.upload.asset_created':
        console.log('🟢 [MUX-WEBHOOK] Routing to handleUploadAssetCreated');
        await handleUploadAssetCreated(data);
        break;
      case 'video.asset.errored':
        console.log('🔴 [MUX-WEBHOOK] Routing to handleAssetErrored');
        await handleAssetErrored(data);
        break;
      case 'video.upload.errored':
        console.log('🔴 [MUX-WEBHOOK] Routing to handleUploadErrored');
        await handleUploadErrored(data);
        break;
      case 'video.upload.cancelled':
        console.log('🟡 [MUX-WEBHOOK] Routing to handleUploadCancelled');
        await handleUploadCancelled(data);
        break;
      default:
        console.log('⚪ [MUX-WEBHOOK] Unhandled webhook type:', type);
    }

    console.log('✅ [MUX-WEBHOOK] Webhook processing completed successfully');
    return NextResponse.json({ message: 'ok' });
  } catch (error) {
    console.error('❌ [MUX-WEBHOOK] Critical error during webhook processing:', error);
    console.error('❌ [MUX-WEBHOOK] Error stack:', (error as Error).stack);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Verify MUX webhook signature
 * Following: https://docs.mux.com/guides/video/verify-webhook-signatures
 */
function isValidMuxSignature(rawBody: string, header: string, secret: string): boolean {
  console.log('🔵 [SIGNATURE] Starting signature verification');
  console.log('🔵 [SIGNATURE] Header format:', header.substring(0, 100));
  
  try {
    // MUX signature format: "t=timestamp,v1=signature"
    const parts = header.split(',');
    console.log('🔵 [SIGNATURE] Header parts count:', parts.length);
    
    const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
    const signature = parts.find(p => p.startsWith('v1='))?.slice(3);

    console.log('🔵 [SIGNATURE] Extracted timestamp:', timestamp);
    console.log('🔵 [SIGNATURE] Extracted signature:', signature ? `${signature.substring(0, 16)}...` : 'NOT FOUND');

    if (!timestamp || !signature) {
      console.error('❌ [SIGNATURE] Invalid signature header format - missing timestamp or signature');
      return false;
    }

    console.log('🔵 [SIGNATURE] Creating signed payload...');
    // Create the signed payload by concatenating timestamp and body
    const payload = `${timestamp}.${rawBody}`;
    console.log('🔵 [SIGNATURE] Payload length:', payload.length);
    
    console.log('🔵 [SIGNATURE] Computing expected signature...');
    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    console.log('🔵 [SIGNATURE] Expected signature:', expectedSignature.substring(0, 16) + '...');
    console.log('🔵 [SIGNATURE] Received signature:', signature.substring(0, 16) + '...');

    console.log('🔵 [SIGNATURE] Performing timing-safe comparison...');
    // Timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
    
    console.log(isValid ? '✅ [SIGNATURE] Signature verification passed' : '❌ [SIGNATURE] Signature verification failed');
    return isValid;
  } catch (error) {
    console.error('❌ [SIGNATURE] Error during signature verification:', error);
    return false;
  }
}

/**
 * Handle asset ready webhook - update database with MUX asset info
 * Following MUX docs: https://docs.mux.com/guides/video/receive-webhooks
 */
async function handleAssetReady(data: {
  id: string;
  status: string;
  duration?: number;
  aspect_ratio?: string;
  playback_ids?: Array<{ id: string; policy: string }>;
  upload_id?: string;
}) {
  console.log('🟢 [ASSET-READY] Handler started');
  console.log('🟢 [ASSET-READY] Asset ID:', data.id);
  console.log('🟢 [ASSET-READY] Upload ID:', data.upload_id || 'NOT PROVIDED');
  console.log('🟢 [ASSET-READY] Status:', data.status);
  console.log('🟢 [ASSET-READY] Duration:', data.duration);
  console.log('🟢 [ASSET-READY] Aspect ratio:', data.aspect_ratio);
  console.log('🟢 [ASSET-READY] Playback IDs:', data.playback_ids?.length || 0);

  const supabase = supabaseAdmin;

  try {
    console.log('🟢 [ASSET-READY] Processing playback information...');
    // Extract playback info
    const playbackId = data.playback_ids?.[0]?.id || null;
    const playbackPolicy = data.playback_ids?.[0]?.policy || 'public';
    
    console.log('🟢 [ASSET-READY] Extracted playback ID:', playbackId || 'NONE');
    console.log('🟢 [ASSET-READY] Extracted playback policy:', playbackPolicy);
    
    console.log('🟢 [ASSET-READY] Preparing update data...');
    // Update video with asset details following MUX's response structure
    const updateData = {
      status: data.status || 'ready',
      duration: data.duration,
      aspect_ratio: data.aspect_ratio,
      mux_playback_id: playbackId,
      playback_policy: playbackPolicy,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('🟢 [ASSET-READY] Update data prepared:', JSON.stringify(updateData, null, 2));

    console.log('🟢 [ASSET-READY] Attempting primary update by mux_asset_id...');
    // Primary approach: Update by mux_asset_id
    const { data: updateResult, error: updateError } = await supabase
      .from('video_assets')
      .update(updateData)
      .eq('mux_asset_id', data.id)
      .select('id');

    if (updateError) {
      console.error('❌ [ASSET-READY] Database error during primary update:', updateError);
      return;
    }

    console.log('🟢 [ASSET-READY] Primary update result:', updateResult);
    console.log('🟢 [ASSET-READY] Rows affected by primary update:', updateResult?.length || 0);

    // Check if we actually updated a row
    if (!updateResult || updateResult.length === 0) {
      console.log('🟡 [ASSET-READY] No rows updated by mux_asset_id, trying upload_id fallback');
      
      // Fallback: Try to find by upload_id if asset_id didn't match
      if (data.upload_id) {
        console.log('🟡 [ASSET-READY] Upload ID available, attempting fallback update...');
        const { data: fallbackResult, error: fallbackError } = await supabase
          .from('video_assets')
          .update({
            ...updateData,
            mux_asset_id: data.id, // Also set the asset_id since it's missing
          })
          .eq('mux_upload_id', data.upload_id)
          .select('id');

        if (fallbackError) {
          console.error('❌ [ASSET-READY] Database error during fallback update:', fallbackError);
          return;
        }

        console.log('🟡 [ASSET-READY] Fallback update result:', fallbackResult);
        console.log('🟡 [ASSET-READY] Rows affected by fallback update:', fallbackResult?.length || 0);

        if (!fallbackResult || fallbackResult.length === 0) {
          console.error('❌ [ASSET-READY] No matching video record found for asset:', data.id, 'upload:', data.upload_id);
          console.error('❌ [ASSET-READY] This suggests the video record was never created or has different IDs');
          return;
        }

        console.log('✅ [ASSET-READY] Asset ready via upload_id fallback - success!');
      } else {
        console.error('❌ [ASSET-READY] No upload_id available for fallback, asset not found:', data.id);
        console.error('❌ [ASSET-READY] This suggests a webhook ordering issue or missing upload record');
        return;
      }
    } else {
      console.log('✅ [ASSET-READY] Asset ready via primary path - success!');
    }

    console.log('✅ [ASSET-READY] Handler completed successfully');
  } catch (error) {
    console.error('❌ [ASSET-READY] Unexpected error:', error);
    console.error('❌ [ASSET-READY] Error stack:', (error as Error).stack);
  }
}

/**
 * Handle upload asset created webhook - link upload to asset
 * Following MUX docs: https://docs.mux.com/guides/video/receive-webhooks
 */
async function handleUploadAssetCreated(data: {
  id: string;
  upload_id: string;
  status?: string;
}) {
  console.log('🟢 [UPLOAD-CREATED] Handler started');
  console.log('🟢 [UPLOAD-CREATED] Asset ID:', data.id);
  console.log('🟢 [UPLOAD-CREATED] Upload ID:', data.upload_id);
  console.log('🟢 [UPLOAD-CREATED] Status:', data.status || 'NOT PROVIDED');

  const supabase = supabaseAdmin;

  try {
    console.log('🟢 [UPLOAD-CREATED] Preparing update data...');
    
    // The data contains the new asset that was created from the upload
    // data.id is the asset ID, data.upload_id is the original upload ID
    
    const updateData = {
      mux_asset_id: data.id, // This is the actual asset ID
      status: 'processing',
      updated_at: new Date().toISOString(),
    };

    console.log('🟢 [UPLOAD-CREATED] Update data:', JSON.stringify(updateData, null, 2));
    console.log('🟢 [UPLOAD-CREATED] Searching for video record with upload_id:', data.upload_id);

    // Find video by upload ID and update with asset ID
    const { data: updateResult, error: updateError } = await supabase
      .from('video_assets')
      .update(updateData)
      .eq('mux_upload_id', data.upload_id)
      .select('id');

    if (updateError) {
      console.error('❌ [UPLOAD-CREATED] Database error:', updateError);
      return;
    }

    console.log('🟢 [UPLOAD-CREATED] Update result:', updateResult);
    console.log('🟢 [UPLOAD-CREATED] Rows affected:', updateResult?.length || 0);

    if (!updateResult || updateResult.length === 0) {
      console.error('❌ [UPLOAD-CREATED] No matching upload found for upload_id:', data.upload_id);
      console.error('❌ [UPLOAD-CREATED] This suggests the upload record was never created or has wrong ID');
      
      // Let's try to find what records exist for debugging
      console.log('🔍 [UPLOAD-CREATED] Attempting to find existing records...');
      const { data: existingRecords, error: searchError } = await supabase
        .from('video_assets')
        .select('id, mux_upload_id, mux_asset_id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (searchError) {
        console.error('❌ [UPLOAD-CREATED] Error searching for existing records:', searchError);
      } else {
        console.log('🔍 [UPLOAD-CREATED] Recent video records:', JSON.stringify(existingRecords, null, 2));
      }
      return;
    }

    console.log('✅ [UPLOAD-CREATED] Upload linked to asset successfully!');
    console.log('✅ [UPLOAD-CREATED] Handler completed successfully');
  } catch (error) {
    console.error('❌ [UPLOAD-CREATED] Unexpected error:', error);
    console.error('❌ [UPLOAD-CREATED] Error stack:', (error as Error).stack);
  }
}

/**
 * Handle asset errored webhook - mark video as errored
 */
async function handleAssetErrored(data: {
  id: string;
  errors?: Array<{ type: string; messages: string[] }>;
  upload_id?: string;
}) {
  console.log('🔴 [ASSET-ERROR] Handler started');
  console.log('🔴 [ASSET-ERROR] Asset ID:', data.id);
  console.log('🔴 [ASSET-ERROR] Upload ID:', data.upload_id || 'NOT PROVIDED');
  console.log('🔴 [ASSET-ERROR] Errors:', JSON.stringify(data.errors, null, 2));

  const supabase = supabaseAdmin;

  try {
    console.log('🔴 [ASSET-ERROR] Preparing error data...');
    // Extract error information
    const errorDetails = {
      type: 'asset_error',
      errors: data.errors || [],
      asset_id: data.id,
      timestamp: new Date().toISOString(),
    };

    const updateData = {
      status: 'errored' as const,
      error_details: errorDetails,
      updated_at: new Date().toISOString(),
    };

    console.log('🔴 [ASSET-ERROR] Update data:', JSON.stringify(updateData, null, 2));
    console.log('🔴 [ASSET-ERROR] Attempting primary update by asset_id...');

    // Try to update by asset_id first
    const { data: updateResult, error: updateError } = await supabase
      .from('video_assets')
      .update(updateData)
      .eq('mux_asset_id', data.id)
      .select('id');

    if (updateError) {
      console.error('❌ [ASSET-ERROR] Database error during primary update:', updateError);
      return;
    }

    console.log('🔴 [ASSET-ERROR] Primary update result:', updateResult);

    // Fallback to upload_id if asset_id didn't match
    if (!updateResult || updateResult.length === 0) {
      console.log('🟡 [ASSET-ERROR] No rows updated by asset_id, trying upload_id fallback');
      
      if (data.upload_id) {
        console.log('🟡 [ASSET-ERROR] Attempting fallback update by upload_id...');
        const { data: fallbackResult, error: fallbackError } = await supabase
          .from('video_assets')
          .update(updateData)
          .eq('mux_upload_id', data.upload_id)
          .select('id');

        if (fallbackError) {
          console.error('❌ [ASSET-ERROR] Database error during fallback update:', fallbackError);
          return;
        }

        console.log('🟡 [ASSET-ERROR] Fallback update result:', fallbackResult);

        if (!fallbackResult || fallbackResult.length === 0) {
          console.error('❌ [ASSET-ERROR] No matching video record found for errored asset:', data.id);
          return;
        }

        console.log('✅ [ASSET-ERROR] Asset error recorded via upload_id fallback');
      } else {
        console.error('❌ [ASSET-ERROR] No upload_id available for errored asset fallback:', data.id);
        return;
      }
    } else {
      console.log('✅ [ASSET-ERROR] Asset error recorded via primary path');
    }

    console.log('✅ [ASSET-ERROR] Handler completed successfully');
  } catch (error) {
    console.error('❌ [ASSET-ERROR] Unexpected error:', error);
    console.error('❌ [ASSET-ERROR] Error stack:', (error as Error).stack);
  }
}

/**
 * Handle upload errored webhook - mark upload as errored
 */
async function handleUploadErrored(data: {
  id: string;
  error?: { type: string; message: string };
}) {
  console.log('🔴 [UPLOAD-ERROR] Handler started');
  console.log('🔴 [UPLOAD-ERROR] Upload ID:', data.id);
  console.log('🔴 [UPLOAD-ERROR] Error details:', JSON.stringify(data.error, null, 2));

  const supabase = supabaseAdmin;

  try {
    console.log('🔴 [UPLOAD-ERROR] Preparing error data...');
    
    const errorDetails = {
      type: 'upload_error',
      error: data.error || { type: 'unknown', message: 'Upload failed' },
      upload_id: data.id,
      timestamp: new Date().toISOString(),
    };

    const updateData = {
      status: 'errored' as const,
      error_details: errorDetails,
      updated_at: new Date().toISOString(),
    };

    console.log('🔴 [UPLOAD-ERROR] Update data:', JSON.stringify(updateData, null, 2));
    console.log('🔴 [UPLOAD-ERROR] Searching for video record with upload_id:', data.id);

    const { data: updateResult, error: updateError } = await supabase
      .from('video_assets')
      .update(updateData)
      .eq('mux_upload_id', data.id)
      .select('id');

    if (updateError) {
      console.error('❌ [UPLOAD-ERROR] Database error:', updateError);
      return;
    }

    console.log('🔴 [UPLOAD-ERROR] Update result:', updateResult);

    if (!updateResult || updateResult.length === 0) {
      console.error('❌ [UPLOAD-ERROR] No matching upload found for errored upload_id:', data.id);
      return;
    }

    console.log('✅ [UPLOAD-ERROR] Upload error recorded successfully');
    console.log('✅ [UPLOAD-ERROR] Handler completed successfully');
  } catch (error) {
    console.error('❌ [UPLOAD-ERROR] Unexpected error:', error);
    console.error('❌ [UPLOAD-ERROR] Error stack:', (error as Error).stack);
  }
}

/**
 * Handle upload cancelled webhook - mark upload as errored or delete
 */
async function handleUploadCancelled(data: {
  id: string;
}) {
  console.log('🟡 [UPLOAD-CANCELLED] Handler started');
  console.log('🟡 [UPLOAD-CANCELLED] Upload ID:', data.id);

  const supabase = supabaseAdmin;

  try {
    console.log('🟡 [UPLOAD-CANCELLED] Preparing cancellation data...');
    
    const errorDetails = {
      type: 'upload_cancelled',
      upload_id: data.id,
      timestamp: new Date().toISOString(),
    };

    const updateData = {
      status: 'errored' as const,
      error_details: errorDetails,
      updated_at: new Date().toISOString(),
    };

    console.log('🟡 [UPLOAD-CANCELLED] Update data:', JSON.stringify(updateData, null, 2));
    console.log('🟡 [UPLOAD-CANCELLED] Searching for video record with upload_id:', data.id);

    // Mark as errored rather than deleting, for audit trail
    const { data: updateResult, error: updateError } = await supabase
      .from('video_assets')
      .update(updateData)
      .eq('mux_upload_id', data.id)
      .select('id');

    if (updateError) {
      console.error('❌ [UPLOAD-CANCELLED] Database error:', updateError);
      return;
    }

    console.log('🟡 [UPLOAD-CANCELLED] Update result:', updateResult);

    if (!updateResult || updateResult.length === 0) {
      console.warn('⚠️ [UPLOAD-CANCELLED] No matching upload found for cancelled upload_id:', data.id);
      return;
    }

    console.log('✅ [UPLOAD-CANCELLED] Upload cancellation recorded successfully');
    console.log('✅ [UPLOAD-CANCELLED] Handler completed successfully');
  } catch (error) {
    console.error('❌ [UPLOAD-CANCELLED] Unexpected error:', error);
    console.error('❌ [UPLOAD-CANCELLED] Error stack:', (error as Error).stack);
  }
}