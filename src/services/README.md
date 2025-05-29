# MUX Service

A simple service for MUX video streaming integration following their documented direct upload approach.

## Setup

Add these environment variables:

```bash
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
MUX_WEBHOOK_SECRET=your_webhook_secret
```

## Usage

### Upload Video

```typescript
import { uploadService } from '@/lib/services/upload-service';

const result = await uploadService.uploadVideo(file, {
  title: 'My Video',
  description: 'Video description',
  is_public: true,
});
```

### Direct MUX Integration

```typescript
import { muxService } from '@/services/MuxService';

// Create direct upload URL
const uploadResult = await muxService.createDirectUpload({
  cors_origin: 'https://yoursite.com',
  new_asset_settings: {
    playback_policy: ['public'],
    encoding_tier: 'smart',
  },
});

// Upload file directly to MUX
// PUT file to uploadResult.data.url
```

## How it works

1. Client requests upload URL from `/api/videos/upload-url`
2. Server creates MUX direct upload URL and saves metadata to database
3. Client uploads file directly to MUX using PUT request
4. MUX processes video and sends webhooks when ready
5. Webhook handler updates database with asset status

The system is designed to be simple and leverage MUX's built-in capabilities rather than reimplementing video upload management.
