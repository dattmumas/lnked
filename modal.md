Goal

Open a "full-content" overlay when a long-form card (post_type text or video) in the left column is clicked, while keeping the short-form column untouched.

⸻

Architectural fit

Layer Re-use from repo Change you add
Routing / URL RightSidebarSwitcher already reads ?thread= and conditionally mounts a sidebar feed Follow the same pattern with a query key post. This avoids modal-route gymnastics and keeps SSR simple.
Layout shell Two-column grid is already driven by CSS vars in ConditionalRightSidebar (tracks --rsb-width) Mount a new PostOverlaySwitcher sibling that listens for searchParams.get('post').
Overlay chrome You already have a glassy, fixed overlay in CollectiveSelectionModal Extract that markup into a shared <GlassPanel> component and reuse it.
Data fetching TenantFeed → API already returns full content/video_id; CenterFeed maps to cards Write a lightweight usePostById(id) that calls /api/posts/[id] (or piggy-back on post repository) so the overlay always shows canonical data.
State & RT React Query already caches by ['post', id] (see useFeedRealtime) Overlay just subscribes to same cache – no extra websockets.

⸻

Step-by-step implementation

1 – URL plumbing 1. Add click handler on long-form cards
In PostCardWrapper (or higher), detect long-form posts and push:

import { useRouter, useSearchParams } from 'next/navigation';
…
const router = useRouter();
const params = new URLSearchParams(useSearchParams());
const openPost = () => {
params.set('post', item.id);
router.push(`?${params.toString()}`, { scroll: false });
};
…
<PostCard onClick={openPost} … />

    2.	Optional: close on Esc or overlay "×" by router.back() (clears param).

2 – Overlay switcher (client component)

'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import GlassPanel from '@/components/ui/GlassPanel';
import PostOverlay from './PostOverlay';

export default function PostOverlaySwitcher() {
const id = useSearchParams().get('post');
if (!id) return null; // nothing selected

return (
<GlassPanel onClose={() => history.back()}>
<Suspense fallback={<Spinner />}>
<PostOverlay postId={id} /> {/_ full renderer _/}
</Suspense>
</GlassPanel>
);
}

3 – Slot it into the (app)/layout.tsx

Just under <ConditionalRightSidebar …> add:

<PostOverlaySwitcher />

Because PostOverlaySwitcher is client-only it re-evaluates on every navigation, eliminating the "frozen path" problem you saw with the server sidebar.

4 – PostOverlay component

import { useQuery } from '@tanstack/react-query';
import { getPost } from '@/lib/data-access/post.repository';

export default function PostOverlay({ postId }: { postId: string }) {
const { data, isLoading } = useQuery(['post', postId], () => getPost(postId));

if (isLoading) return <Spinner />; // reuse existing spinner
if (!data) return <ErrorState />;

return (

<article className="prose max-w-3xl mx-auto py-10">
<h1>{data.title}</h1>
{/_ if video _/}
{data.post_type === 'video' && (
<MuxPlayer playbackId={data.video.mux_playback_id} />
)}
<Markdown source={data.content ?? ''} />
</article>
);
}

5 – Accessibility & scroll locking
• <GlassPanel> sets aria-modal="true" and role="dialog".
• On mount: document.body.style.overflow = 'hidden'; undo on unmount.
• Trap focus inside overlay (headless-ui Dialog already handles this if you migrate to it later).

6 – Server API `/api/posts/[id]/route.ts` ✅

7 – Analytics & tests (in progress)

## Recommended Enhancements (v2)

0 – SEO & Direct-link fallback  
Create `src/app/(overlay)/[postId]/page.tsx` (server component) that renders `<PostOverlay>` on the server. This route handles direct links (`/p/123`) for SEO and unfurls while the query-param overlay continues to power in-app navigation. Add `export const dynamic = "force-static"` or `export const revalidate = 60` if posts rarely change.

1 – Hydration & prefetch in click handler ✅

2 – Overlay switcher ✅
• Fire-and-forget ...

3 – Data layer (RLS aware) ✅

4 – GlassPanel implementation ✅ (completed)
Wrap Radix UI `Dialog` and apply the "body-lock" pattern for iOS (`position:fixed;width:100%`).

5 – Scroll-lock & accessibility  
• `aria-modal="true"` and `role="dialog"` handled by Radix automatically.  
• Focus trap & ESC close come for free.

6 – Server API `/api/posts/[id]/route.ts`  
Validate UUID, reuse the selection from step 3, and return 404 when not visible. Set `Cache-Control: private, max-age=30`.

7 – Analytics & tests  
• Unit: verify URL param round-trip and React-Query hydration.  
• Integration: next/router-mock to test back-button behaviour.  
• E2E (Playwright): ensure scroll lock on iOS viewport and single network request.

8 – Future: migrate to Next 15 intercepting routes  
Once stable you can replace the query-param overlay with `(.)` intercepting routes without touching business logic.

⸻

Why this is "most intelligent"
• Zero duplicate layouts – you stay within the current grid; no extra route groups.
• URL reflects state – sharable, back-button friendly.
• Pure client switch – avoids the server-component freeze cited in your earlier analysis.
• Reuses existing libs – React Query, TanStack queries, Mux components; minimal new code.
• Progressive – you can later swap the query-param approach for Next.js intercepting routes without touching business logic.

Implementing the seven steps above should take < 1 day and fits cleanly into your existing repo structure while giving users a smooth, modal-like reading experience without the usual modal pitfalls.
