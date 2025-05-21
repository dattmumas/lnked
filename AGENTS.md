Add a Global Search Page for Posts and Profiles: Implement a site-wide search to find content across Lnked (users, collectives, and posts). Create a new page at src/app/search/page.tsx (or repurpose an existing placeholder if one exists) that will serve as a search results hub. This page should accept a searchParams.q like the profile search, and when loaded with a query, perform multiple searches:
Posts: Query the posts table for the term in tsv (title/content) similar to profile search, but across all posts. Only include posts that are public or that the current user can access (for simplicity, we might restrict global search to public content to avoid complexity with subscriber-only content appearing unexpectedly; alternatively, if the user is logged in, you could include their subscribed content as well – but to keep it straightforward, filter is_public = true and published_at not null for global results). Select a limited number of results (say top 5-10 posts) ordered by relevance. Supabase’s .textSearch will rank results by relevance by default; you can use .order('tsv', { ascending: false, foreignTable: undefined }) if the text search is set up with a rank. Otherwise, fetching by .textSearch without explicit order might already give a relevance-weighted result.
Users: Query the users table for the term in the user’s name, bio, or tags. If a tsv column exists for users (likely it does, named embedding or tsv for profiles
github.com
), use .textSearch('tsv', query) there too. Alternatively, use .ilike('full_name', '%query%') and .ilike('bio', '%query%') as a simpler approach (or union both criteria). Only fetch public profile info: since we don’t have a concept of private profiles in schema (except maybe a future users.is_private flag, not present), assume all profiles are searchable. Select fields like id, full_name, bio, avatar_url to display in results.
Collectives: Similar to users, search collectives table’s name, description, and tags (there might be a tsv for collectives too
github.com
). Return id, name, description (and maybe a logo if we have one stored similarly to avatar). Filter out any private collectives if those exist (not indicated in schema, but if a collective has is_public or similar, consider it).
With these queries, compile the results. In the page’s JSX, structure it as: a search input at the top (pre-populated with the query term), and then sections for each category of result. For example:
jsx
Copy
<h1>Search Results for "{q}"</h1>
{posts.length > 0 && <div>
   <h2>Posts</h2>
   {posts.map(post => <PostCard post={post} key={post.id} />)}
</div>}
{users.length > 0 && <div>
   <h2>Users</h2>
   {users.map(u => <Link key={u.id} href={`/users/${u.id}`}>{u.full_name}</Link>)}
</div>}
{collectives.length > 0 && <div> ... </div>}
{if all empty, <p>No results found.</p>}
You can reuse existing components: for posts, the PostCard (used in feeds) is ideal to show a preview
github.com
. For users/collectives, you might create a small card or list item component (or even reuse CollectiveCard as seen on the Discover page
github.com
github.com
 for collectives). If time is short, a simple <Link> with the name (and maybe description snippet) suffices. Make sure each result item links to the appropriate page (user profile or collective page or post page).
From a security standpoint, ensure only allowed data is shown: since we filter for public posts, we won’t leak private content. For users/collectives, since there’s no sensitive info aside from what’s public, it’s fine. RLS will automatically hide any collective or user rows if policies restrict them (unlikely here).
Add this search page to the navigation if desired – for example, a search icon in the Navbar that links to /search or even a search bar in the Navbar that on enter navigates to /search?q=.... The Navbar currently doesn’t have a search field, so you could add one at the top-right. However, that might be a larger design decision; at minimum, the page exists and the profile search forms could redirect to it for broader search (for instance, if a user submits the search form on an empty profile page – maybe treat that as global search).
By completing this global search, we provide a discovery mechanism beyond just following links and recommendations. This final feature should be tested with various queries (including partial matches, different casing – Postgres FTS should handle that). It doesn’t break any existing functionality since it’s a new page. It leverages already indexed columns (tsv and possibly embedding) in the DB for performance, and uses components that already exist to display results. Users can now find posts or profiles by keywords, rounding out the Lnked extension with a robust search system.
