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
  try {
    // Get the raw body for signature verification
    const rawBody = await request.text();
    
    // Get signature header
    const signatureHeader = request.headers.get('Mux-Signature');
    if (!signatureHeader) {
      console.error('Missing Mux-Signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Verify the signature
    if (!isValidMuxSignature(rawBody, signatureHeader, WEBHOOK_SECRET)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the verified body
    const body = JSON.parse(rawBody);
    const { type, data } = body;

    console.info('MUX Webhook received:', type, data?.id);

    if (type === 'video.asset.ready') {
      await handleAssetReady(data);
    } else if (type === 'video.upload.asset_created') {
      await handleUploadAssetCreated(data);
    } else {
      console.info('Unhandled webhook type:', type);
    }

    return NextResponse.json({ message: 'ok' });
  } catch (error) {
    console.error('Webhook processing error:', error);
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
  try {
    // MUX signature format: "t=timestamp,v1=signature"
    const parts = header.split(',');
    const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
    const signature = parts.find(p => p.startsWith('v1='))?.slice(3);

    if (!timestamp || !signature) {
      console.error('Invalid signature header format');
      return false;
    }

    // Create the signed payload by concatenating timestamp and body
    const payload = `${timestamp}.${rawBody}`;
    
    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch (error) {
    console.error('Signature verification error:', error);
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
  const supabase = supabaseAdmin;

  try {
    console.info('handleAssetReady data:', JSON.stringify(data, null, 2));
    
    // Update video with asset details following MUX's response structure
    const updateData = {
      status: data.status || 'ready',
      duration: data.duration,
      aspect_ratio: data.aspect_ratio,
      mux_playback_id: data.playback_ids?.[0]?.id || null,
      updated_at: new Date().toISOString(),
    };

    // MUX ready webhooks may fire before we've swapped the upload ID for the asset ID.
    // Update the row where mux_asset_id matches EITHER the asset_id (data.id) OR the original upload_id.
    const { error: updateError } = await supabase
      .from('video_assets')
      .update(updateData)
      .or(`mux_asset_id.eq.${data.id},mux_asset_id.eq.${data.upload_id ?? '___ignore___'}`);

    if (updateError) {
      console.error('Failed to update asset:', updateError);
    } else {
      console.info('Asset ready:', data.id);
    }
  } catch (error) {
    console.error('Error in handleAssetReady:', error);
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
  const supabase = supabaseAdmin;

  try {
    console.info('handleUploadAssetCreated data:', JSON.stringify(data, null, 2));
    
    // The data contains the new asset that was created from the upload
    // data.id is the asset ID, data.upload_id is the original upload ID
    
    // Find video by upload ID and update with asset ID
    const { error: updateError } = await supabase
      .from('video_assets')
      .update({
        mux_asset_id: data.id, // This is the actual asset ID
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('mux_asset_id', data.upload_id); // Match by upload ID

    if (updateError) {
      console.error('Failed to link upload to asset:', updateError);
    } else {
      console.info('Linked upload to asset:', data.upload_id, '->', data.id);
    }
  } catch (error) {
    console.error('Error in handleUploadAssetCreated:', error);
  }
}