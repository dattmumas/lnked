# Home Page Architecture: A Comprehensive Guide

This document provides a detailed overview of the architecture powering the home page, from its responsive layout and navigation down to the data flow for both the **Posts Feed** and the **Chains Feed**.

## 1. High-Level Page Structure & Layout

The home page is built on a responsive, multi-column layout that adapts to different screen sizes. The core structure is defined in `src/app/(app)/layout.tsx` and is composed of several key components.

- **`ModernNavbar.tsx`**: A sticky top navigation bar.
- **`GlobalSidebar.tsx`**: A persistent left-hand sidebar for primary navigation (e.g., Home, Chat links), visible on medium screens and up.
- **Main Content Area**: The central column that dynamically renders either the Posts Feed or the Chains Feed.
- **`ConditionalRightSidebar.tsx`**: A right-hand sidebar whose visibility is dependent on the current route.

### Responsive Layout (`(app)/layout.tsx`)

The main layout uses a flexbox container to arrange its children. The `GlobalSidebar` is hidden on mobile (`hidden md:block`), and the `ModernNavbar` is similarly rendered only on larger screens, ensuring a mobile-first experience. On mobile, primary navigation is expected to be handled by a different component, likely a bottom navigation bar or a hamburger menu (not covered in this document).

### Client-Side Entry Point (`HomePageClient.tsx`)

- **File**: `src/app/(app)/home/HomePageClient.tsx`
- **Role**: This is the main client component that orchestrates the content of the home page.
- **Core Logic**:
  1.  It uses the `useSearchParams` hook from `next/navigation` to read the URL's query parameters.
  2.  It checks for `?tab=chains`.
  3.  If `isChains` is true, it renders the **`RightSidebarFeed`** component.
  4.  Otherwise, it defaults to rendering the **`CenterFeed`** component for posts.
  5.  It also handles the display of the `PostOverlayWithinFeed` when a `?post=<id>` parameter is present in the URL, allowing users to view a single post in a modal-like overlay.

### Conditional Right Sidebar

- **File**: `src/components/app/layout/ConditionalRightSidebar.tsx`
- **Purpose**: To provide a consistent right-hand sidebar across the application that can be hidden on specific routes to maximize content space.
- **Visibility Logic**: It reads the `x-matched-path` request header to get the current route. It then checks this path against a predefined list (`ROUTES_WITHOUT_SIDEBAR`) which includes pages like `/chat`, `/settings`, and various content creation pages. If a match is found, the sidebar is not rendered.
- **Content**: The sidebar's content is determined by `RightSidebarSwitcher.tsx`, which currently always renders the `RightSidebarFeed` (the Chains feed). This architecturally dedicates the right sidebar to the "Chains" experience.

---

## 2. The Navigation Bar (`ModernNavbar.tsx`)

- **File**: `src/components/ModernNavbar.tsx`
- **Structure**: The navbar is divided into three main sections for clear organization.

| Section    | Components                                                                                                     | Purpose                                                                                                                         |
| :--------- | :------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| **Left**   | `NavIcon` (Home, Chat), `TenantContextSwitcher`                                                                | Provides primary app navigation and the crucial context-switching functionality for tenants and feed scope.                     |
| **Center** | `SearchBar`                                                                                                    | A flexible search bar that takes up the available space for global application search.                                          |
| **Right**  | `NewPostButton`, `ModeToggle` (Dark/Light), `NotificationDropdown`, `UserNav` (User Profile/Settings Dropdown) | Contains all user-specific actions, including content creation, theme switching, notifications, and access to account settings. |

### In-Depth Component Details:

- **`SearchBar`**: Implements a global search functionality. When a user types a query, it likely debounces the input and calls a dedicated API endpoint (e.g., `/api/search`) to fetch results across different content types like posts, users, and collectives.
- **`NotificationDropdown`**: Fetches and displays a user's recent notifications. It likely uses a dedicated hook (e.g., `useNotifications`) that calls a server-side endpoint to get notification data and may include a real-time subscription to show new notifications instantly.
- **`UserNav`**: Provides authenticated users with quick access to their profile page, application settings, and a sign-out action. It retrieves user data (like avatar and name) from the `useUser` hook.

---

## 3. The Contextual Global Sidebar (`ContextualGlobalSidebar.tsx`)

- **File**: `src/components/app/nav/ContextualGlobalSidebar.tsx`
- **Role**: A highly interactive, expandable primary navigation menu that provides access to all major sections of the application. It is hidden on mobile and on the dedicated `/chat` route.

### Key Features:

- **Expand on Hover**: The sidebar is collapsed by default, showing only icons. On mouse enter, it expands smoothly to reveal text labels, improving usability without permanently taking up screen real estate. This is managed with `useState` and `setTimeout` for a delayed collapse.
- **Context-Aware Navigation**: The sidebar is subscribed to the `useTenantStore` to be aware of the user's active tenant.
  - The "Profile" link will point to the collective's public page (`/collectives/[slug]`) if a collective tenant is active, or to the user's own profile (`/profile`) if a personal tenant is active.
  - Similarly, the "Settings" link will dynamically point to the collective's settings (`/settings/collectives/[slug]`) or the user's personal settings (`/settings/user`).
- **Active Route Highlighting**: Uses the `usePathname` hook to determine the current route and applies an "active" style to the corresponding navigation link. This logic has been updated to correctly handle the dynamic nature of the Profile and Settings links.
- **Primary Actions**: Includes prominent "Write Post" and "Video Post" buttons at the bottom for easy access to content creation.

---

## 4. The Posts Feed: A Deep Dive

This is the default view of the home page, designed for displaying long-form content like articles and video posts.

### Data Flow Architecture

The posts feed uses a unified data fetching approach through a single server function and API endpoint:

1. **State Management (`useTenantStore`)**: Manages the global `feedScope` (`'global'` vs. `'tenant'`) and the `currentTenant`. This is the single source of truth for the feed's context.

2. **UI (`CenterFeed.tsx`)**:

   - Calls `useTenantFeed` to fetch post data based on the current state from `useTenantStore`.
   - Uses `FeedVirtuoso` to efficiently render a potentially infinite list of posts without performance degradation. Window-scrolling virtualization ensures that only visible items are rendered to the DOM, keeping the application fast even with thousands of posts.
   - Calls `useFeedRealtime` to listen for live updates.
   - Sets up real-time video status updates via `useVideoStatusRealtime` to automatically update video processing status in the feed.

3. **Data Fetching (`useTenantFeed.tsx`)**:

   - Uses `useInfiniteQuery` from TanStack React Query.
   - Constructs a unique **Query Key**: `['unified-feed', feedScope, tenantIdOrGlobal, limit]` to ensure data is refetched when the context changes and to prevent cache collisions.
   - Calls the `/actions/feedActions` server action endpoint.
   - **Performance**: `staleTime` is set to 2 minutes, and `refetchOnMount` is `false` to prevent unnecessary refetches while still keeping data relatively fresh.

4. **Server Action (`/actions/feedActions/route.ts`)**:

   - A unified endpoint that handles both global and tenant-specific feeds.
   - Creates a server-scoped Supabase client with proper authentication context.
   - Calls `fetchUnifiedFeed` from the server utilities with appropriate scope parameters.
   - Returns properly formatted feed data with comprehensive error handling.

5. **Unified Feed Function (`fetchUnifiedFeed`)**:

   - **File**: `src/lib/server/fetchUnifiedFeed.ts`
   - Validates input parameters using Zod schemas for type safety.
   - Calls the `get_unified_feed` PostgreSQL function with user context and tenant parameters.
   - Transforms database rows into properly typed `FeedItem` objects.
   - Handles video metadata extraction and author information mapping.

6. **Database Function (`get_unified_feed`)**:

   - A single PostgreSQL function that handles both global and tenant-specific feed logic.
   - **Security**: Runs with `SECURITY DEFINER` and embeds row-level security checks.
   - **Data Selection**: Retrieves all necessary fields including:
     - Post content (`title`, `content`, `created_at`, `published_at`, `is_public`)
     - Author information (`author_id`, `author_full_name`, `author_username`, `author_avatar_url`)
     - Collective data (`collective_id`, `collective_name`, `collective_slug`)
     - Video metadata (`video_id`, `mux_playback_id`, `status`, `duration`)
     - Tenant context (`tenant_id`, `tenant_name`, `tenant_type`)
     - Engagement metrics (`like_count`)
     - Media assets (`thumbnail_url`, `post_type`)
   - **Video Metadata**: Automatically constructs comprehensive metadata JSON for video posts including:
     - `playbackId`: Mux playback identifier for video streaming
     - `status`: Current video processing status (`ready`, `processing`, `error`)
     - `videoAssetId`: Internal video asset reference
     - `duration`: Video length in seconds
   - **Tenant Filtering**: When `p_tenant_id` is provided, filters posts to only include those from the specified tenant context.

7. **Real-Time Updates (`useFeedRealtime.ts`)**:
   - Subscribes to Supabase's real-time channel for the `posts` table.
   - Monitors for INSERT, UPDATE, and DELETE operations on posts.
   - On receiving updates, invalidates React Query caches using `queryClient.invalidateQueries({ queryKey: ['unified-feed'] })`.
   - Provides `hasNewPosts` and `newPostsCount` state for UI indicators.
   - Includes `refreshFeed` function for manual feed refresh.

### Video Support Architecture

The feed includes comprehensive video support with real-time status updates:

- **Video Metadata**: All video posts include complete metadata with Mux playback IDs, processing status, and duration information.
- **Real-time Processing Updates**: `useVideoStatusRealtime` automatically updates video status as processing completes.
- **Inline Video Players**: Video posts render with `VideoCard` components that support inline playback using Mux player technology.
- **Thumbnail Management**: Video thumbnails are automatically generated and stored in Supabase Storage with public access policies.

### Storage and Media Access

- **Public Storage Policies**: All media assets (thumbnails, images, avatars) use simple public read access policies to ensure browser image requests work without authentication headers.
- **Bucket Organization**:
  - `avatars`: User profile images with public read access
  - `post-thumbnails`: Post thumbnail images with public read access
  - `post-images`: Post content images with public read access
- **Security**: Upload and delete operations remain restricted to authenticated users in their own folders.

---

## 5. The Chains Feed: A Deep Dive

The Chains feed is a separate, real-time micro-blogging or "thread" view, architecturally distinct from the posts feed.

### Key Architectural Differences

- **Data Fetching**: Primarily uses **Next.js Server Actions** (`fetchInitialChains`, `loadOlder`) instead of client-side `fetch` calls to API routes. This reduces client-side JS, simplifies the data-fetching layer by removing the need for an API route, and allows for a more direct, RPC-like communication with the server.
- **Real-Time Handling**: Manages a `liveBuffer` of new, incoming chain IDs and provides a "Show New" button, giving the user control over when new content is loaded into the feed. This is ideal for a fast-moving, real-time feed as it prevents layout shifts while a user is reading.

### Component Breakdown

1. **Entry Point (`RightSidebarFeed.tsx`)**:

   - The top-level component for the chains feed.
   - It calls the `fetchInitialChains` server action in a `useEffect` hook to get the initial batch of chains.
   - It then passes this initial data to the `ThreadFeedClient`.

2. **Core UI & Logic (`ThreadFeedClient.tsx`)**:
   - This is where the main logic resides.
   - **State Management**: Uses `useState` to manage the list of `items` (chains) and the `liveBuffer`.
   - **Rendering**: Uses `react-virtuoso` for efficient rendering of the chain list.
   - **Data Actions**:
     - `loadOlderBatch`: A function passed to Virtuoso's `endReached` prop to prepend older chains for infinite scrolling in thread view.
     - `showNewChains`: Fetches the full data for chains in the `liveBuffer` and prepends them to the main feed.
     - `submitReply`: Uses the `replyToChain` server action to add new replies.
   - **Real-Time (`useRealtimeChain.ts`)**:
     - Subscribes to a Supabase channel for "chains".
     - The `handleDelta` callback receives new chain data.
     - Instead of immediately adding it to the main feed, it adds a lightweight placeholder to the `liveBuffer` and displays the "Show X new chains" button. This prevents the UI from shifting unexpectedly while the user is reading.
   - **Adapter Pattern (`ChainDataAdapter.tsx`)**: The `ThreadFeedClient` uses a `ChainDataAdapter` component. This component acts as a bridge, taking the raw `ChainWithAuthor` data object and mapping its properties to the specific props required by the `ChainCard` UI component. This is a clean architecture pattern that separates data shape concerns from presentation logic.

This dual-feed architecture allows the home page to serve two distinct purposes—long-form content consumption and real-time micro-blogging—using patterns and technologies best suited for each use case.

#### Sidebar Resizing

`ConditionalRightSidebar` wraps its children in **`ResizableSidebarClient`**. This client component injects `--rsb-width` as an inline CSS variable and registers a drag-handle allowing users to resize the sidebar (min 320 px – max 720 px, default 640 px). The width is persisted in `localStorage` so subsequent page loads honour the user's preference.

#### Floating Create Button (Mobile-only)

`FloatingCreateButton.tsx` is rendered by **`HomePageClient`** only on screens `< md`. It attaches to `#center-feed-scroll-container` with `position: fixed; bottom:1rem; right:1rem` and opens the post composer modal. This ensures content creation is always one tap away on smaller devices where the sidebar actions are hidden.

#### Real-time Reactions

The chains feed relies on **`useChainReactions.ts`** which maintains three `Set<string>` objects (`likedChains`, `dislikedChains`, `rechainedChains`) for optimistic UI updates. It also provides a `getDeltas()` helper used by `ThreadFeedClient` to reconcile server deltas with local optimistic state.

#### Thread Ordering Logic

`ThreadFeedClient` reverses the initial array when in **thread mode** (`rootId !== ''`) so the root post appears at the top and replies grow downward. In timeline mode the array is kept in natural (newest→oldest) order.

#### Search Bar Implementation

`SearchBar` does **not** call a dedicated `/api/search` route. Instead it uses `createSupabaseBrowserClient()` to execute a **typed RPC** (`search_documents`) directly from the browser, filtering by `tsvector` on `v_user_visible_posts`. Results are rendered in a popover with keyboard navigation.

#### Tenant Bootstrapping & SSR Data

`TenantProvider` runs `actions.init(initialTenants)` on mount. On server-side navigations `(app)/layout.tsx` fetches `initialTenants` and passes them as React props ensuring the zustand store is hydrated without an extra round-trip. If the user has no persisted tenant selection, the provider defaults to the personal tenant.

#### RLS & Security

All database functions (`get_unified_feed`, `fetchInitialChains`, etc.) run **`SECURITY DEFINER`** and embed row-level-policy checks. `get_unified_feed` enforces user visibility rules and tenant access controls while maintaining proper data isolation.

#### Performance & Monitoring

`(app)/layout.tsx` imports **`<SpeedInsights />`** from Vercel which automatically instruments the page for Core-Web-Vitals and navigational timings. A custom `reportWebVitals` sends this data to Supabase's `performance_logs` table for later analysis.

---

## 6. Additional Implementation Notes

| Area                             | File / Hook                                          | Purpose                                                                                                                                                                                                    |
| -------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Video Status Updates**         | `useVideoStatusRealtime.ts`                          | Subscribes to `video_assets` updates and invalidates React-Query caches so that video thumbnails and durations update in-place while a user watches the feed.                                              |
| **Optimistic Post Interactions** | `usePostFeedInteractions.ts`                         | Wraps mutations for likes / dislikes / bookmarks with React-Query `setQueryData` for immediate UI feedback and roll-back on error.                                                                         |
| **Virtual Scrolling**            | `FeedVirtuoso.tsx` (wrapper around `react-virtuoso`) | Sets `overscan={200}` and implements an intersection observer to auto-load the next page when the scroll pointer reaches 85% viewport height.                                                              |
| **Server Actions – Chains**      | `src/app/actions/chainActions.ts`                    | Houses `fetchInitialChains`, `loadOlder`, and `fetchChainsByIds`. These are marked `use server` so the client bundles remain lean.                                                                         |
| **Server Actions – Feed**        | `src/app/actions/feedActions/route.ts`               | Unified feed endpoint that handles both global and tenant-specific feed requests through server actions.                                                                                                   |
| **Mode Toggle**                  | `ModeToggle.tsx`                                     | Uses `next-themes` and stores the preference in `localStorage` keyed to `lnked.theme`. All Tailwind theme-aware classes respond instantly without page reload.                                             |
| **Search Index**                 | `v_user_visible_posts` view                          | Materialised view denormalising `posts`, `collectives`, and `users` for full-text search (GIST index on `tsv`). The SearchBar RPC delegates to this view for high-performance look-ups.                    |
| **URL State Management**         | `useSearchParams` + shallow routing                  | All feed / thread switches (`?tab=chains`, `?thread=<id>`, `?post=<id>`) use Next.js shallow routing so navigating back/forward keeps scroll position and avoids full reloads.                             |
| **Error Boundaries**             | `src/app/error.tsx`                                  | Global app-level error boundary renders a user-friendly page if any React component throws during SSR or CSR hydration.                                                                                    |
| **Supabase Storage – Media**     | Multiple public buckets                              | Media assets are stored in public buckets (`post-thumbnails`, `post-images`, `avatars`) with simple public read policies to ensure browser compatibility. Upload/delete operations remain user-restricted. |
| **Database Type Generation**     | `src/lib/database.types.ts`                          | TypeScript types are automatically generated from the Supabase schema using MCP tools, ensuring type safety across the application.                                                                        |
| **Feed Data Transformation**     | `src/lib/server/fetchUnifiedFeed.ts`                 | Transforms raw database rows into properly typed `FeedItem` objects with comprehensive video metadata and author information.                                                                              |

### Database Function Details

The `get_unified_feed` PostgreSQL function is the core of the feed system:

```sql
-- Returns comprehensive post data with author, collective, video, and tenant information
-- Handles both global feeds (all visible posts) and tenant-specific feeds
-- Includes proper RLS enforcement and video metadata construction
-- Supports pagination with limit/offset parameters
-- Automatically constructs video metadata JSON from video_assets table
```

Key features:

- **Unified Data Model**: Single function handles all feed scenarios
- **Complete Video Support**: Automatically includes Mux playback IDs and processing status
- **Author Information**: Includes usernames, full names, and avatar URLs
- **Tenant Context**: Proper filtering and tenant information for multi-tenant support
- **Performance Optimized**: Efficient joins and proper indexing for fast queries
- **Security**: Row-level security enforcement for data access control
