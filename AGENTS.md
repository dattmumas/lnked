Enforce Content Access based on Subscription Status (Privacy): Now that we have free followers and multiple subscription tiers, ensure that content visibility rules (“privacy toggles”) are correctly implemented. Supabase Row Level Security should already restrict posts that are not public to only subscribers, but our frontend filtering must align with it. For instance, on the individual newsletter page, the code currently only shows public, published posts to non-owners
github.com
. This means even if a user is subscribed, the front-end would mistakenly hide subscriber-only posts because of the explicit is_public filter. Fix this by detecting subscription status and adjusting queries. We can use our getSubscriptionStatus helper (in subscriptionActions.ts) to check if the current viewer has an active sub to the profile in question
github.com
github.com
. For example, in users/[userId]/page.tsx, after fetching posts via RPC or query, determine if authUser is subscribed to userId: call getSubscriptionStatus('user', userId) which returns an object with isSubscribed flag
github.com
github.com
. If isSubscribed is true (or if the viewer is the owner), include non-public posts as well. Concretely, modify the posts fetch logic:
If viewer is owner, fetch all their posts (drafts will be handled separately by status).
If viewer is subscribed, fetch posts where published_at is not null (published posts), regardless of is_public. You can drop the .eq('is_public', true) filter in this case, relying on RLS to filter out other users’ private posts unless subscription is present.
If viewer is not subscribed (and not owner), then do as before: only public, published posts.
In code, this might mean restructuring the if-block around the postsQuery
github.com
. Similarly, for collective pages ([collectiveSlug]/page.tsx), remove or bypass the eq('is_public', true) filter
github.com
 if the current user is a subscriber of that collective. You may need to get isSubscribed for collectives via getSubscriptionStatus('collective', collective.id). By doing this, the front end will request the appropriate set of posts; RLS on the posts table should further enforce that if a user tries to request subscriber-only content without a subscription, the query returns nothing (so even if our logic had a bug, the DB protects it). Check that our RLS policies are set accordingly: likely there’s a policy like “if is_public OR (user has active sub)” on posts select. If not, we should add one in Supabase (but since the prompt suggests schema/policies for privacy were done, assume it's there). After this fix, a paying subscriber viewing an author’s page will see the premium posts in the feed, whereas a random visitor will not – which is the intended privacy. Also apply this logic to search (in the next steps) so that private content doesn’t leak to unauthorized users. This step must be handled carefully to avoid breaking existing functionality: ensure that for non-subscribers we still filter out private posts as before, and that we don’t accidentally expose drafts (posts with no published_at) except to the owner. Test scenarios: a logged-out user on a collective page should still only see public posts; a subscribed user on a newsletter page should now see subscriber-only posts populate.
