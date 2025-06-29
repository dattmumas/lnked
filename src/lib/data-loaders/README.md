# Server-Side Data Loaders

This directory contains server-side data loading functions that can be used in Next.js server components to pre-fetch data before rendering.

## Pattern Overview

Instead of fetching data client-side with React Query, we can:

1. **Pre-fetch data** in server components
2. **Pass initial data** to client components
3. **Use React Query** for updates/mutations only

## Example Implementation

### 1. Create a Data Loader

```typescript
// src/lib/data-loaders/feed-loader.ts
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function loadUserFeed(userId: string, limit = 20) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc('get_user_feed', {
    p_user_id: userId,
    p_limit: limit,
    p_offset: 0,
  });

  if (error) throw error;
  return data;
}
```

### 2. Use in Server Component

```typescript
// src/app/(app)/feed/page.tsx
import { loadUserFeed } from '@/lib/data-loaders/feed-loader';

export default async function FeedPage() {
  const { user } = await getUser();
  const initialFeed = await loadUserFeed(user.id);

  return <FeedClient initialData={initialFeed} />;
}
```

### 3. Update Client Component

```typescript
// src/app/(app)/feed/FeedClient.tsx
'use client';

export function FeedClient({ initialData }) {
  const { data } = useQuery({
    queryKey: ['feed'],
    queryFn: fetchFeed,
    initialData, // Use server data as initial cache
  });

  return <FeedList items={data} />;
}
```

## Benefits

1. **Faster Initial Load**: Data is ready when HTML is sent
2. **Better SEO**: Content is in the initial HTML
3. **Reduced Client Bundle**: Less JavaScript to parse
4. **Progressive Enhancement**: Works without JavaScript

## When to Use

- **Public pages** (profiles, posts, collectives)
- **Initial page loads**
- **SEO-critical content**
- **Static or semi-static data**

## When NOT to Use

- **Real-time data** (chat, notifications)
- **Frequently changing data**
- **User-specific interactions**
- **Optimistic updates**
