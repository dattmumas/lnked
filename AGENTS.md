Display Featured (Pinned) Posts on Profile Pages: Now integrate the pinning so that the chosen featured posts actImplement Profile-Specific Search Functionality: Activate the "Search this profile..." form present on user and collective pages
github.com
github.com
. Right now, those forms do nothing (their action is empty). We will use them to filter posts on the profile page by a search query. In Next.js App Router, when a form with a name="q" is submitted, the page can capture searchParams. So first, adjust the page components to accept search params. For example, change the function signature of users/[userId]/page.tsx to:
tsx
Copy
export default async function Page({ params, searchParams }: { params: { userId: string }, searchParams: { q?: string } }) { … }
(Do the same for [collectiveSlug]/page.tsx.) Then, use the q parameter if present to modify the posts query. For text search, leverage Supabase’s full-text search capability on the posts.tsv column which is likely configured to index title and content
github.com
. If q exists and is non-empty, perform a text search: e.g.
ts
Copy
postsQuery = postsQuery.textSearch('tsv', searchParams.q!, { type: 'web' });
This will filter posts to those matching the query (the type: 'web' uses the websearch syntax, making the search more natural). If using RPC (get_user_feed), you might instead call a different RPC that handles searching, or fall back to a .from('posts') query with filters. Another approach is client-side filtering, but given we have server-side capabilities and want up-to-date results, doing it in the server component is better. After filtering, proceed with the usual data mapping and rendering. In the UI, when the user enters a search and submits, the page will reload with ?q=term and show only matching posts. We should also provide some UI feedback: if no posts match, render a message like “No posts found for your search.” Similarly implement search on collective pages: filter that collective’s posts by the query (again using full-text search on their posts). We might also consider searching micro-posts if that’s relevant, but those are likely not stored in the DB in the same way (they seem hardcoded for now
github.com
), so skip that.
Important: the search should respect visibility rules. Because we are using the same Supabase query with RLS, it will naturally only return posts the user is allowed to see (public or subscriber-only if the user has access). Our earlier fix (step 11) ensures subscriber-only content can be included if authorized. So text search queries will adhere to those conditions as well – Supabase’s text search can be combined with other filters, or the RLS policy might apply the is_public check. We have to ensure our .textSearch is used in conjunction with the author/collective filter and any published filter. For example, for a public viewer, we might do:
ts
Copy
.eq('author_id', userId)
.textSearch('tsv', q)
.eq('is_public', true).not('published_at', 'is', null)
whereas for a subscriber, we’d omit the is_public filter. You can incorporate that logic similarly to the earlier step.
Lastly, ensure the front-end form triggers properly: the form in the HTML is correct (it has method GET by default when action is empty, which is fine). You might just need to add action={''} explicitly or allow it to default. Test the profile search: go to a user profile with many posts, search a keyword, and verify that only posts containing that keyword appear. This new feature is self-contained to profile pages and doesn’t break existing flows; it leverages DB indexing (tsv columns in users, collectives, posts are presumably kept up-to-date via triggers) so performance should be good.
