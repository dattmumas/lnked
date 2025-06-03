Heavy SSR & API Workloads: Almost every page and API route hits Supabase at request-time, many making multiple serial queries. For example, the dashboard page performs ~6 DB queries on each load
GitHub
and the public collective page does multi-step counts (members, followers) and list fetching
GitHub
GitHub
. This incurs high latency (cold starts + DB roundtrips) and will scale poorly. The app currently opts for dynamic SSR everywhere (no static generation or caching)
GitHub
, meaning repeated computation and DB reads on each request.
Feature Gaps & Incompletes: Some user flows and stats are stubbed out. The dashboard shows placeholders for revenue, payout, open-rate (hard-coded 0 with TODO notes)
GitHub
, and the collective page has a TODO to apply theming which isn’t implemented
GitHub
. These incomplete features could confuse users or indicate rushed development.
Code Bloat & Dead Assets: The repository carries noticeable dead weight. Unused dependencies like Geist UI (geist package) appear in package.json but are never imported
GitHub
. Both Lodash-es and lodash.debounce are installed redundantly
GitHub
. A custom smooth-scroll utility (Lenis via SmoothScroll.tsx) is included but never actually used in the app. There are also leftover “playground” and backup files (e.g. VideoPlayerPageClient.tsx.backup, old editor backups), plus dozens of internal docs and .cursor rule files – all adding clutter.
Emerging Tech Risks: The app is built on bleeding-edge frameworks – React 19 (alpha) and Next 15. While forward-looking, this carries unknown stability and compatibility risks. Some libraries (Radix UI, Lexical) may not officially support React 19 yet. The team pinned Lexical to a specific version
GitHub
– likely to avoid breaking changes – indicating fragility in that integration. Deploying on Next 15 (not yet broadly adopted) might expose edge-case bugs or require extra attention during CI/hosting (for example, ensuring the latest Node runtime support).
Performance and Cost Hotspots: The Supabase-first architecture (using Supabase on every server render) could become cost-prohibitive at scale. Each request triggers one or more HTTP calls to Supabase; at p95 latency, pages like the dashboard might take 300–500ms server time just aggregating data. Cold lambda starts (~100ms+) further add overhead. Large payloads (e.g. fetching entire lists of posts or video records) will also inflate bandwidth costs. Static assets seem mostly light (no huge images in repo; any images are served via Next/Image from remote sources like Unsplash or Supabase storage
GitHub
), but the rich text editor bundle (Lexical + plugins) is likely sizable. The Lexical editor is loaded client-side on demand, yet that chunk could be several hundred KB of JS, affecting users on slow networks. Likewise, the Mux player scripts add to client bundle weight for video pages.
Estimated Monthly Infra Cost: Assuming moderate usage (e.g. a few thousand active users), hosting on Vercel with heavy SSR could run on a Pro plan (~$50) plus overage for lambda execution time (the many DB calls per page may push usage into another ~$50–$100). Supabase costs depend on tier and data egress: the constant queries (especially those with counts) will consume query credits; a rough guess for Supabase would be $25–$100 at scale. Mux video streaming fees (usage-based) and Resend email (per email) would add modest amounts (say $10–$30 unless video traffic is large). In total, expect on the order of $100–$200/month to run this app in production, with cost climbing as active usage and data grow.
Issue Table
Severity Path/Area Problem Recommended Fix
High Architecture (global) No caching or ISR: All pages are dynamically SSR, even largely static content. This causes repeated DB reads and high latency per view
GitHub
. Leverage Next’s ISR for content that doesn’t need real-time updates. For example, cache public pages (profiles, newsletters) with revalidate intervals, and use client-side SWR for minor real-time data.
High src/app/dashboard/page.tsx Excessive DB queries per request: Dashboard SSR calls Supabase ~6–7 times serially (profile, posts, collectives, counts)
GitHub
GitHub
, making the page slow and expensive. Batch and parallelize where possible (the code already parallelizes some counts with Promise.all
GitHub
– continue that for all queries). Consider a single RPC or consolidated query for dashboard stats to cut down round-trips. Cache non-user-specific data in memory or edge if feasible.
Medium src/app/(public)/collectives/[slug]/page.tsx Inefficient counts: For each collective page view, it queries member count, follower count, and follow status separately
GitHub
GitHub
. This is 2-3 extra round trips that could be avoided or merged. Use Supabase RPC or multi-count union queries (if supported) to fetch counts in one call. Alternatively, maintain denormalized count fields in the collectives table (updated via trigger) so that one query returns all needed numbers.
Medium Authentication UX Landing page is client-rendered (use client): The entire home page is not server-rendered at all, which means poor SEO (no content for crawlers) and possibly a flash-of-empty-content for users
GitHub
. Also, the middleware prevents logged-in users from accessing /sign-in and /sign-up – great for security, but the landing page doesn’t auto-redirect, potentially showing a logged-in user the marketing page with no prompt to go to dashboard. For SEO, convert the landing page to a server component (render static HTML for the marketing content, and only use useEffect for the interactive animations). For logged-in users hitting “/”, consider server-redirecting them to /dashboard (to avoid confusion), or at least a visible prompt/button.
Medium Dependencies Unused and duplicate libs: The project includes packages that aren’t used: e.g. Geist UI (geist) is installed but never imported
GitHub
. Both lodash-es and lodash.debounce are included, duplicating functionality
GitHub
. This bloat increases install size and potential attack surface. Prune unused dependencies from package.json (confirm geist and others with global search – in our audit geist wasn’t referenced in code). Use one Lodash approach: since lodash-es covers debounce, remove the standalone lodash.debounce. This reduces bundle size and avoids maintaining extra packages.
Medium React 19 Adoption Using React 19 alpha: The app is pinned to React 19.0.0
GitHub
, which is a non-stable release. This could lead to unpredictable bugs (especially with libraries like Radix UI or Lexical that may not officially support 19 yet). Consider downgrading to the latest React 18 LTS until React 19 is officially stable. If staying on 19, allocate time for rigorous testing on every React update. Monitor dependency repositories for React 19 compatibility issues.
Low src/app/layout.tsx Every page load hits DB for user info: The root layout does a Supabase auth.getUser() on every request to supply the navbar with user data
GitHub
. This is unneeded overhead for pages that don’t require auth (and doubles up work already done in middleware). Use Next’s Session Cookies more smartly: the middleware already checks session; you can pass that info via headers or context to avoid redundant lookups. Alternatively, wrap the navbar in a client component that consumes a lighter-weight global auth context (so the layout doesn’t always await the DB). Only fetch user profile when needed (e.g. on dashboard pages).
Low Lexical Editor (Rich text) Oversized editor bundle: The Lexical editor is configured with every plugin (polls, equations, Excalidraw, etc.)
GitHub
GitHub
– some of which may not even be used by typical newsletter posts. This likely bloats the JS bundle for the editor. Also, Lexical is pinned at 0.31.2 via pnpm overrides
GitHub
, which is fine (likely intentional) but should be kept in sync with needed features. Trim or lazy-load editor plugins: review which Lexical plugins are truly needed in the MVP. For instance, if polls or Twitter embeds are not active features, remove those plugins to shrink bundle size. Keep the Lexical version lock (to avoid breakages), but document why it’s locked and test updates in a sandbox regularly so you can eventually upgrade with confidence.
Low File hygiene Leftover files and artifacts: The repo contains dev artifacts that can be removed to streamline maintenance. Examples: multiple \*.backup files (e.g. old VideoPlayerPageClient.tsx.backup), .cursor/ rule files (editor config), and extensive /docs notes and “memory bank” markdowns that aren’t needed in production. These clutter the repo and could confuse new contributors. Do a sweep to delete or archive off-repo any irrelevant files. Backup and example files should be removed (rely on version control history if needed). If internal docs are important, move them to a separate /docs folder (already exists) but exclude them from build. Keeping the repo lean improves focus on the actual product code.

Performance Appendix
Server-Side Latency: Given the heavy SSR, cold start times for lambdas (~100–200ms) plus multiple Supabase queries (50–100ms each) accumulate. For instance, the Dashboard SSR does ~6 queries; even if parallelized, total DB time could be ~150ms, so with overhead the TTFB might hit 300–500ms for logged-in pages on a warm start (higher if cold). Public pages with fewer queries (e.g. reading a collective’s posts) will be a bit faster but still do counting queries that add overhead. There is essentially zero ISR caching, so these costs apply on every request.
API Endpoint Throughput: Endpoints like POST /api/subscribe and GET /api/videos each perform several steps (auth check + DB ops, possibly Stripe calls)
GitHub
GitHub
. They are likely fine under light load, but without rate limiting, a determined client could spam requests and cause high DB load. Consider adding basic rate limiting (e.g. one video list fetch per second per user) at the API route level to prevent abuse.
Bundle Sizes & Frontend Performance: The client bundle on initial load includes Next/React (~60KB gzipped) + Tailwind CSS. The landing page adds minimal custom JS (just the small cursor/parallax script). However, when users venture into heavy features like the post editor or video player, large chunks load. The Lexical editor with all plugins could be several hundred KB of JS – likely the largest chunk of the app. Mux’s player library (if using @mux-player/react) also adds (~50KB). These on-demand chunks don’t affect first paint, but on slower networks users might notice a delay when opening the editor or video pages.
Public Asset Weight: There are no huge images or videos served statically from /public – most images are loaded via Next/Image from external CDNs (Unsplash, Supabase storage, Mux thumbnails)
GitHub
. That offloads storage costs to those services, but note that Next/Image will cache and re-process those images on your server on first access. Ensure the remotePatterns list is limited (currently 3 domains
GitHub
) to avoid unexpected third-party loads. All custom static assets (SVG icons, etc.) are small and under 4KB each, so no immediate CDN red flags there.
Database Load & Cost: The pattern of frequent .select(count: 'exact') queries (for followers, subscribers, etc.) is expensive
GitHub
. Count queries force the DB to scan indexes or tables – if these counts run often on large tables, it will tax Supabase (and count toward monthly caps). Monitoring and perhaps caching counts (or moving to analytic tables) will be important as data grows. Similarly, listing queries with .select('_') pulling entire rows (e.g. GET /api/videos fetching potentially 20 video records with all fields
GitHub
) should be paginated and scoped to only needed fields to reduce payload size.
Deletion Candidate List
Unused Components/Utils: src/components/app/SmoothScroll.tsx (never imported anywhere; safe to remove along with the lenis dependency). src/components/landing/ has some sections and effects – verify all are used on the landing page; if not (e.g. a stray section file), drop it.
Legacy “Playground” Code: The src/components/lexical-playground/ directory appears to be an earlier iteration of the editor. Now that everything was reorganized under src/components/editor/, any leftover files in lexical-playground (plugins, nodes duplicates) can likely be deleted to avoid confusion. Ensure the new editor is fully in use (it is, via PostEditor and dynamic import of LexicalPlaygroundEditorInternal). Any .backup files in editor/ (we saw LexicalPlaygroundEditorInternal.tsx.backup) should be removed.
Backup & Temp Files: Remove VideoPlayerPageClient.tsx.backup and any similar “.backup” files in the repo. These are outdated and not part of the build. Also consider removing the fix_editor.py and various phase-_.txt or log files unless they serve a purpose; they seem to be one-off scripts or reports not needed in version control.
Documentation/Meta: The .cursor/ directory and memory-bank/ and docs/archive/ files can be pruned. While it’s good to keep some documentation, these internal logs (e.g. archive-post-001-20250106.md) could be moved out of the main repo or at least excluded from deployment. Keeping the repo lean will make onboarding and code search easier.
Dead Styles/Assets: Check for CSS or SVG files that aren’t used. For example, src/components/editor/styles/Toolbar.css.backup is unused. There’s an image-broken.svg icon in the editor images folder – if the editor no longer uses that (or if it was from Lexical’s starter), it can go. Each unused file you remove slightly improves build time and reduces cognitive load.
Quick Wins
Enable Incremental Static Generation: Identify pages that can be statically rendered or lightly cached. For example, the public landing page and read-only content pages (profiles, collective feeds) can use export const revalidate = 60 (or similar) to cache for a minute
GitHub
. This would immediately cut down server load on these routes and speed up response times for repeat visitors.
Trim Unused Dependencies & Code Paths: Do a dependency audit and remove anything not actively used. For instance, dropping Geist UI and other unused packages will shrink the node_modules size and build overhead. Likewise, clean out the backup files and old “playground” code. These changes reduce bundle size and eliminate the risk of accidentally working on outdated code. It’s a straightforward cleanup that improves maintainability with no downsides.
Optimize Supabase Usage: Refactor to reduce redundant calls. The easiest win: stop fetching user/session repeatedly on the server for every request. The middleware already does auth – pass that user info to your pages (via headers or context) instead of calling supabase.auth.getUser() in every layout/page. Similarly, use Supabase’s ability to do multiple operations in one request: for example, fetch profile and posts in one .rpc call, or at least use .select(...) with related tables instead of sequential .from() calls. Fewer round trips = faster pages and lower Supabase billing.
Stabilize React & Next.js Versions: Given the production-critical nature, consider using the stable channel of Next.js (if 15 is canary) and React 18 for now. This avoids chasing framework bugs. If there’s a compelling reason you needed Next 15/React 19 (perhaps for specific features), test those features thoroughly. In particular, verify all third-party libraries (Radix, Lexical, Mux player) behave under React 18 vs 19. Backporting to 18 could instantly resolve any subtle runtime issues and will be easier to hire for (since more devs are on 18 in 2025).
Target Low-Hanging Performance Fruit: A few small tweaks can yield outsized benefits. For example, implement query caching for counts – even caching follower counts in memory for 5 minutes could slash DB calls on popular profiles. Use <Image> for any user-uploaded images with defined sizes to get CDN benefits (the config already whitelists supabase and unsplash domains
GitHub
– ensure you’re using it consistently). Also, compress any large images used in the marketing page and specify proper sizes; even though not evident in repo, if any Unsplash images are full-size, request a smaller variant to reduce egress. These quick optimizations reduce load times and bandwidth costs without major architecture changes.
