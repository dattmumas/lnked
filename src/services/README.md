# Video System Documentation

Complete video upload, management, and streaming system with Mux integration, private video support, and enhanced security.

## Quick Start

### Environment Variables

Add these to your `.env.local`:

```bash
# Mux Configuration (Required)
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
MUX_WEBHOOK_SECRET=your_webhook_secret

# Mux Signed URLs for Private Videos (Required for private videos)
MUX_SIGNING_KEY_ID=your_signing_key_id
MUX_SIGNING_SECRET=your_rsa_private_key_content
```

**⚠️ Important**: Without `MUX_SIGNING_KEY_ID` and `MUX_SIGNING_SECRET`, private videos will not work.

## Features

### ✨ Enhanced Upload System

- **Single-form upload** (replaces old 4-step wizard)
- **Real-time progress tracking** with cancellation support
- **Draft auto-saving** (1-second debounce)
- **File validation** (10GB limit, MP4/MOV/AVI types)
- **Modern async patterns** with proper error handling

### 🔐 Security & Privacy

- **Public/Private videos** with proper access control
- **JWT-signed URLs** for private video playback (1-hour expiry)
- **Collective membership** validation for shared access
- **Enhanced soft delete** with data anonymization

### 🗑️ Data Management

- **Soft delete with timestamps** (`deleted_at` column)
- **Data anonymization** on deletion (title → '[Deleted Video]')
- **Analytics preservation** (maintains relationships for reporting)
- **RLS-compliant queries** (automatically excludes deleted videos)

## API Endpoints

### Video Upload Flow

#### 1. Create Upload URL

```typescript
POST /api/videos/upload-url
Content-Type: application/json

{
  "title": "My Video",
  "description": "Video description",
  "privacy_setting": "public" | "private",
  "encoding_tier": "baseline" | "plus",
  "collective_id": "uuid" // optional
}

Response:
{
  "uploadUrl": "https://storage.googleapis.com/...",
  "video": { id: "uuid", ... }
}
```

#### 2. Upload File

```typescript
// Direct upload to Mux (no server involved)
PUT uploadUrl
Content-Type: video/mp4
Body: <file data>
```

#### 3. Update Video Metadata

```typescript
PATCH /api/videos/{id}
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "Updated description",
  "privacy_setting": "private"
}
```

### Private Video Access

#### 4. Get Signed URL (Private Videos Only)

```typescript
GET /api/videos/{id}/signed-url
Authorization: Bearer <token>

Response:
{
  "signedUrl": "https://stream.mux.com/{playback_id}.m3u8?token=..."
}

// Access Control:
// - Video owner: ✅ Always allowed
// - Collective member: ✅ If video belongs to collective
// - Public: ❌ Forbidden
```

### Video Management

#### List User Videos

```typescript
GET /api/videos?page=1&limit=20&search=term&status=ready&sort=created_at&order=desc

Response:
{
  "success": true,
  "data": {
    "videos": [...],
    "pagination": { page, limit, hasMore, nextPage }
  }
}
```

#### Get Single Video

```typescript
GET /api/videos/{id}

Response:
{
  "data": {
    "id": "uuid",
    "title": "Video Title",
    "mux_playback_id": "playback123",
    "is_public": true,
    "playback_policy": "public",
    // ... other fields
  }
}
```

#### Delete Video (Enhanced Soft Delete)

```typescript
DELETE / api / videos / { id };

// Actions performed:
// 1. Sets deleted_at timestamp
// 2. Anonymizes: title → '[Deleted Video]', description → null
// 3. Cleans up Mux resources in background
// 4. Preserves analytics relationships

Response: 202(Accepted);
```

## Usage Examples

### Frontend Upload Component

```typescript
import VideoUploadForm from '@/components/app/video/wizard/VideoUploadForm';

function UploadPage() {
  const handleComplete = (videoId: string) => {
    router.push(`/videos/${videoId}`);
  };

  return (
    <VideoUploadForm
      collectiveId="optional-collective-id"
      onComplete={handleComplete}
      onCancel={() => router.back()}
    />
  );
}
```

### Video Player Component

```typescript
import VideoPlayerClient from '@/components/app/video/VideoPlayerClient';

function VideoPage({ video }) {
  return (
    <VideoPlayerClient
      video={{
        id: video.id,
        title: video.title,
        mux_playback_id: video.mux_playback_id,
        is_public: video.is_public,
        playback_policy: video.playback_policy
      }}
    />
  );
}
```

### Direct Mux SDK Usage

```typescript
import Mux from '@mux/mux-node';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

// Create direct upload with privacy settings
const upload = await mux.video.uploads.create({
  cors_origin: process.env.NEXT_PUBLIC_APP_URL!,
  new_asset_settings: {
    playback_policy: ['signed'], // 'public' or 'signed'
    encoding_tier: 'baseline', // or 'plus'
  },
});
```

## Database Schema

### video_assets Table

```sql
CREATE TABLE video_assets (
  id UUID PRIMARY KEY,
  title TEXT,
  description TEXT,
  mux_asset_id TEXT,
  mux_playback_id TEXT,
  mux_upload_id TEXT,
  is_public BOOLEAN DEFAULT true,
  playback_policy TEXT DEFAULT 'public',
  encoding_tier TEXT DEFAULT 'baseline',
  status TEXT DEFAULT 'preparing',
  duration INTEGER,
  created_by UUID REFERENCES users(id),
  collective_id UUID REFERENCES collectives(id),
  comment_count BIGINT DEFAULT 0,
  deleted_at TIMESTAMP WITH TIME ZONE, -- ✨ New: Soft delete
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_video_assets_deleted_at ON video_assets(deleted_at);
CREATE INDEX idx_video_assets_active ON video_assets(created_by, deleted_at)
WHERE deleted_at IS NULL;
```

### RLS Policies (Updated)

```sql
-- Only show active (non-deleted) videos
CREATE POLICY "Users can view their own active video assets" ON video_assets
FOR SELECT USING (created_by = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can update their own active video assets" ON video_assets
FOR UPDATE USING (created_by = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can soft delete their own video assets" ON video_assets
FOR UPDATE USING (created_by = auth.uid());
```

## Performance Optimizations

### Upload Performance

- **Direct uploads to Mux** (no server bottleneck)
- **Debounced draft saving** (reduces server load)
- **Upload cancellation** (proper AbortController usage)
- **Progress tracking** (XHR with progress events)

### Query Performance

- **Minimal field projection** for list views
- **Optimized pagination** (keyset pagination ready)
- **Efficient filtering** with proper indexes
- **ETag caching** for individual video requests

### Frontend Performance

- **Dynamic imports** with SSR disabled for video players
- **Memoized components** to prevent unnecessary re-renders
- **Lazy loading** for large video lists

## Security Features

### Access Control

```typescript
// Video access validation
function validateVideoAccess(
  userId: string,
  videoOwnerId: string,
  collectiveId?: string,
  userCollectiveIds?: string[],
): boolean {
  // Owner always has access
  if (userId === videoOwnerId) return true;

  // Check collective membership
  if (collectiveId && userCollectiveIds?.includes(collectiveId)) {
    return true;
  }

  return false;
}
```

### Signed URL Security

- **1-hour token expiry** (configurable)
- **RS256 algorithm** for JWT signing
- **Audience validation** ('MuxVideo')
- **Cache headers** (5-minute cache for signed URLs)

## Troubleshooting

### Common Issues

**Private videos not playing:**

```bash
# Check environment variables
echo $MUX_SIGNING_KEY_ID
echo $MUX_SIGNING_SECRET

# Verify Mux Dashboard → Settings → Signing Keys
```

**Upload failures:**

```bash
# Check file size (max 10GB)
# Verify file type (MP4/MOV/AVI)
# Check browser console for CORS errors
```

**Build errors:**

```bash
npm run build
# Look for TypeScript/ESLint errors
# Check import paths after refactor
```

### Monitoring & Debugging

#### Server Logs

```typescript
// Enable detailed logging
console.log('[video_upload]', { user_id, file_size, encoding_tier });
console.error('[mux_error]', { error, video_id, operation });
```

#### Performance Monitoring

```typescript
// Track upload metrics
const uploadStart = Date.now();
// ... upload logic
const uploadDuration = Date.now() - uploadStart;
console.log('[upload_performance]', { duration: uploadDuration, file_size });
```

## Migration Notes

### From Old System (4-step wizard)

- ✅ **Automatic**: `VideoUploadPageClient` already updated
- ✅ **Automatic**: `VideoPlayerClient` already enhanced
- ✅ **Automatic**: All deprecated files removed
- ✅ **Database**: `deleted_at` column added via migration

### Breaking Changes

- **None**: All changes are backward compatible
- **Enhancement**: Private videos now work (previously broken)
- **Enhancement**: Much simpler upload UX (single form vs 4 steps)

## Future Enhancements

### Planned Features

- **Upload resume** for large files
- **Batch upload** capabilities
- **Video thumbnails** and preview generation
- **Analytics dashboard** for video metrics
- **Advanced video management** (playlists, collections)

### Performance Improvements

- **Keyset pagination** for large video lists
- **CDN integration** for static assets
- **WebRTC** for real-time upload progress
- **Background processing** queue for Mux operations
