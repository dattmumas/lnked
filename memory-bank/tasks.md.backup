## UNIFIED POST SYSTEM - TASK STATUS

**Task ID:** Unified Post System Implementation  
**Complexity Level:** Level 3 (Intermediate Feature)  
**Status:** ✅ **COMPLETED** - Archived January 6, 2025

### Implementation Status

- [x] Initialization complete
- [x] Planning complete
- [x] Creative phases complete (UI/UX + Architecture)
- [x] Implementation complete
- [x] Build validation successful (zero errors)
- [x] **Reflection complete**
- [x] **Archiving complete**

### Archive Information

- **Date Completed**: January 6, 2025
- **Archive Document**: [`docs/archive/archive-unified-post-system-20250106.md`](../docs/archive/archive-unified-post-system-20250106.md)
- **Reflection Document**: [`memory-bank/reflection/reflection-unified-post-system.md`](reflection/reflection-unified-post-system.md)
- **Status**: ✅ **COMPLETED**

### Reflection Highlights

- **What Went Well**: Creative phase execution, technical implementation excellence, state management success, and integration achievements
- **Challenges**: Build integration issues resolved, legacy component conflicts addressed, state management complexity handled
- **Lessons Learned**: Creative phase value, hook-based architecture benefits, optimistic UI patterns, TypeScript advantages
- **Next Steps**: Archive documentation, performance monitoring, user testing, and future enhancements

### Key Deliverables Completed

- 8 new components implementing unified post system
- Hook-based state management with optimistic UI updates
- Backward compatibility maintained
- Full TypeScript support and type safety
- Comprehensive reflection and archive documentation created

---

# ORIGINAL TASK SPECIFICATION

1. Backend Post Schema Overview and Data Flow
   Post Schema: The posts table is the core content store. Each post has a UUID id and fields like title, content, optional subtitle (tagline), and status (draft/active/removed)
   GitHub
   GitHub
   . Crucially, post_type differentiates content types ('text' vs 'video') and a flexible JSON metadata stores type-specific data
   GitHub
   . For text articles, content holds rich text (Lexical JSON) and metadata may be empty. For video posts, content can serve as a description or be empty, while metadata contains video-specific info (e.g. duration, perhaps a reference ID). A thumbnail_url is stored for preview images
   GitHub
   (currently often empty for videos). Each post also tracks basic counts (like_count, dislike_count, view_count) which can be kept for quick reads
   GitHub
   GitHub
   , though these may be deprecated in favor of reaction tables for accuracy. Video Assets: Videos are managed in a separate video_assets table integrated with Mux video streaming. Each video asset has fields like mux_asset_id (Mux video ID), processing status, duration, etc., and is linked to a creator (created_by)
   GitHub
   . Integration with Posts: The video_assets table has an optional post_id foreign key referencing posts.id
   GitHub
   . This allows associating a video file with a post entry. In practice, when a user uploads a video, a video_assets record is created (with status='preparing') and after processing a post entry should be created or updated to represent the published video post. Currently, the code creates a placeholder post on-the-fly for comments if not already present
   GitHub
   GitHub
   , but the plan should enforce creating a post row at video publish time (with post_type='video') to unify handling. This post's metadata can store video attributes like duration and perhaps a cached thumbnail. The Mux webhook handlers update video_assets (setting status='ready', filling duration, mux_playback_id, etc.)
   GitHub
   GitHub
   , but they do not yet propagate changes to posts. We should extend those handlers (or related logic) to update the linked post: e.g. mark the post status='active', copy duration into posts.metadata, generate a thumbnail_url, and set published_at. This ensures front-end can render video posts without additional queries. Metadata Usage: The flexible JSON metadata field on posts is intended for post-type-specific data
   GitHub
   . For videos, we will standardize a structure (e.g. { "videoAssetId": "...", "duration": 120, "playbackId": "..." }) so front-ends can easily retrieve needed info. Currently, the feed infers a video post if post.post_type === 'video' or if certain metadata keys exist (e.g. metadata.duration)
   GitHub
   . We will formalize this: when creating a video post, embed a flag like "type": "video" in metadata for clarity, along with any needed playback info (though for security, actual playback tokens might remain server-side). Interaction and Reaction Schema: Interactions are captured both in dedicated tables and summary fields:
   Likes/Dislikes: The post_reactions table stores individual user reactions with a type ('like', 'dislike', etc.)
   GitHub
   . This allows multiple reaction types (they even anticipate emoji reactions like love, laugh, etc. via the type enum)
   GitHub
   . The posts table's like_count and dislike_count are not auto-updated by triggers, so the front-end currently counts reactions on the fly
   GitHub
   GitHub
   . We plan to rely on post_reactions as the source of truth for counts (possibly adding DB triggers or materialized views to keep posts.like_count in sync for performance). A unified interaction service can be introduced to handle toggling likes/dislikes so both the table and any cached counts stay updated.
   Comments: Comments are in a comments table linking to post_id
   GitHub
   . The post detail page uses a CommentsSection component which fetches comments via an API route /api/posts/[id]/comments
   GitHub
   . To accommodate video pages, the backend uses a special prefix video-{videoId} to create/find an associated post for that video
   GitHub
   GitHub
   . This workaround will be unnecessary once every video post gets a proper post entry at creation. Going forward, every user-facing post (text or video) will have a posts row, so comments can uniformly use the post's UUID. We should migrate any existing video comments (created under generated posts titled "Video: [title]") to the real post if needed, and deprecate the video-<id> pattern.
   Views: Views are tracked in post_views (one row per view event)
   GitHub
   . Currently, view counts are not surfaced on the front-end except possibly in the article page ("X views")
   GitHub
   . We should incorporate view count updates when a post or video is viewed. A lightweight approach is to increment posts.view_count on each view and log to post_views for analytics
   GitHub
   , possibly debouncing to avoid spam. Real-time view updates might be unnecessary now but designing the system to handle high volume (perhaps by batching writes or using an analytic service) is prudent as content grows.
   Bookmarks & Shares: The post_bookmarks table tracks user bookmarks (favorites)
   GitHub
   . This is integrated in the UI (bookmark button state)
   GitHub
   . There isn't a dedicated "share count" field or table yet. The UI's "Share" button currently just copies a link
   GitHub
   . In the future, we can add a post_shares log or increment a counter when a user shares a post (even if just to track popularity). This might tie into an "interactions" table – note there is an interactions table that can log generic events like views or recommendations
   GitHub
   , though it overlaps with dedicated tables. Part of our plan is to simplify and consolidate interaction tracking: e.g., use post_reactions for likes/dislikes, use post_views for view counts, and possibly repurpose the interactions table for follow/unfollow or other non-post actions to reduce confusion.
   In summary, the backend schema is robust, but we will ensure every video corresponds to a post (eliminating ad-hoc post creation on comment) and leverage JSON metadata for any new fields (e.g. subtitles, as discussed below). We may also introduce cache fields in posts (like excerpt) for performance, which leads to the next point.
2. Front-End Scaffolding and Page Organization
   Application Structure: The front-end is organized by page type using Next.js 13 App Router. There are distinct segments for public-facing pages versus user-dashboard pages. For example, /home (the main feed) is a protected route rendering a feed of posts, while (public)/posts/[slug] is the public post detail page
   GitHub
   GitHub
   . We will adhere to this structure:
   Home Feed Page: Shows a mix of all posts from followed users or collectives (and possibly all content in "All" filter). The current implementation uses a client component HomePageClient for the feed UI and fetches data from Supabase directly in the browser
   GitHub
   GitHub
   . This page is accessible after login (the server component checks auth and redirects if not signed in)
   GitHub
   GitHub
   . It includes the Article Card and Video Card components in a unified feed list.
   Profile Pages: The design calls for pages like /profile/[username] where a user's own posts (and possibly videos, interactions, bio) are displayed. In the post detail page, author names link to /profile/username
   GitHub
   , implying these routes will list content by that author. We will implement profile pages to show the user's articles and videos in a similar card format, reusing the Article/Video Card components (possibly with a toggle for "Published" vs "Likes" etc.). Profile pages can likely be static or ISR (since user content doesn't change too frequently except when they post).
   Collective Feed Pages: Collectives (groups) also have feeds of posts. The schema supports posts having a collective_id and even multi-collective via a planned junction table
   GitHub
   GitHub
   . In the UI, posts show "in [Collective Name]" if applicable
   GitHub
   . We will implement /collectives/[slug] pages to display posts belonging to that collective. This can mirror the Home feed but filtered by collective. Permissions (whether a post is public to non-members) will respect the is_public flag on posts
   GitHub
   .
   Component Structure: We will modularize the components to ensure consistency and reuse:
   Post Cards (Feed Items): Currently, the feed directly renders a <Card> with conditional logic for videos vs text
   GitHub
   GitHub
   . We will refactor this into two presentational components: ArticleCard and VideoCard (both likely extending a common Card layout). The Article Card will display title, subtitle/excerpt, author, and possibly a thumbnail if available; the Video Card will display the video's thumbnail or a preview image overlayed with a play icon and duration
   GitHub
   GitHub
   . Both cards share an info footer with author name, collective, timestamp, and stat buttons (like, comment, etc.), which can be abstracted as a sub-component (e.g. PostCardFooter). This improves maintainability: adding a new stat ("Shares") or changing styling can be done in one place. It also ensures visual consistency across feed, profile, and collective pages – all use the same Card components but with appropriate data.
   Post Detail Pages: There are currently two separate detail page implementations:
   The Article Page (for text posts) at route /posts/[slug] (under (public)/posts) which is a server-rendered page fetching the post by slug or ID
   GitHub
   GitHub
   and rendering a full article with <ReadOnlyLexicalViewer> for content
   GitHub
   GitHub
   , a Reaction bar, and a Comments section.
   The Video Page at /videos/[id] (with a client-heavy VideoPlayerPageClient) which fetches a video_assets entry by ID and renders a video player and metadata
   GitHub
   GitHub
   .
   We plan to unify these into a single Post Detail page capable of handling both types, to provide a consistent user experience and URL scheme. Specifically, we will use the /posts/[slug] page for both article and video posts (since each video will have a post slug once properly created). That page can detect the post type and render appropriately:
   For a text post (post_type='text'), we will continue to render the title and content via the rich text viewer, with maybe a cover image if thumbnail_url is set.
   For a video post (post_type='video'), we will render a video player component at the top of the content. We can embed the MuxVideoPlayer directly on the page (as a client component) or use a lightweight wrapper. For example, if post.metadata.videoAssetId is present, load the corresponding MuxVideoPlayer with the playback ID. The video's title/description can still be shown below the player (similar to how VideoPlayerPageClient shows description and details
   GitHub
   GitHub
   ).
   By merging these pages, we ensure routing consistency (/posts/slug for everything) and can drop the separate /videos/[id] route, simplifying architecture. We'll incorporate any extra features from VideoPlayerPageClient into the unified page:
   Download/Share Controls: The video page had Download and Share buttons with specific logic (copy HLS URL if MP4 not available, etc.)
   GitHub
   GitHub
   . We can include a simplified version of these on the video post page (e.g. a "Download" button if mp4_support allows, and the same Share menu as articles). These controls might live in a DropdownMenu or a secondary actions bar next to the video.
   Video Details: The video page shows technical details (duration, aspect ratio, status)
   GitHub
   GitHub
   . On a public content page, we might not surface all this (the status is not meaningful to end users once published). Instead, we'll show duration (perhaps as part of the content metadata bar, e.g. "5m30s"), and possibly resolution if needed. Detailed tech info can remain in an admin-only view (like a dashboard video management page) to avoid cluttering the user experience.
   Shared Layout and Navigation: We will ensure the page layouts and navigation are intuitive. The feed and collective pages use a center column layout with sidebars (e.g., global nav sidebar, maybe trending content on right). The profile page will likely reuse a similar layout (with user info in place of where feed filter might be). The post detail page already includes a back button ("<– All posts") and options for editing if author
   GitHub
   GitHub
   . We'll keep these consistent: e.g., for a video post, a back button should go to the previous context (feed or collective, etc.), and if the viewer is the author, show an "Edit" link (for now that could navigate to the post editor).
   Routing and State Management: Using Next.js App Router, we lean on SSR for initial page load and client-side hydration for interactivity. Navigation between feed and post pages will be mostly client-side (via <Link> components) to preserve SPA feel. We will configure dynamic routes properly:
   Posts will be looked up by slug in the URL. The system currently can handle both slug or ID
   GitHub
   GitHub
   ; once all posts have slugs, we'll use slugs for nicer URLs (and possibly include the author or collective context in URL for SEO, e.g. /[username]/[slug], though that adds complexity).
   Profiles by username and collectives by slug are straightforward and improve discoverability.
   The front-end directory structure will mirror the domain separation:
   src/components/app/posts/... for components specific to posts (we already have molecules like PostReactionButtons.tsx, organisms like CommentsSection.tsx
   GitHub
   GitHub
   ).
   src/components/app/video/... for video-specific components (e.g. MuxVideoPlayerSimple.tsx for the player embed
   GitHub
   ). Some of these will be folded into post components if we merge pages (the VideoPlayerPageClient logic will partly move to the unified Post page).
   We will introduce ArticleCard.tsx and VideoCard.tsx components under posts/molecules for feed items, as noted, and possibly a unified PostCard wrapper if needed.
   This scaffold will make it easier to extend the app. For example, if in the future we add an "Image post" type or "Poll post", we would add a new post_type and corresponding UI component, but still plug into the same feed and detail page structure.
3. Rendering Strategy (SSR vs SSG vs Client-side) and Scalability
   Current Strategy: The application currently uses Server-Side Rendering for page shells and secure data, and client-side fetching for dynamic content in some cases. For instance, the Home page does an SSR auth check, then the client component fetches the feed via Supabase JS (no initial SSR of feed data)
   GitHub
   GitHub
   . The post detail page, on the other hand, fully renders the content on the server (including joining author and collective info)
   GitHub
   GitHub
   – which is great for SEO and first paint – and then hydrates interactive bits (reaction buttons, comments) on the client. Analysis: Going forward, we want a consistent, scalable approach:
   For pages meant to be publicly accessible and indexed (article pages, public collective feeds, search results), use SSR or SSG so that content is present in the HTML. The Article Page already does this (delivering the post content and title in the HTML)
   GitHub
   GitHub
   . We will ensure the same for video posts – e.g. include the <video> or <mux-player> element SSR (with a placeholder until client hydration for playback). Using Next's streaming and React 18 features (suspense boundary as seen in the video page SSR
   GitHub
   ) can allow us to SSR the non-interactive parts while waiting to hydrate the player.
   The Home feed is user-personalized (depends on follows, etc.) and rapidly updating, so SSR every feed request might be heavy. We can still optimize the initial load: for example, use Next.js Server Components to fetch a page of feed posts on the server and pass them into the client feed component as initial props. This would eliminate the loading spinner and round-trip currently seen ("Loading feed...")
   GitHub
   . Because the feed is behind auth, we can do this securely with createServerSupabaseClient (as done for profile fetch) and benefit from server-side joins (Supabase can deliver joined user info in one query as it does in post detail). As the app scales, we might implement infinite scroll or pagination; SSR can still deliver the first page, and subsequent pages load via client.
   Incremental Static Generation (ISG): For content that doesn't change per-user and isn't highly dynamic, we should use SSG with revalidation. Blog article pages are prime candidates – they could be generated statically on publish and revalidated on edits. Since our backend is Supabase, true static generation is tricky (no file system data at build time), but Next 13 can revalidate on demand or at interval. We might consider using Supabase webhooks or timestamp comparisons to trigger revalidation of a post's page when it's updated. This would offload rendering cost and make popular posts extremely fast worldwide. Initially, SSR is simpler to implement, but planning for SSG later is wise.
   Client-side Rendering (CSR): We'll continue to leverage CSR for interactive bits: e.g., the Reaction and Bookmark buttons in the feed and post page are client-driven (toggling state immediately and then calling Supabase)
   GitHub
   GitHub
   . That's appropriate for UX. We will also possibly use Optimistic UI (already present – the feed toggles the UI state instantly and updates DB in background
   GitHub
   GitHub
   ). For comments, the form posts via fetch API and then updates local state
   GitHub
   ; we might refine this with real-time updates via Supabase's subscription if needed so that two viewers see new comments live.
   Scalability considerations: As the content grows, SSR of large lists could be slow. We will implement pagination on all lists (feed, profile, collective) – e.g., load 10 posts at a time. This can be done with a "Load more" button or infinite scroll. SSR will only render the first chunk; subsequent chunks load via client. This hybrid keeps initial page load fast and SEO-friendly but scales to many items.
   We should also leverage Edge caching for public pages (Next.js + Vercel edge). For example, a public collective page or trending posts page can be statically rendered and cached at the edge with periodic revalidation.
   Our recommended pattern is to fetch data on the server whenever it's not user-specific or when SEO matters, and to use client components for stateful interactive widgets. This aligns with Next.js best practices and ensures forward compatibility as the audience grows. By using Supabase's server client on the backend for SSR, we also reduce duplicating queries – e.g., the post detail SSR query already fetches like/dislike counts in one go
   GitHub
   GitHub
   , which is efficient. We will extend that (perhaps fetch comment count too in the initial query) so that all high-level data is ready server-side.
4. Post Interaction Systems Integration
   Likes & Dislikes: The UI provides prominent like/dislike buttons on both feed cards and post pages. Currently, in the feed each card shows the count and highlights if the user liked/disliked
   GitHub
   GitHub
   . In the detail page, there's a PostReactionButtons component handling the same (with initial counts passed from SSR)
   GitHub
   GitHub
   . We will ensure these use a unified state source – possibly context or a shared store – so that if a user likes a post on the detail page, the feed card (if in memory) also reflects it. Right now, the feed refetches when interactions change (it triggers refetch() on a short timeout after a like)
   GitHub
   GitHub
   . We might refine this by optimistic updates or by leveraging the same supabase subscription for post_reactions to get real-time counts. On the backend, liking a post inserts a row in post_reactions. We should add a trigger or a Supabase function to update aggregate counts in posts for consistency – or use a materialized view for "likes_count" if needed for heavy read scenarios. The interactions allowed (like/dislike) are already well-defined
   GitHub
   and the UI prevents multiple reactions by the same user (toggling removes the previous opposite reaction if needed
   GitHub
   GitHub
   ). We'll maintain this logic and extend it with perhaps "neutral" reaction removal – e.g., if a user clicks like twice it unlikes (already handled in code)
   GitHub
   GitHub
   . Comments: The commenting system is in place on post pages, including threaded replies (via parent_id) and sorting by newest or top (the code prepares sorted arrays)
   GitHub
   . We will integrate the CommentsSection into video posts seamlessly with the unified post detail page. After eliminating the need for video- prefix hacks, the CommentsSection component can be simplified to always call /api/posts/[postId]/comments. We'll also improve the UI: currently it shows a basic textarea and list; we can add UX enhancements like a rich text input or at least @mention support (which could tie into notifications – the notification_type enum even has a 'mention' type
   GitHub
   ). That might be a future phase; for now we ensure the comment UI is consistent between articles and videos. Additionally, we should display the comment count on feed cards. Right now, feed cards show item.stats.comments but it's hardcoded to 0 with a TODO
   GitHub
   GitHub
   . We will implement real comment count: either store a comments_count in posts (updated via trigger on the comments table), or fetch count in the feed query (Supabase can do .select('..., comments(count)') via relationship). Given performance, a stored count is preferable. This will make the feed more informative and encourage engagement. Shares: While a share button exists, there's no sharing mechanism besides copying link. In future, we might implement "reposting" or "shared to collective" features. The DB has an interactions table that tracks 'recommended_interested' etc., possibly a remnant of another idea
   GitHub
   . For now, copying a link is fine, but we can enhance by adding a toast "Link copied!" (the video page already toggles a state to show "Copied" confirmation
   GitHub
   GitHub
   ). We'll reuse that in the Article page so the user knows the share action succeeded. Bookmarks: Bookmarks are integrated (the bookmark button toggles and calls post_bookmarks)
   GitHub
   GitHub
   . We will maintain this. A possible improvement is to provide a "My Bookmarks" page where all saved posts appear – this can be easily done with a page that queries post_bookmarks by user and joins posts. It's a nice-to-have that future-proofs the user's content experience. Follow/Subscriptions: Not directly asked, but relevant: the UI shows a Follow button on the post page if viewing someone else's post
   GitHub
   . The DB has a follows table for user and collective follows
   GitHub
   . We will make sure that clicking Follow triggers the appropriate API (likely an endpoint or Supabase call to insert into follows). This way, interaction systems (like notifications on new posts from followed users, or a personalized feed) can fully function. Notifications for interactions (likes, comments, mentions) are supported by a notifications table and a trigger function, as seen by enumerated notification_type values (e.g. 'post_like', 'comment_reply')
   GitHub
   . Our plan should include hooking in these notifications where applicable. For example, when someone comments on your post, create a 'post_comment' notification. Supabase functions create_notification exist for this purpose
   GitHub
   GitHub
   . We can integrate calls to such functions in the appropriate API routes (comments and reactions routes). In summary, we'll incorporate all existing interaction systems consistently across the new pages:
   The Article and Video Cards on feeds will show Like, Dislike, Comment count, and Bookmark actions uniformly, using the same components.
   The Article and Video Detail pages will include Like/Dislike, Share, and Bookmark (with possibly follow and more options in a dropdown). The design already has a "More" (ellipsis) menu placeholder on the post page for future actions
   GitHub
   ; we might put "Report" or "Edit" (for owner) under there.
   All these interactions will use centralized logic (e.g. a context or the existing usePostInteractions hook
   GitHub
   ) so state is synchronized. This reduces duplication and ensures, for example, if you unlike a post, both the detail and any feed view reflect it.
5. Component Reuse and Modularization Opportunities
   With both article and video content in play, it's critical to avoid siloed implementations. We aim to modularize components to maximize reuse:
   Unified Post Card API: As mentioned, ArticleCard and VideoCard will share a common interface (possibly a common component under the hood). We might implement a generic PostCard that takes a post object and internally decides how to render the media portion. For example, PostCard could render a thumbnail image if post.thumbnail_url is set (for articles that have one, or video posts once we generate thumbnails), and render a video overlay if post.post_type === 'video'. The current code does this check inline
   GitHub
   . By abstracting it, any list (home feed, profile posts, collective posts, search results) can use <PostCard post={...} /> without duplicating logic. We will ensure this component is flexible:
   Accepts props to hide or show certain elements (e.g. maybe in a compact list view we hide the excerpt).
   Supports different layouts (maybe a horizontal card vs vertical). Initially, we'll keep one style for simplicity, but it's good to keep in mind.
   Post Detail View Components: The Article page layout and Video page layout share many elements (title, author info, stats bar, comments). We will converge these:
   Create a component PostHeader that displays the author avatar, name, publish date, collective tag, and follow button (all of which we see in article page header
   GitHub
   GitHub
   ). This can be used on both article and video pages. In the video page currently, some of this info (author, collective) might not have been shown – we will show it for consistency, pulling from the post's author relation.
   A PostContent component to render the main content. For text posts, this wraps the Lexical viewer in styled prose classes
   GitHub
   GitHub
   . For video posts, PostContent would render the <MuxPlayer> element (with a responsive aspect ratio container as in the current video page
   GitHub
   GitHub
   ) and below it perhaps the description text (if any). We can detect post_type and choose the element accordingly, but keep the common structure.
   The Reaction bar (like/dislike) on the article page is already a distinct component (PostReactionButtons)
   GitHub
   . We will use that on both post types. We might adjust its styling/placement for videos if needed (e.g. possibly overlay on video or just below it as currently done under the title on articles).
   CommentsSection is already shared between pages; we just remove the special-case code once video posts are normalized. If needed, we might rename it or generalize it if we later allow commenting on other entities.
   The Editor and Creation Flow: Although not asked in detail, the repository includes a post editor (for writing articles) and presumably a video uploader. Modularization here means we can reuse form components. For instance, the "post details" step (cover image, metadata) at posts/new/details/page.tsx likely overlaps with what an "edit post" page would have. We should ensure that improvements like excerpt or thumbnail management reflect in the editor UI.
   Styling and Theming: The components should use consistent styling (the app uses Tailwind utility classes). We should audit the design of Article vs Video elements to ensure they match. For example, the feed cards have a white background, drop shadow on hover
   GitHub
   , and the video card uses a faux thumbnail with a gray gradient and play icon
   GitHub
   . Once actual thumbnails are available, we can replace the gray placeholder with the real image (still overlaying the play icon and duration)
   GitHub
   . We'll add a utility function to format duration seconds into M:SS which is already in use on the video client side
   GitHub
   GitHub
   – we can reuse that on the server to populate a human-readable duration string in post metadata for quick display.
   State Management: Currently, state is localized: usePostInteractions hook manages liked/disliked sets in Home page
   GitHub
   GitHub
   , while PostReactionButtons uses its own state for like counts on the detail page (taking initial counts as props)
   GitHub
   GitHub
   . We can unify these by lifting state to a context provider at a higher level (e.g. provide user's reactions and bookmarks to all components on a page). However, given our use of Supabase and the fact that a user might interact on multiple posts, an even better approach is to rely on the database and realtime updates. For scalability, we might not want to hold too much global state; instead, each component can call a lightweight mutation API and update its local UI. This is working now (though there's some duplication). In the near term, we will at least reuse the helper functions and consider moving them to a single module. For example, both feed and post page could use a common toggleReaction(postId, type) utility that handles optimistic UI and API call, rather than having separate but similar logic.
   Modular CSS/Design System: As more components are added, adopting a design system (even a lightweight one) will aid consistency. We see repeated elements like avatars, badges, buttons in multiple places. The project already has a components/ui directory with common UI elements (Avatar, Button, Card, etc.)
   GitHub
   . We will continue leveraging those primitives to ensure styles are centralized. If we need something new (like a Modal for video settings or a specialized grid for images), we add it to components/ui so it's available app-wide.
   Overall, this modular approach reduces code duplication – for example, the same PostCard component can be used on the home feed, on a profile's "Recent Posts" list, or even within a collective page. Likewise, the same PostContent logic handles embedding a video player or rendering article HTML, so any enhancements (like adding support for image galleries in posts) would be done once.
6. Database Schema Adjustments for Enhanced UX
   To deliver a "best-in-class" user experience, a few database tweaks are recommended:
   Thumbnails for Video Posts: As noted, currently video posts often lack thumbnails (feed shows a gray placeholder). We should generate and store thumbnails. Options include:
   Generating a thumbnail via Mux: Mux can provide a poster image via their API or by hitting a timed screenshot URL. We could add a field video_assets.thumbnail_url to store a URL to a chosen frame (or upload our own to Supabase storage). However, we already have posts.thumbnail_url intended for "display in feeds and previews"
   GitHub
   . So the plan: when a video finishes processing, use the Mux playback ID to fetch a poster frame (Mux has an endpoint like https://image.mux.com/<PLAYBACK_ID>/thumbnail.jpg). Save this URL into posts.thumbnail_url for the linked post. This can be done in the handleAssetReady webhook handler after updating video_assets (since by then mux_playback_id is known) – we'd do an extra update to the posts table where id = video_assets.post_id
   GitHub
   . If the video's first frame isn't ideal, we might allow creators to upload a custom thumbnail; in that case, the posts.thumbnail_url could be set via the post editor.
   Subtitle/Caption Support for Video: Modern video experiences include closed captions or subtitles. Our schema currently has no explicit support for captions. We can approach this by utilizing the metadata JSON:
   When a user uploads caption files (e.g. VTT or SRT), store them in an object in video_assets.metadata or posts.metadata. For example, metadata.captions = [{ label: "English", url: "https://.../caption.vtt" }, ...]. The front-end MuxPlayer can then be configured to load these tracks. Alternatively, we add a new table for captions, but JSON is acceptable given the likely low volume of tracks per video.
   Additionally, the subtitle field in posts (which currently is meant as a tagline) might be confusingly named given video context. To avoid confusion, we'll clarify terminology: we will use "subtitle" (column) for article sub-headings, and call video text tracks "captions". We won't repurpose the subtitle column for video captions. Instead, we use metadata or possibly extend the video_assets table with a text array of languages available. Given timeline, using metadata is fastest.
   Post Excerpt Caching: To render a text preview on cards without heavy parsing on the client, we should store an excerpt. The code currently uses a utility to extract text from Lexical JSON each time to show a snippet
   GitHub
   . This can be expensive for many posts. We propose:
   Use the existing meta_description field for this purpose. The schema describes it as "Meta description for search engines"
   GitHub
   , which is essentially an excerpt. When an author writes a post, we can have them optionally fill a meta description; if they don't, we auto-generate the first ~160 chars of the content as meta_description on publish. This value can then be used for the card snippet in place of parsing Lexical at runtime. Indeed, 160 characters aligns with SEO needs and gives a nice teaser.
   Alternatively, add a excerpt column (text) that we populate similarly. But leveraging meta_description avoids schema change and fits its intended use.
   We will implement this in the save/publish logic: e.g., after saving a post, if meta_description is empty, set it by stripping HTML from content. This ensures feed queries can select meta_description directly for fast loading.
   Full-Text Search & SEO: The posts.tsv tsvector column is present
   GitHub
   , likely for full-text indexing. We should ensure it's updated via a trigger on insert/update of content (the "cache refresh trigger" in table comment suggests such triggers exist)
   GitHub
   . This benefits search functionality. Also, seo_title exists for custom titles
   GitHub
   – we should allow setting it in the editor for SEO flexibility.
   Multi-Collective Posts: Though not directly about UI, the schema extension in EnhancedDatabase suggests a forthcoming post_collectives table for one post shared to multiple collectives
   GitHub
   GitHub
   . Our design should accommodate that: the post page already shows one collective if any
   GitHub
   . In a multi-collective scenario, it might show "in X and Y" or similar. The plan is to implement multi-collective sharing in the backend (maybe Phase 5 of project), but our front-end components should be flexible (perhaps treating post.collectives as an array). We can future-proof by having the feed transformation gather all collectives (maybe they started this: feed query selects collectives!collective_id which covers one collective
   GitHub
   ; with a join table it will be a many-to-many join).
   Performance & Indexing: We should add DB indexes if any are missing for new patterns (for example, if we frequently query posts by post_type or is_public, consider indexes). The schema already indexes comments by post_id
   GitHub
   and reactions by post_id+type
   GitHub
   , which is good for our usage. We might add an index on posts.author_id for profile pages, and on posts.collective_id for collective pages (already likely present as part of keys; in video_assets they did index collective_id
   GitHub
   ).
   Cleaning Up Redundancy: With these improvements, we might deprecate storing some counts in multiple places. For instance, like_count in posts could become redundant if we trust post_reactions counts. However, keeping it updated can optimize feed queries (no need for a join on reactions). A balanced approach: maintain the like_count and dislike_count via triggers and use them for quick reads
   GitHub
   . Similarly, a comment_count field in posts maintained by triggers on comments would save us from subqueries. These denormalizations are common in large systems for performance.
   Video Post Creation Workflow: When a video is uploaded, currently an entry is created in video_assets and then the user might fill in some details in a "post editor" form. We should adjust the workflow such that creating a video post always creates a posts row from the start (with post_type='video' and status maybe 'draft' until the video is ready). The video_assets.post_id can be set at creation to link them. Our plan might involve a transaction: create post (title, author_id, etc.), create video_asset (with post_id). This way, the video appears in the user's drafts and can even be listed (with a "Processing..." badge) before it's playable. Once Mux confirms readiness, we update the post status to 'active' and maybe notify the user.
   Subtitle (article) vs Caption (video): To avoid confusion between the subtitle column and video captions, we might rename the column in the code (keeping DB name) to "tagline" or "subheading" for clarity when developers read it. No schema change needed, just clarity in usage.
   By addressing these schema and data handling points, we will improve UX by providing visual enhancements (thumbnails), accessibility (captions), performance (cached excerpts), and scalability (precomputed counts, multi-collective support).
7. File Structure and Architectural Considerations for Future Growth
   To future-proof the codebase for a growing content ecosystem, we recommend a clear, domain-oriented structure and attention to scalability patterns:
   Domain Separation: Continue organizing by feature domains (posts, profiles, collectives, videos) both in file structure and in component logic. We already see components/app/posts and components/app/video directories; we should use similar folders for profile or notification components as needed. Each domain can have sub-folders like molecules, organisms as in the current pattern, or we can group by pages. The goal is to make it easy to locate relevant code when expanding a feature. For example, if "poll posts" are introduced, we add post_type='poll' and create PollEditor, PollCard, PollContent components likely under components/app/posts or a new components/app/poll if complex. This avoids monolithic files and encourages reusability.
   APIs and Actions: The project uses Next.js API routes for certain interactions (comments, reactions)
   GitHub
   GitHub
   and also direct Supabase calls from the client. We should streamline this:
   Security-sensitive or complex operations (like creating notifications, or ensuring atomic updates of counts) should happen in API routes or Supabase edge functions, not directly in client. We've partly done this for comments and reactions: e.g., posting a comment calls /api/posts/[id]/comments which then calls a DB function to insert and return the comment
   GitHub
   GitHub
   . The like/dislike toggling on detail page likely calls /api/posts/[slug]/reactions (we have such route file) to update post_reactions and return new totals. We will use these serverless functions as the app's logic layer, keeping the client code simpler.
   We might consolidate some of these APIs in a single "post interactions" endpoint (to reduce number of route files), but that's an optimization. What's key is to handle things like ensuring a user can only like or dislike (not both) at the API level too (the UI prevents it, but the API should also enforce it, perhaps by deleting the opposite reaction as the code does on client
   GitHub
   GitHub
   ).
   Consider using Supabase's RPC (remote procedure calls) or triggers for heavy logic. For instance, an RPC could encapsulate toggling a reaction and returning updated counts in one round trip. This is not mandatory but could be performance win down the line.
   Server-Side vs Client Logic Split: We should audit that heavy data processing is done server-side. For example, formatting of timestamps for display is done on client in HomePage (formatTimestamp)
   GitHub
   , which is fine for relative times since it updates. But static formatting (like showing full date on article) is done on server with formatDate util
   GitHub
   . We'll maintain this balance. Any expensive computing (like parsing Lexical JSON for excerpt) we've offloaded to backend (via meta_description).
   Scalability (Performance): As the user base and content size grows, we must consider:
   Pagination & Limits: Always use .range() or equivalent in Supabase queries for lists. The home feed currently likely limits to e.g. 20 posts (we should verify – the code uses .select('\*') without explicit range, which defaults might be all, but maybe there's a default limit). We will explicitly page results to avoid giant payloads.
   Caching Layers: Using Next's ISR and Supabase's caching (Supabase might cache on a CDN level for public data if configured) will be important. Also, the use of PostgREST via Supabase's JS client is convenient but if needed, we can add Redis caching for certain expensive calls (like trending posts).
   CDN for Assets: Ensure images (thumbnails, avatars) and videos are served via CDN. Supabase storage can be behind a CDN and Mux streams are of course CDN-backed. We should encourage usage of optimized formats (maybe webp thumbnails).
   Monitoring & Profiling: Introduce performance monitoring (the repository even has a scripts/monitor-performance.js likely for client perf) and error tracking so we can proactively address slow queries or memory issues.
   Developer Experience: To keep the codebase maintainable as it grows:
   Use consistent naming and patterns. E.g., our plan to unify post detail page means one set of components deals with both types, which reduces duplicate code paths to test.
   Write documentation for complex flows (perhaps update the docs/ with explanations of video upload architecture, etc.). There's already a creative-video-upload-architecture.md which likely outlines some of this.
   Implement comprehensive unit/integration tests for critical functions (especially the new API routes or complicated Post creation logic).
   Keep the memory-bank (if that's a knowledge base in the repo) updated with new decisions. This helps future contributors understand why certain things were done (the repository has an example memory-bank/creative-video-upload-architecture.md presumably capturing design reasoning).
   By addressing these architectural considerations, we create a codebase that can handle new post types or features (e.g. events, live streams, polls) with minimal friction. The key is that the scaffolding (routing, layout, state management) we put in place now will accommodate future extensions:
   If tomorrow we add "audio posts", we'd add 'audio' to post_type_enum and create an AudioPlayer component, but everything else (feed, comments, likes) works out-of-the-box.
   If we implement recommendation feeds or algorithmic sorting, our modular card components and SSR patterns will still apply; we'd just create a new page (say /trending) that reuses <PostCard> and calls a different Supabase function to get posts.
   The database is already fairly comprehensive for a social content app (covering notifications, bookmarking, etc.); any new schema needs (like a shares count or a tags system for posts) can be integrated without major refactoring because of the flexible design (e.g., tags could be a JSON in metadata or a new join table without affecting existing logic heavily).
