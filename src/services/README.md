# MUX Integration

Direct MUX video streaming integration following their documented best practices using the official MUX Node SDK.

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

### Direct MUX SDK Integration

```typescript
import Mux from '@mux/mux-node';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

// Create direct upload URL
const directUpload = await mux.video.uploads.create({
  cors_origin: 'https://yoursite.com',
  new_asset_settings: {
    playback_policy: ['public'],
    encoding_tier: 'smart',
  },
});

// Upload file directly to MUX
// PUT file to directUpload.url
```

## How it works

1. Client requests upload URL from `/api/videos/upload-url`
2. Server creates MUX direct upload URL using official SDK and saves metadata to database
3. Client uploads file directly to MUX using PUT request
4. MUX processes video and sends webhooks when ready
5. Webhook handler updates database with asset status

The system uses MUX's official Node SDK directly in API routes, following their recommended integration patterns without custom wrappers.
