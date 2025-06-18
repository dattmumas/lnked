# Data Access Layer

This directory contains the data access layer for the application, providing a clean abstraction over Supabase database operations. All database interactions should go through these repositories to ensure proper type handling and null/undefined conversions.

## Architecture

The data access layer follows the Repository pattern with Zod schema validation:

```
data-access/
├── schemas/              # Zod schemas with null→undefined transform
├── *.repository.ts       # Repository classes for each entity
├── README.md            # This file
└── MIGRATION_GUIDE.md   # Guide for migrating existing code
```

## Key Features

1. **Automatic null/undefined conversion**: Supabase returns `null` for nullable fields, but our codebase uses `undefined`. The schemas automatically handle this conversion.

2. **Type safety**: All database responses are validated through Zod schemas before being returned.

3. **Centralized error handling**: Database errors are handled consistently across all repositories.

4. **Consistent API**: All repositories follow the same patterns for common operations.

## Available Repositories

### UserRepository

Handles user-related operations:

- `getById(id)` - Get user by ID
- `getByUsername(username)` - Get user by username
- `update(id, updates)` - Update user profile
- `search(query)` - Search users

### PostRepository

Manages blog posts and articles:

- `create(post)` - Create new post
- `getById(id)` - Get post by ID
- `getBySlug(slug)` - Get post by slug
- `getByAuthor(authorId)` - Get posts by author
- `update(id, updates)` - Update post
- `delete(id)` - Soft delete post
- `addReaction(postId, userId, type)` - Add reaction
- `search(query)` - Search posts

### FollowRepository

Handles follow relationships:

- `follow(data)` - Create follow relationship
- `unfollow(followerId, followingId, type)` - Remove follow
- `isFollowing(followerId, followingId, type)` - Check if following
- `getFollowers(userId)` - Get user's followers
- `getFollowing(userId)` - Get who user follows

### ConversationRepository

Manages chat conversations and messages:

- `createConversation(data)` - Create conversation
- `sendMessage(message)` - Send message
- `getMessages(conversationId)` - Get messages
- `editMessage(id, content)` - Edit message
- `deleteMessage(id)` - Delete message
- `markMessagesAsRead(conversationId, userId)` - Mark as read

### ChainRepository

Handles microthread posts (chains):

- `create(chain)` - Create chain
- `getById(id)` - Get chain by ID
- `getReplies(parentId)` - Get replies
- `addReaction(chainId, userId, type)` - Add reaction
- `update(id, content)` - Update chain
- `delete(id)` - Soft delete chain

### CommentRepository

Manages polymorphic comments:

- `create(comment)` - Create comment
- `getByEntity(type, id)` - Get comments for entity
- `getReplies(parentId)` - Get comment replies
- `update(id, content)` - Update comment
- `delete(id)` - Soft delete comment
- `addReaction(commentId, userId, type)` - Add reaction

### VideoRepository

Handles video asset operations:

- `create(video)` - Create video asset
- `getById(id)` - Get video by ID
- `getVideosWithUser()` - Get videos with user info
- `getByUser(userId)` - Get videos by user
- `update(id, updates)` - Update video
- `delete(id)` - Soft delete video
- `updateMuxData(id, assetId, playbackId)` - Update Mux info
- `search(query)` - Search videos

## Usage Examples

### Basic Usage

```typescript
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { UserRepository } from '@/lib/data-access/user.repository';

// In a component or hook
const supabase = createSupabaseBrowserClient();
const userRepo = new UserRepository(supabase);

// Get a user - returns undefined instead of null if not found
const user = await userRepo.getById(userId);
if (user) {
  console.log(user.username); // string | undefined (not null)
}
```

### Server-Side Usage

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PostRepository } from '@/lib/data-access/post.repository';

// In a server action or API route
const supabase = await createServerSupabaseClient();
const postRepo = new PostRepository(supabase);

const post = await postRepo.create({
  title: 'My Post',
  content: 'Content here',
  author_id: userId,
  // Optional fields can be undefined
  thumbnail_url: undefined, // Will be stored as null in DB
});
```

### With React Query

```typescript
import { useQuery } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { PostRepository } from '@/lib/data-access/post.repository';

function usePost(slug: string) {
  const supabase = createSupabaseBrowserClient();
  const postRepo = new PostRepository(supabase);

  return useQuery({
    queryKey: ['post', slug],
    queryFn: () => postRepo.getBySlug(slug),
  });
}
```

## Migration Guide

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for instructions on migrating existing code to use the data access layer.

## Best Practices

1. **Always use repositories**: Never make direct Supabase calls outside of the repository layer.

2. **Handle undefined gracefully**: Repository methods return `undefined` instead of `null` for not-found cases.

3. **Use type imports**: Import types separately to avoid circular dependencies:

   ```typescript
   import type { User } from '@/lib/data-access/schemas/user.schema';
   ```

4. **Error handling**: Repositories return `undefined` or `false` on errors. Check return values:

   ```typescript
   const user = await userRepo.update(id, data);
   if (!user) {
     // Handle error
   }
   ```

5. **Avoid any types**: The repositories handle type conversions. Use the exported types from schemas.

## Adding New Repositories

1. Create schema in `schemas/[entity].schema.ts`
2. Define Zod schemas with null→undefined transforms
3. Create repository in `[entity].repository.ts`
4. Follow existing patterns for method naming and error handling
5. Update this README with the new repository

## ESLint Configuration

The schema files are configured to allow `null` values since they interface directly with Supabase:

```js
// eslint.config.mjs
{
  files: ['src/lib/data-access/**/*.schema.ts'],
  rules: {
    'unicorn/no-null': 'off',
  },
}
```

All other files in the codebase should use `undefined` as enforced by the linter.
