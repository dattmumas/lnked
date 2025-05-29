# Video Components Guide

## 🎯 Overview

This guide documents the simplified video uploader component for MUX video streaming integration. The implementation follows MUX's documented direct upload approach for simplicity and reliability.

## 📦 Components

### VideoUploader Component

**Location**: `src/components/app/uploads/VideoUploader.tsx`

A simple, reliable video uploader that uses MUX's direct upload functionality.

#### Features

- ✅ **MUX Direct Upload** - Uses MUX's documented upload approach
- ✅ **Drag & Drop** - Modern file selection interface
- ✅ **Progress Tracking** - Real-time upload progress
- ✅ **Multiple Files** - Upload multiple videos simultaneously
- ✅ **Metadata Editing** - Add title, description, and privacy settings
- ✅ **Error Handling** - Clear error messages and retry options
- ✅ **File Validation** - Type and size validation

#### Props Interface

```typescript
interface VideoUploaderProps {
  onUploadComplete?: (assetId: string, metadata: VideoFile['metadata']) => void;
  onUploadError?: (error: string) => void;
  collectiveId?: string;
  maxFiles?: number;
  acceptedTypes?: string[];
}
```

#### Usage Examples

**Basic Video Uploader**:

```tsx
import VideoUploader from '@/components/app/uploads/VideoUploader';

function UploadPage() {
  return (
    <VideoUploader
      onUploadComplete={(assetId, metadata) => {
        console.log('Upload completed:', assetId, metadata);
      }}
      onUploadError={(error) => {
        console.error('Upload failed:', error);
      }}
    />
  );
}
```

**Collective Video Upload**:

```tsx
<VideoUploader
  collectiveId="collective-uuid"
  maxFiles={3}
  onUploadComplete={(assetId, metadata) => {
    // Redirect to video management or show success message
    router.push(`/dashboard/videos/${assetId}`);
  }}
/>
```

## 🔧 API Integration

### Required API Endpoints

The uploader integrates with these API endpoints:

#### Video Upload

- `POST /api/videos/upload-url` - Create MUX direct upload URL

#### Webhook Processing

- `POST /api/mux-webhook` - Handle MUX webhooks for asset status updates

### Upload API Example

```typescript
// Create upload URL
const createUploadUrl = async (metadata: VideoUploadMetadata) => {
  const response = await fetch('/api/videos/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata),
  });

  const data = await response.json();
  return data.data; // { upload_url, asset_id, expires_at }
};

// Upload file directly to MUX
const uploadFile = async (file: File, uploadUrl: string) => {
  return fetch(uploadUrl, {
    method: 'PUT',
    body: file,
  });
};
```

## 🎨 Styling

The component uses Tailwind CSS with shadcn/ui components for a modern, accessible interface.

## 📱 Mobile Support

- Touch-friendly drag & drop
- File browser integration
- Responsive layout
- Mobile-optimized progress indicators

## 🔒 Security

- File type validation
- Size limits (5GB default)
- Server-side validation
- Secure direct upload to MUX

## 🚀 How It Works

1. **User selects video files** - Through drag & drop or file browser
2. **Client requests upload URL** - POST to `/api/videos/upload-url`
3. **Server creates MUX upload URL** - Using MUX direct upload API
4. **Server saves video metadata** - Basic info stored in database
5. **Client uploads directly to MUX** - PUT request to MUX upload URL
6. **MUX processes video** - Automatic transcoding and optimization
7. **MUX sends webhook** - Notifies server when processing complete
8. **Server updates status** - Marks video as ready for playback

## 🧪 Testing

```typescript
// Test video uploader
import { render, screen } from '@testing-library/react';
import VideoUploader from '@/components/app/uploads/VideoUploader';

test('renders upload interface', () => {
  render(<VideoUploader />);
  expect(screen.getByText('Upload Videos')).toBeInTheDocument();
});
```

## 🔧 Environment Setup

```bash
# Required environment variables
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
MUX_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 📊 Benefits of This Approach

- **Simple & Reliable** - Follows MUX's documented best practices
- **Scalable** - MUX handles file processing and optimization
- **Cost Effective** - No custom upload infrastructure needed
- **Fast** - Direct upload to MUX's optimized servers
- **Secure** - Built-in validation and signed URLs

This simplified approach leverages MUX's proven infrastructure instead of building complex custom upload management.
