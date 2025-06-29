# Server-Side Data Fetching Analysis & Recommendations

## Executive Summary

The codebase shows significant over-reliance on client-side data fetching using React Query, resulting in:

- Larger JavaScript bundles sent to clients
- Slower initial page loads
- Missed SEO opportunities
- Unnecessary API calls from browsers
- Poor perceived performance

## Current State Analysis

### 1. Client-Heavy Components

#### Home Feed (`/home`)

- **Current**: `HomePageClient.tsx` uses `useTenantFeed` hook with React Query
- **Issues**:
  - Fetches all feed data client-side
  - Multiple API calls on mount
  - No server-side rendering benefits
  - Large initial JavaScript execution

#### Video Management (`/videos`)

- **Current**: `VideoManagementDashboard.tsx` is entirely client-side
- **Issues**:
  - Complex state management in browser
  - Multiple parallel API calls
  - No initial data from server
  - Polling for video processing status

#### Chat/Conversations

- **Current**: All chat data fetched via React Query hooks
- **Issues**:
  - Initial conversation list requires client fetch
  - No pre-rendered conversation data
  - Delayed time to interactive

#### User Dashboard

- **Good Example**: Dashboard page already uses server components!
- Shows proper pattern with parallel data fetching
- Uses RPC functions for optimized queries

### 2. Hook Proliferation

Found 50+ instances of React Query usage:

- `useQuery`: Profile data, feed items, conversations
- `useMutation`: Follow actions, post updates
- `useInfiniteQuery`: Message pagination

## Recommendations

### 1. Immediate Wins - Convert Read-Heavy Pages

#### Home Feed Refactor

```typescript
// src/app/(app)/home/page.tsx
export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Fetch initial feed data server-side
  const [feedData, tenantData] = await Promise.all([
    supabase.rpc('get_tenant_feed', {
      user_id: user.id,
      limit: 20,
      offset: 0
    }),
    supabase.rpc('get_user_tenants', {
      target_user_id: user.id
    })
  ]);

  return (
    <HomePageClient
      initialFeed={feedData}
      initialTenants={tenantData}
      userId={user.id}
    />
  );
}
```

#### Video Library Refactor

```typescript
// src/app/(app)/videos/page.tsx
export default async function VideosPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Pre-fetch video data
  const initialVideos = await supabase
    .from('video_assets')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  return <VideoManagementDashboard initialData={initialVideos.data} />;
}
```

### 2. Pattern Migration Strategy

#### Step 1: Create Server-Side Data Loaders

```typescript
// src/lib/data-loaders/feed.ts
export async function loadUserFeed(userId: string, options?: FeedOptions) {
  const supabase = await createServerSupabaseClient();
  // Centralized feed loading logic
  return supabase.rpc('get_user_feed', { ...options });
}
```

#### Step 2: Update Client Components to Accept Initial Data

```typescript
// src/components/app/home/CenterFeed.tsx
interface Props {
  initialData?: FeedItem[];
  user: User;
}

export function CenterFeed({ initialData, user }: Props) {
  const { feedItems, isLoading } = useTenantFeed({
    initialData, // Pass to React Query as initial data
    // ... other options
  });
}
```

#### Step 3: Progressive Enhancement

- Keep React Query for updates/mutations
- Use server data for initial render
- Implement proper cache headers

### 3. Architecture Guidelines

#### When to Use Server Components:

- Initial page loads
- SEO-critical content
- Read-heavy operations
- Data that doesn't change frequently

#### When to Keep Client-Side:

- Real-time updates (chat, notifications)
- User interactions (likes, comments)
- Optimistic updates
- Frequently changing data

### 4. Implementation Priorities

1. **High Priority** (SEO & Performance Critical):

   - Public profile pages (already done ✓)
   - Home feed
   - Post listings
   - Collective pages

2. **Medium Priority** (User Experience):

   - Video library
   - Dashboard sections
   - Search results

3. **Low Priority** (Keep Client-Side):
   - Chat/messaging
   - Real-time notifications
   - Live interactions

### 5. Performance Metrics to Track

- **Before Migration**:

  - Time to First Byte (TTFB)
  - First Contentful Paint (FCP)
  - Time to Interactive (TTI)
  - Bundle size

- **Expected Improvements**:
  - 30-50% reduction in TTI
  - 40-60% improvement in FCP
  - Significant SEO improvements
  - Reduced API calls from clients

### 6. Migration Checklist

- [ ] Create RPC functions for common data patterns
- [ ] Update page components to async server components
- [ ] Pass initial data to client components
- [ ] Configure React Query to use server data as initial cache
- [ ] Add proper error boundaries
- [ ] Implement loading.tsx files for streaming
- [ ] Add cache headers for static content
- [ ] Monitor performance metrics

## Code Examples

### Before (Client-Side):

```typescript
'use client';
export default function HomePage() {
  const { feedItems, isLoading } = useFeed();

  if (isLoading) return <Spinner />;

  return <FeedList items={feedItems} />;
}
```

### After (Server-Side):

```typescript
// page.tsx
export default async function HomePage() {
  const feedItems = await loadFeedItems();

  return (
    <Suspense fallback={<FeedSkeleton />}>
      <HomePageClient initialItems={feedItems} />
    </Suspense>
  );
}

// HomePageClient.tsx
'use client';
export default function HomePageClient({ initialItems }) {
  const { feedItems } = useFeed({
    initialData: initialItems
  });

  return <FeedList items={feedItems} />;
}
```

## Conclusion

Moving from client-side to server-side data fetching will significantly improve:

- Initial page load performance
- SEO capabilities
- User experience
- Server resource utilization

The migration can be done incrementally, starting with the highest-impact pages and gradually moving through the application.
