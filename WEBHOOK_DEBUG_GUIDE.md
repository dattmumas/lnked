# MUX Webhook Debugging Guide

## 🔍 Current Issues Identified

1. **Webhook Secret Configuration**

   - Environment variable `MUX_WEBHOOK_SECRET` is using a hardcoded fallback
   - The secret must match EXACTLY what's configured in MUX Dashboard

2. **Data Structure Mismatches**

   - `video.upload.asset_created` webhook structure may differ from expectations
   - Database uses `created_by` but code sometimes references `owner_id`

3. **Status Update Chain**
   - Upload ID → Asset ID transition not always captured
   - Webhooks may arrive out of order

## 🛠️ Debugging Steps

### 1. Verify Webhook Configuration

#### Check MUX Dashboard

1. Go to [MUX Dashboard](https://dashboard.mux.com)
2. Navigate to Settings → Webhooks
3. Verify webhook URL points to your endpoint
4. Copy the webhook signing secret

#### Update Environment Variables

```bash
# .env.local
MUX_WEBHOOK_SECRET=your_actual_webhook_secret_from_dashboard
```

### 2. Test Webhook Locally

#### Using ngrok (Recommended)

```bash
# Install ngrok
brew install ngrok  # or download from ngrok.com

# Start your Next.js app
npm run dev

# In another terminal, expose local server
ngrok http 3000

# Update MUX webhook URL to ngrok URL
# Example: https://abc123.ngrok.io/api/mux-webhook
```

#### Test with Script

```bash
# Install dependencies
npm install node-fetch

# Run test script
node test-mux-webhook.js
```

### 3. Monitor Webhook Logs

Add detailed logging to webhook handler:

```typescript
// In src/app/api/mux-webhook/route.ts
console.log('Raw webhook body:', rawBody);
console.log('Webhook headers:', Object.fromEntries(request.headers.entries()));
console.log('Parsed webhook data:', JSON.stringify(body, null, 2));
```

### 4. Common Webhook Event Structures

#### video.upload.asset_created

```json
{
  "type": "video.upload.asset_created",
  "data": {
    "id": "asset-id-here",
    "upload_id": "upload-id-here",
    "status": "preparing",
    "created_at": 1234567890
  }
}
```

#### video.asset.ready

```json
{
  "type": "video.asset.ready",
  "data": {
    "id": "asset-id-here",
    "status": "ready",
    "duration": 120.5,
    "aspect_ratio": "16:9",
    "playback_ids": [
      {
        "id": "playback-id-here",
        "policy": "public"
      }
    ]
  }
}
```

## 🔧 Fixes Applied

### 1. Enhanced Webhook Handler

- Added detailed logging for debugging
- Fixed data structure handling
- Improved error handling

### 2. Database Updates

- Handle both `upload_id` and asset `id` properly
- Update status correctly based on webhook type

### 3. Refresh API Improvements

- Better handling of upload ID vs asset ID
- Fallback logic for MUX API responses

## 📊 Monitoring Webhook Health

### Check Database State

```sql
-- Check videos stuck in preparing state
SELECT id, title, status, mux_asset_id, created_at, updated_at
FROM video_assets
WHERE status = 'preparing'
AND created_at < NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;

-- Check if upload IDs are being replaced with asset IDs
SELECT id, title, mux_asset_id
FROM video_assets
WHERE mux_asset_id LIKE 'upload-%';
```

### Verify Webhook Processing

1. Upload a test video
2. Monitor server logs for webhook events
3. Check database updates in real-time
4. Use refresh button to manually update status

## 🚨 Troubleshooting Checklist

- [ ] Webhook secret matches MUX dashboard exactly
- [ ] Webhook URL is publicly accessible (use ngrok for local)
- [ ] Server logs show webhook received
- [ ] Signature verification passes
- [ ] Database updates after webhook
- [ ] Refresh API works for stuck videos

## 📝 Next Steps

1. **Configure Production Webhook**

   - Set proper webhook URL in MUX dashboard
   - Ensure webhook secret is in environment variables
   - Test with real uploads

2. **Monitor Webhook Performance**

   - Set up alerts for failed webhooks
   - Monitor webhook processing time
   - Track webhook success rate

3. **Implement Webhook Retry Logic**
   - Store failed webhooks for retry
   - Implement exponential backoff
   - Alert on repeated failures
