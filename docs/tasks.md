1. Align video_assets Schema Across API & UI
   Support all fields end-to-end: Update the backend API and front-end to fully handle is_public, collective_id, encoding_tier, post_id, and playback_policy for videos. Currently, these fields are collected in the upload wizard but ignored in API calls
   GitHub
   . To fix this:
   API – Video Creation (/api/videos/upload-url): Extend the POST handler to accept privacy and encoding fields. Map the wizard’s privacySetting to actual DB fields:
   If privacySetting is "public", set is_public = true and playback_policy = 'public'.
   If "unlisted", set is_public = false but still use playback_policy = 'public' (video not listed but accessible by link).
   If "private", set is_public = false and use playback_policy = 'signed' for Mux (requiring signed URLs for playback).
   Insert these values along with encoding_tier (e.g. 'smart', 'baseline', etc.), collective_id (if provided), and persist them in the new record. For example, include is_public, playback_policy, encoding_tier, and collective_id in the video_assets .insert() call. Also, ensure the Mux upload request uses the correct policy – e.g. pass playback_policy: ['public'] for non-private videos (or ['signed'] for private)
   GitHub
   . This will ensure the Supabase record initially reflects the chosen privacy and quality settings.
   API – Video Update/Publish (/api/videos/[id]): Remove the current whitelist that only updates title/description. Instead, allow updating the new fields:
   Accept and handle privacy_setting or an is_public boolean in the JSON body. On PATCH, translate privacy_setting into the same is_public and playback_policy logic as above, and include those in updateData. Do not “silently ignore” these fields as the code does now
   GitHub
   – instead, actually update the video_assets table columns.
   Accept collective_id and encoding_tier in the PATCH body and include them in updateData if present. This means adding cases similar to title/description for each field.
   Link videos to posts: Implement using post_id instead of title-matching. When a video is published (e.g. PATCH with is_published: true), create a new post in the posts table for that video and update the video’s post_id field with the new post’s ID
   GitHub
   . Use the video’s title/description for the post content and mark the post’s type as 'video' (if a post type enum exists). For example, insert into posts with author_id = video.created_by, title = video.title (or prefixed "Video: ..." for continuity), content = video.description, status = 'active', is_public = video.is_public, and set published_at = now. Capture the new post’s id and save it to video_assets.post_id. This replaces the current hack of matching post titles like "Video: {title}"
   GitHub
   . By doing so, comment threads and feed entries can reliably join videos to their posts via post_id instead of fragile title queries
   GitHub
   GitHub
   .
   Front-End – Wizard Form Data: Adjust the wizard’s publish flow to align with the new API. The useVideoProcessing.publish currently sends privacy_setting and other fields to PATCH
   GitHub
   . Continue to send them (or switch to is_public boolean if preferred) and expect the API to now accept them. The wizard’s defaults should also be coherent (e.g. set initial is_public default to true if the wizard default privacy is "public", to avoid mismatches between form default and Zod default).
   Validation Schemas (Zod): Update the Zod schemas in src/lib/schemas/video.ts to match the DB types and new logic. For example:
   Include encoding_tier, playback_policy, and collective_id in the VideoAssetSchema and mark them with proper types (likely string | null or boolean) to reflect the database
   GitHub
   GitHub
   . Ensure is_public is a boolean in the schema (no longer optional if we always set it).
   If using a separate schema for upload metadata (e.g. VideoUploadMetadataSchema), add encodingTier, privacySetting, etc., or switch to using the normalized fields (is_public, encoding_tier) directly. For consistency, prefer one naming convention: you can use snake_case in API layer and camelCase in React state, but make sure to convert appropriately when calling the API. The goal is to enforce that all required fields (title, is_public, etc.) are present and correctly typed before hitting the API.
   The schema default for is_public should be adjusted to true if we intend new videos to default to public (currently it defaults false in Zod
   GitHub
   , which conflicted with the UI default of "Public"). Align this default with the desired behavior so validation messages and backend values are consistent.
   (Priority: High – implement this first so that data flows are correct. Frontend UI changes will depend on these API and schema updates.)\*\*
2. Apply Mux Best Practices Consistently
   All video processing and playback integration should follow Mux’s official recommendations:
   Remove Custom Mux Wrappers: Eliminate the MuxService class entirely
   GitHub
   GitHub
   . The codebase already bypasses it (API routes call Mux directly), so remove the src/services/MuxService.ts file and any references. Instead of a custom service, use the Mux Node SDK (@mux/mux-node) directly in API routes as you are doing in /api/videos and /api/mux-webhook
   GitHub
   GitHub
   . This reduces indirection and stays aligned with Mux’s documentation (which encourages using their client library directly).
   Direct Upload & Webhook Handling: The direct upload flow in /api/videos/upload-url is already following Mux’s guide (creating an upload with CORS origin, MP4 support, etc.)
   GitHub
   . Keep this logic, but incorporate the new dynamic playback_policy and encoding_tier based on user choices (as noted above). Continue to handle Mux webhooks exactly as shown in their docs – for example, the signature verification and event handling in /api/mux-webhook should remain as implemented
   GitHub
   GitHub
   . Ensure that on video.asset.ready you update all relevant fields (the code currently updates status, duration, aspect_ratio, and playback ID
   GitHub
   ; consider also updating updated_at which you already do, and ensure nothing else is needed). No custom behavior beyond Mux’s standard process is needed.
   Playback & Analytics: Use Mux’s official player and data tracking. The front-end is already using Mux’s React Player (<MuxPlayer>) with an environment key for analytics
   GitHub
   . Continue this practice for all video playback components. Remove any legacy or unofficial video players. By using <MuxPlayer> (or the web component) with envKey and metadata (title, viewer ID/email), you’re following Mux Data’s recommended integration for analytics
   GitHub
   . Double-check that environment keys and player usage are consistent across all video playback pages (e.g. the VideoPlayerPageClient should also use MuxVideoPlayerSimple or similar component so that analytics are uniformly collected).
   Thumbnail Generation: The approach to thumbnails can remain as per Mux guidelines. Currently, you construct thumbnail URLs via Mux’s image API (e.g. .../{assetId}/thumbnail.jpg?time=X)
   GitHub
   . This is acceptable and in line with Mux’s practices (Mux auto-generates thumbnails at various timestamps). You may consider allowing the user to pick a thumbnail, but the key is that no unsupported methods are used. If any custom thumbnail generation code exists outside of calling Mux’s URL (for example, a removed attempt to use MuxService), remove it. Instead, rely on Mux’s provided thumbnail endpoints and ensure the front-end uses those (which you’re already storing in state via generateThumbnails()
   GitHub
   ).
   Cleanup & Consistency: As part of applying best practices, remove any code that deviates from Mux documentation:
   Delete example/test scripts related to Mux if they exist (e.g. any leftover code in scripts/ or commented sections referencing outdated Mux usage).
   Ensure all calls to the Mux API are wrapped in proper error handling and logging (as already done in the webhook and upload handlers). Continue to follow Mux’s error guidance – e.g., on deletion, you correctly catch and log Mux errors but proceed with DB cleanup
   GitHub
   , which matches the idea of handling failures gracefully.
   Confirm that MP4 support and other flags match Mux recommendations for your use-case (e.g., mp4_support: 'capped-1080p' is set at upload creation
   GitHub
   which is a Mux-supported value, so that’s fine).
   (Priority: Medium – this is largely cleanup. Tackle this after schema alignment, since removing dead code and adjusting configs is easier once core functionality is in place. Removing MuxService is quick and lowers maintenance overhead
   GitHub
   .)\*\*
3. Consolidate Video Functionality in /videos
   Reorganize the app’s structure so that all video-related pages live under the /videos route, and remove duplicate or legacy pages:
   Primary Video Library at /videos: Create a new page at src/app/videos/page.tsx that renders the video library/dashboard. You can reuse the existing VideoManagementDashboard component for this. For example, import and return <VideoManagementDashboard /> in the /videos page file (wrapping it in the appropriate layout container if needed, similar to how the old dashboard page did it
   GitHub
   ). This will make /videos the canonical route to view and manage the user’s videos. Ensure this page is protected (only accessible to logged-in users) similar to other dashboard pages (check session and redirect if not authenticated, as done in other pages).
   Retire /dashboard/video-management: Remove the old route file at src/app/dashboard/video-management/page.tsx and any references to it. This page was the duplicate video library view under the dashboard section
   GitHub
   . We no longer need it once /videos is in place. For safety, search the codebase for any direct links or redirects pointing to /dashboard/video-management and update them:
   In the Upload Video page header, the "Manage Videos" link currently points to /dashboard/video-management
   GitHub
   – change this to /videos so that after uploading, users go to the new library.
   In any docs or comments that mention the old route, update to the new path for clarity.
   Remove the VideoManagementPage export and its import of VideoManagementDashboard from the dashboard folder
   GitHub
   .
   Remove Legacy Components: Delete or decommission outdated components that are no longer used after consolidation
   GitHub
   :
   VideoUploader – the one-step uploader (likely at src/components/app/uploads/VideoUploader.tsx). This was part of the legacy flow and is superseded by the multi-step wizard
   GitHub
   . Confirm it’s not used anywhere (it was mentioned to still be mounted in an old “Upload” tab). Remove its import and usage in any “Upload” modal or page, instead directing all upload actions to the /videos/upload wizard.
   VideosPageClient – if such a component or page exists (the audit refers to a legacy /videos page that fetched directly from Supabase
   GitHub
   ). This likely has been replaced by the new API-driven approach. Ensure it’s removed to avoid confusion. All video listing should go through the VideoManagementDashboard via the API now.
   Double-check for any other dead code related to the old video flow (the audit also mentioned removing any example files). For instance, if there's an old example video player or unused context, it should be removed as part of this cleanup.
   Unified Subpages under /videos: Maintain /videos/[id] for playback and /videos/upload for the upload wizard (these already exist). We just need to ensure the navigation between them is consistent. For example, after a successful upload publish, redirect the user to either the video’s page or the main library. If not already done, consider using the onComplete callback in the wizard to router.push('/videos') or to the newly created post page. The key is that a user can navigate from the /videos library to upload new content (probably via an “Upload Video” button) and to view individual videos easily. Since the VideoManagementDashboard already has an “Upload Video” button in its UI
   GitHub
   , ensure it now routes to /videos/upload (if it currently points elsewhere or was a no-op). Similarly, if it has a link to view a video (perhaps clicking a video card goes to /videos/[id]), that should remain correct.
   Navigation and Links: Update all navigation elements to point to this consolidated structure:
   In the sidebar (addressed in the next section), replace the "Video Management" link (currently /dashboard/video-management) with a link to /videos
   GitHub
   .
   If the user’s dashboard overview or profile had quick links or stats for videos, ensure they route to /videos. For example, if the dashboard “Overview” page mentions number of videos with a link, it should target /videos.
   Test that going directly to /videos shows the list, /videos/upload shows the wizard, and old URLs yield 404 or redirect. If needed, implement a temporary redirect: e.g. you might add logic in middleware.ts to redirect /dashboard/video-management to /videos so that old links aren’t broken (optional but good UX).
   (Priority: High – this structural change should be done after the schema and API updates, but before adjusting the sidebar UI, since the new sidebar will reference these routes. Merging the pages early also helps to avoid maintaining two parallel video lists.)
   GitHub
4. Redesign Sidebar Navigation & Accessibility
Revamp the sidebar to improve navigation for the new structure and overall usability:
New Main Links: Extend the main navigation section to include Profile, Overview, Collectives, and Videos:
Profile: Add a SidebarLink for the user’s profile. Use an icon like UserIcon (from lucide-react) and label "Profile". Link this to the appropriate profile page. If a profile view page exists (e.g. /dashboard/profile or the user’s public profile route), use that. Otherwise, linking to the profile edit page (/dashboard/profile/edit) is an interim solution so users can access their profile settings easily. This item should appear at the top of the nav (so users see their profile entry point first).
Dashboard Overview: Keep the "Overview" link (/dashboard) as is
GitHub
. This shows the main dashboard page (statistics, etc.).
Videos: Add a SidebarLink pointing to /videos (icon Video, label "Videos"). This replaces the former "Video Management" entry under dashboard
GitHub
. Ensure the exact property is false so that it highlights for any sub-route under /videos (the SidebarLink logic will handle active state if pathname.startsWith('/videos')
GitHub
GitHub
). The label can be simply "Videos" or "My Videos" for clarity. When the user is on any video page (library, upload, or player), this item should be highlighted as active.
Collectives: Add a main link for collectives with icon (you can reuse the Users2 icon used for individual collectives). Label it "Collectives". Link to the “My Collectives” page at /dashboard/collectives, which lists all collectives the user owns or is part of (that page already exists
GitHub
). This provides a single entry point to manage/view collectives. When active, it indicates the user is in the collectives section of the app.
(The existing collectives subsection will be handled next; this top-level "Collectives" link is a new addition to mimic a parent menu.)
Toggleable Submenu for Collectives: Refactor how collectives are displayed in the sidebar:
Instead of always showing all collective links, make the "Collectives" parent link toggle a submenu (especially in expanded mode). For example, the "Collectives" SidebarLink could have an expand/collapse arrow. When clicked, it would expand to show the list of the user’s collectives (the same list currently rendered with each collective’s name
GitHub
GitHub
). This approach declutters the sidebar by hiding the list until needed, yet keeps it one click away.
Implementation: manage an internal state in SidebarNav for collectivesExpanded. When the user clicks the "Collectives" item (maybe the icon or a small chevron), toggle this state. Use ARIA attributes to mark the submenu as expanded/collapsed (aria-expanded on the toggle, and conditionally render the list).
In collapsed mode, the behavior might remain as is (since tooltips are used): each collective still appears as an icon with tooltip. Alternatively, you could also collapse the entire collectives section into a single icon, but since space is not an issue in collapsed mode, it’s fine to show all icons vertically. The current design already handles collapsed vs expanded layout differences.
Ensure that when a collective is active (user on /dashboard/collectives/[id]), both the parent "Collectives" link and the specific collective should reflect active state. This likely happens automatically (the parent /dashboard/collectives link will be active because the URL starts with that path, and the individual collective link will match exactly). This dual highlighting is acceptable, as it indicates the section and the item.
Persistent Actions at Bottom: Keep the "Upload Video" and "Write Post" actions anchored at the bottom of the sidebar, visible at all times:
Design: When the sidebar is expanded (not collapsed), show two full-width buttons at the bottom: one for creating a new post, and one for uploading a new video. They should be styled similarly (primary buttons). For example, reuse the existing "Create Post" button styling
GitHub
and do a similar one for "Upload Video". The "Upload Video" button can use an upload icon (e.g. Upload arrow icon) alongside the text.
In collapsed state, use icon-only buttons for each action, stacked vertically or in a small menu. Currently, when collapsed, there is a single plus icon button for creating a post
GitHub
. You will add another icon (e.g. a video camera or upload icon) next to or below it for the video upload. Because the collapsed sidebar width is only 4rem (w-16), stacking them vertically is likely better than side-by-side. For instance:
jsx
Copy
Edit
{collapsed ? (
  <div className="flex flex-col items-center space-y-2">
    <Button size="icon" asChild /* Create Post */>…</Button>
    <Button size="icon" asChild /* Upload Video */>…</Button>
  </div>
) : (
  <div className="flex flex-col space-y-2 w-full">
    <Button size="sm" asChild /* Create Post full-width */>…</Button>
    <Button size="sm" asChild /* Upload Video full-width */>…</Button>
  </div>
)}
This will ensure both buttons appear at the bottom, one above the other. Both should have descriptive aria-label attributes (the expanded ones have text, but the collapsed icon buttons need aria-label e.g. "Create Post", "Upload Video" for accessibility).
Routing: The "Write Post" button should link to the post creation page (currently /posts/new as in code
GitHub
). The "Upload Video" button should link to the new video upload page (/videos/upload). Ensure these routes are correct and accessible. After adding the new button, test that clicking it indeed opens the upload wizard page.
Style & Accessibility Consistency:
Keep the styling of new sidebar links consistent with existing ones (they use classes for hover, active states, etc. which SidebarLink already applies
GitHub
GitHub
). The active link style (slight background tint and bold text in expanded mode, or colored border in collapsed mode) should apply to Profile, Videos, and Collectives just like it does for Overview and Posts.
Verify keyboard navigation order: Users should be able to tab through the new links. The Profile link should likely be first in tab order, followed by Overview, etc., down to the bottom buttons. The toggle for collectives submenu should be focusable and indicate state (if you implement it, e.g. an arrow icon should have aria-hidden false and maybe use aria-expanded on the parent).
Responsive behavior: The sidebar in mobile or narrow view likely becomes a drawer or hides (depending on how DashboardSidebar is used in the layout). The changes should degrade gracefully. For instance, if on mobile the sidebar becomes an overlay, the new links and buttons should still be reachable. Test in a small viewport that the sidebar (or the global navigation that triggers it) still shows these new options.
Finally, remove any outdated references in the UI to old pages. For example, if the sidebar had a hardcoded "Video Management" text or the upload page’s header still points to the old path, ensure they’re updated. The end result should be a single, coherent navigation system:
Profile (user settings/profile)
Overview (dashboard home)
My Posts
Videos (library & subpages)
Collectives (with expandable list of user’s collectives)
(bottom actions:) Upload Video and Write Post
This structure will make it easy for the user to access all parts of the app, and is aligned with the requested design
GitHub
. Prioritize implementing the new routes (Videos, Collectives) before adjusting the sidebar links, so that clicking them will work during development. (Priority: Medium – do this after back-end and page refactors are done. The new sidebar links depend on the /videos page existing and the legacy pages removed. Once those are in place, updating the sidebar is the final step to expose the changes to users.)
GitHub
GitHub
