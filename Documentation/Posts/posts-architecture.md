# Posts Architecture

This document provides a comprehensive overview of the "Posts" feature, covering everything from the database schema to the UI components.

## 1. Data Model & Database

The core of the posts system is the `posts` table, which stores the primary content. It has several related tables for managing metadata, reactions, and publication status.

### 1.1 `posts` Table

**Schema:**

| Column             | Data Type                  | Nullable | Default Value       | Description                      |
| ------------------ | -------------------------- | -------- | ------------------- | -------------------------------- |
| `id`               | `uuid`                     | NOT NULL | `gen_random_uuid()` | Primary key                      |
| `collective_id`    | `uuid`                     | YES      |                     | Foreign key to `collectives.id`  |
| `author_id`        | `uuid`                     | NOT NULL |                     | Foreign key to `users.id`        |
| `title`            | `text`                     | NOT NULL |                     |                                  |
| `content`          | `text`                     | YES      |                     |                                  |
| `is_public`        | `boolean`                  | NOT NULL | `true`              |                                  |
| `created_at`       | `timestamp with time zone` | NOT NULL | `now()`             |                                  |
| `published_at`     | `timestamp with time zone` | YES      |                     |                                  |
| `status`           | `post_status_type`         | NOT NULL | `'draft'`           | `draft`, `active`, `removed`     |
| `like_count`       | `integer`                  | NOT NULL | `0`                 |                                  |
| `tsv`              | `tsvector`                 | YES      |                     | For full-text search             |
| `view_count`       | `integer`                  | YES      | `0`                 |                                  |
| `dislike_count`    | `integer`                  | YES      | `0`                 |                                  |
| `subtitle`         | `text`                     | YES      |                     |                                  |
| `author`           | `text`                     | YES      |                     | Custom author byline             |
| `seo_title`        | `text`                     | YES      |                     |                                  |
| `meta_description` | `text`                     | YES      |                     |                                  |
| `metadata`         | `jsonb`                    | NOT NULL | `'{}'`              |                                  |
| `post_type`        | `post_type_enum`           | NOT NULL | `'text'`            | `text`, `video`                  |
| `thumbnail_url`    | `text`                     | YES      |                     |                                  |
| `updated_at`       | `timestamp with time zone` | YES      | `now()`             |                                  |
| `sharing_settings` | `jsonb`                    | YES      | `'{}'`              |                                  |
| `tenant_id`        | `uuid`                     | NOT NULL |                     | Foreign key to `tenants.id`      |
| `slug`             | `text`                     | NOT NULL |                     |                                  |
| `video_id`         | `uuid`                     | YES      |                     | Foreign key to `video_assets.id` |

**Foreign Keys:**

- `author_id` → `users(id)`
- `collective_id` → `collectives(id)`
- `video_id` → `video_assets(id)`
- `tenant_id` → `tenants(id)`

### 1.2 Related Tables

- **`post_bookmarks`**: Stores user bookmarks for posts.
- **`post_collectives`**: Many-to-many relationship between posts and collectives.
- **`post_reactions`**: User reactions to posts (e.g., likes).
- **`post_views`**: Tracks views for posts.
- **`post_slug_history`**: Keeps a record of old slugs for redirects.
- **`featured_posts`**: Curated list of featured posts.

### 1.3 Row-Level Security (RLS)

The `posts` table has extensive RLS policies to control access:

- **SELECT**:
  - Members can view posts in their tenant.
  - Authors can view their own posts.
  - Public can view public posts from public tenants.
  - Members can view posts from their tenants.
  - Authenticated users can view public posts from followed users.
- **INSERT**:
  - Authenticated users can create posts in their tenants if they have the `editor` role.
- **UPDATE**:
  - Authors can update their own posts.
  - Admins can update any post in their tenant.
- **DELETE**:
  - Authors can delete their own posts.
  - Owners can delete any post in their tenant.
  - _Shadow-hidden posts_: Admins can mark a post as `removed` (soft delete). Such posts remain in the table but are invisible to non-admin queries because the SELECT policy filters `status <> 'removed'` for regular viewers.

### 1.4 `editor_drafts` Table (Offline & Autosave Support)

The post editor stores in-progress work in the `editor_drafts` table. Drafts are created client-side first (in IndexedDB) and periodically synced to this table via the auto-save mutation.

| Column            | Type          | Nullable | Default             | Notes                                     |
| ----------------- | ------------- | -------- | ------------------- | ----------------------------------------- |
| `id`              | `uuid`        | NO       | `gen_random_uuid()` | Primary key                               |
| `user_id`         | `uuid`        | NO       |                     | Author (FK → `users.id`)                  |
| `tenant_id`       | `uuid`        | NO       |                     | Tenant context                            |
| `title`           | `text`        | YES      |                     | Draft title                               |
| `content`         | `text`        | YES      |                     | Legacy HTML content                       |
| `content_json`    | `jsonb`       | YES      |                     | Rich-text JSON (Tiptap)                   |
| `content_hash`    | `text`        | YES      |                     | SHA-256 of content for conflict detection |
| `metadata`        | `jsonb`       | YES      | `'{}'`              | Arbitrary metadata (thumbnail, tags)      |
| `last_saved_at`   | `timestamptz` | YES      | `now()`             | Auto-updated trigger                      |
| `has_legacy_html` | `boolean`     | NO       | `true`              | Migration flag                            |

RLS ensures only the owning `user_id` can SELECT / UPDATE their drafts.

## 2. API Routes

The REST API for posts is minimal, as most operations are handled by Server Actions.

### 2.1 `POST /api/posts`

This endpoint is used to create a new **video** post.

⚠️ **Current limitation:** The handler only accepts `type: 'video'`. A future PR will extend it to support standard text posts by piping the payload through `createPost` server action.

- **Method**: `POST`
- **Request Body**:
  - `type`: Must be `'video'`
  - `video_id`: `string` (UUID) - ID of the uploaded video in `video_assets`
  - `title`: `string`
  - `body`: `string` (optional)
  - `is_public`: `boolean` (optional, defaults to `false`)
- **Responses**:
  - `201 Created`: Post created successfully. Returns `{ success: true, id: <post_id> }`
  - `400 Bad Request`: Invalid payload or video not ready.
  - `401 Unauthorized`: User is not authenticated.
  - `500 Internal Server Error`: Database or other server error.

### 2.2 `POST /api/posts/[slug]/bookmark`

Toggles a bookmark on a post for the authenticated user.

- **Method**: `POST`
- **URL Parameters**:
  - `slug`: The `id` (as a UUID) of the post to bookmark/unbookmark.
- **Responses**:
  - `200 OK`: Bookmark toggled successfully. Returns `{ success: true, bookmarked: <boolean> }`
  - `400 Bad Request`: Invalid post ID.
  - `401 Unauthorized`: User not authenticated.
  - `404 Not Found`: Post not found.
  - `500 Internal Server Error`: Database error.

## 3. UI Components & Pages

The UI for posts is split between displaying posts and the editor for creating/updating them.

### 3.1 Displaying a Post (`/posts/[slug]`)

This is the public-facing page for viewing a single post.

- **Page Component**: `src/app/posts/[slug]/page.tsx`

  - This is a Server Component that fetches the post data using the `fetchPost` function.
  - It retrieves the `slug` from the URL and the `viewerId` from the request headers.
  - It handles 404 (not found) and 403 (forbidden) errors by showing the Next.js `notFound()` page.
  - It passes the fetched `post` and `viewer` data to the `PostLoader` client component.

- **Client Loader**: `src/app/posts/[slug]/PostLoader.tsx`

  - This is a Client Component that acts as a bridge between the server-fetched data and the final presentation component.
  - It uses `useMemo` to compute derived values like `readingTime`, `authorInitials`, and `formattedViewCount`. This is an optimization to prevent re-calculating these values on every render.
  - It then passes the `post`, `viewer`, and the computed `viewModel` to the `PostViewer` component.

- **Presentation Component**: `src/components/app/posts/PostViewer.tsx`
  - This is the main component responsible for rendering the entire post page UI.
  - It includes:
    - `PostViewTracker`: A component to track post views.
    - A sticky header with a back button, share button, bookmark button, and an edit button (if the viewer has permission).
    - The post hero image, title, and subtitle.
    - Author and collective information with links to their respective pages.
    - `PostReactionButtons`: For liking/disliking the post.
    - `PostContentRenderer`: Renders the actual post content from the database.

### 3.2 Creating & Editing a Post

The post creation and editing experience is managed by a set of pages, hooks, and a Zustand store.

- **New Post Page**: `src/app/(app_nochains)/posts/new/page.tsx`

  - This is the entry point for creating a new post.
  - It uses the `usePostEditor` hook to manage the form state and auto-saving.
  - It dynamically loads the `RichTextEditor` to avoid SSR issues.
  - It handles draft persistence by generating a UUID for the new post and using `draftService` to load/save drafts.
  - A `useEffect` hook handles auto-selection of a collective if the current tenant is a collective.

- **Post Editor Hook**: `src/hooks/posts/usePostEditor.ts`

  - This is the central hook for the post editor.
  - `useAutoSavePost`: A React Query mutation that handles auto-saving the post data to the database. It includes logic to determine the correct `tenant_id` and `collective_id`.
  - `usePostData`: A React Query query that fetches the data for an existing post when editing.
  - It returns the form data, state, and actions for managing the post editor.

- **Post Editor Store**: `src/lib/stores/post-editor-v2-store.ts`
  - A Zustand store that holds the state of the post editor form.
  - It includes actions for updating the form data, managing collective selections, and handling the auto-save status.
  - This centralizes the state management for the editor, making it easier to manage across different components.

## 4. Hooks & State Management

The posts system relies on a combination of React Query for data fetching/caching and Zustand for client-side state management.

- **`usePostEditor`**: The main hook for the post editor, providing form state, auto-saving, and publish actions.

  - **`useAutoSavePost`**: A React Query mutation that handles auto-saving the post data to the database. It includes logic to determine the correct `tenant_id` and `collective_id`.
  - **`usePostData`**: A React Query query that fetches the data for an existing post when editing.

- **`usePostEditorStore`**: A Zustand store that holds the state of the post editor form, including form data, collective selections, and auto-save status.

- **`useCollectiveMemberships`**: A React Query hook that fetches the user's collective memberships, including permissions for posting.

- **`useDeletePostMutation`**: A React Query mutation for optimistically deleting a post. It removes the post from the UI immediately and reverts the change if the server call fails.

- **`useEnhancedAutosave`**: A hook that provides debounced auto-saving with offline support using IndexedDB via `draftService`.

- **`usePostById`**: A simple React Query hook for fetching a single post by its ID.

- **`useTenantPostEditor`**: A hook for handling post creation and editing within a specific tenant context.

- **`useThumbnailUpload`**: Manages the state and logic for uploading post thumbnails, including drag-and-drop and progress simulation.

## 5. Server Actions

Server-side logic for creating, updating, and deleting posts is handled by Server Actions in `src/app/actions/postActions.ts`. This keeps the client-side code clean and secure.

- **`createPost(formData)`**:

  - Creates a new post.
  - Validates the form data using `CreatePostServerSchema`.
  - Checks for authentication and collective permissions.
  - Generates a unique slug and resolves conflicts.
  - Inserts the new post into the `posts` table.
  - Associates the post with collectives in `post_collectives`.
  - Revalidates relevant paths for caching.

- **`updatePost(postId, formData)`**:

  - Updates an existing post.
  - Validates the form data using `UpdatePostServerSchema`.
  - Performs similar permission and slug checks as `createPost`.
  - Updates the post in the database.

- **`deletePost(postId)`**:

  - Deletes a post.
  - First performs a "soft delete" by setting the post's status to `removed`.
  - A cleanup job or trigger could later handle the permanent deletion of the post and its related data.

- **`incrementPostViewCount(postId)`**:

  - Increments the `view_count` for a post.
  - Uses an RPC call to the database to ensure atomicity.

- **`featurePost(postId, feature)`**:

  - Features or un-features a post.
  - Adds or removes the post from the `featured_posts` table.

- **`uploadThumbnail(formData, postId)`**:
  - Handles the upload of a post thumbnail.
  - Validates the file size and type.
  - Uploads the file to Supabase Storage.
  - Returns the URL of the uploaded thumbnail.

## 6. Conclusion

The posts system is a well-structured feature that leverages modern Next.js capabilities. It uses a combination of Server Components for efficient data fetching, Client Components for rich interactivity, and Server Actions for secure and centralized business logic. The use of React Query and Zustand provides a robust and scalable state management solution. The database schema is well-designed with clear relationships and security rules enforced by RLS policies.
