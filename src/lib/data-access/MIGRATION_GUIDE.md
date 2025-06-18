# Data Access Layer Migration Guide

This guide helps developers migrate existing code from direct Supabase calls to using the repository pattern.

## Current Status

### ✅ Completed

- **User Repository** - Basic CRUD operations for users
- **Post Repository** - Posts, reactions, and bookmarks
- **Follow Repository** - Follow/unfollow functionality
- **Notification Schema** - Schema ready, repository pending

### 🚧 TODO

- Message/Conversation Repository
- Collective Repository
- Comment Repository
- Chain Repository
- Video Asset Repository

## Migration Steps

### 1. Identify Direct Supabase Calls

Look for patterns like:

```typescript
await supabase.from('table_name').select();
await supabase.from('table_name').insert();
await supabase.from('table_name').update();
await supabase.from('table_name').delete();
```

### 2. Replace with Repository Methods

#### Before (Direct Supabase):

```typescript
// In a component or API route
const { data, error } = await supabase
  .from('posts')
  .select('*')
  .eq('author_id', userId);

if (data) {
  // Check for null fields
  if (data.thumbnail_url !== null) {
    // Use thumbnail
  }
}
```

#### After (Repository Pattern):

```typescript
// In a component or API route
import { PostRepository } from '@/lib/data-access/post.repository';

const postRepo = new PostRepository(supabase);
const posts = await postRepo.getByAuthor(userId);

// No null checks needed - all nullable fields are undefined
if (posts[0]?.thumbnail_url) {
  // Use thumbnail
}
```

### 3. Common Patterns

#### Reactions/Likes

```typescript
// Before
await supabase.from('post_reactions').upsert({
  user_id: userId,
  post_id: postId,
  type: 'like',
});

// After
await postRepo.addReaction(postId, userId, 'like');
```

#### Bookmarks

```typescript
// Before
await supabase.from('post_bookmarks').delete().match({
  user_id: userId,
  post_id: postId,
});

// After
await postRepo.removeBookmark(postId, userId);
```

#### Follows

```typescript
// Before
await supabase.from('follows').insert({
  follower_id: userId,
  following_id: targetId,
  following_type: 'user',
});

// After
const followRepo = new FollowRepository(supabase);
await followRepo.follow({
  follower_id: userId,
  following_id: targetId,
  following_type: 'user',
});
```

## Creating New Repositories

### 1. Create the Schema

Create a schema file in `src/lib/data-access/schemas/[entity].schema.ts`:

```typescript
import { z } from 'zod';

export const EntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  // For nullable fields, transform null to undefined
  description: z
    .string()
    .nullable()
    .transform((val) => val ?? undefined),
  created_at: z.string(),
});

export type Entity = z.infer<typeof EntitySchema>;

// For inserts/updates, transform undefined back to null
export const EntityInsertSchema = z.object({
  name: z.string(),
  description: z
    .string()
    .optional()
    .transform((val) => val ?? null),
});

export type EntityInsert = z.input<typeof EntityInsertSchema>;
```

### 2. Create the Repository

Create a repository file in `src/lib/data-access/[entity].repository.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr';

import {
  parseEntity,
  EntityInsertSchema,
  type Entity,
  type EntityInsert,
} from './schemas/entity.schema';

import type { Database } from '@/lib/database.types';

export class EntityRepository {
  constructor(
    private supabase: ReturnType<typeof createBrowserClient<Database>>,
  ) {}

  async getById(id: string): Promise<Entity | undefined> {
    const { data, error } = await this.supabase
      .from('entities')
      .select('*')
      .eq('id', id)
      .single();

    if (error !== undefined || data === null) {
      return undefined;
    }

    return parseEntity(data);
  }

  async create(entity: EntityInsert): Promise<Entity | undefined> {
    const dbEntity = EntityInsertSchema.parse(entity);

    const { data, error } = await this.supabase
      .from('entities')
      .insert(dbEntity)
      .select()
      .single();

    if (error !== undefined || data === null) {
      return undefined;
    }

    return parseEntity(data);
  }
}
```

## Best Practices

1. **Always parse through Zod** - Never return raw database results
2. **Return undefined, not null** - The schemas handle the conversion
3. **Use specific error handling** - Check `error !== undefined` instead of just `error`
4. **Document null handling** - If a method needs to clear a field, document it
5. **Keep repositories focused** - One repository per main entity

## Common Issues

### ESLint Errors

- **`unicorn/no-null`** - Only allowed in schema files (automatically configured)
- **`strict-boolean-expressions`** - Use explicit checks like `error !== undefined`
- **Import order** - Keep imports grouped: external, internal, types

### Type Mismatches

If you get type errors about null/undefined:

1. Check that you're using the parsed types, not raw database types
2. Ensure you're using the repository methods, not direct Supabase calls
3. Verify that optional fields use `?.` optional chaining

## Examples to Study

- `HomePageClient.tsx` - Shows migration of post interactions
- `PostRepository` - Complete example with reactions and bookmarks
- `UserRepository` - Basic CRUD pattern
- `FollowRepository` - Relationship management pattern
