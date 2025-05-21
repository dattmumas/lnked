Implement Post Pinning/Featuring Action: Allow content creators to mark certain posts as featured so they appear prominently on their profile. This likely involves updating the database and providing a UI control in the author’s dashboard. We assume the schema for featured posts is ready (perhaps a boolean flag or a separate mapping table), so we focus on integration. In the My Posts dashboard list (src/app/dashboard/posts/page.tsx and its child PostListItem.tsx), add a “Pin/Unpin” control for published posts. For example, in PostListItem.tsx, after the Edit and View icons
github.com
, include a new icon button using a thumbtack or star icon (lucide-react provides a Pin icon). This button’s onClick will trigger a server action to toggle the post’s featured status. Create a featurePost(postId, feature: boolean) action in src/app/actions/postActions.ts (or reuse an existing one if present) that does something like:
ts
Copy
await supabase.from('posts')
  .update({ is_featured: feature })
  .eq('id', postId)
  .eq('author_id', user.id);
(The query ensures only the owner can feature their post – you might also ensure the post is published before featuring.) If the schema uses a separate table (e.g., featured_posts mapping user->post), adjust accordingly: insert or delete a row in that table linking this user (or collective) and post. In either case, handle errors (e.g., if the user tries to feature more posts than allowed – if only one pin allowed, first unfeature any currently featured post for that profile). On success, you may revalidate the profile page path to update what’s shown there
github.com
, or simply rely on the next page load since it’s SSR. In the UI, give visual feedback: maybe change the icon (solid pin vs outline) or show a toast “Post pinned to profile”. If using the is_featured boolean on posts, you can fetch that in the posts list query (ensure the select includes that field) to render the icon filled or not.
For collectives, if they also want featured posts, do the same in the context of collective owner in the collective’s posts list or collective settings. Possibly in EditCollectiveSettingsForm or a collective posts management list, allow the owner to pin a post for the collective profile. This could use a similar action but perhaps updating a collectives.featured_post_id field or an entry in featured_posts table with party_a_type = collective. The logic and UI are analogous.
Important: Keep the UI simple and in line with existing components. The PostListItem row can accommodate another icon button without layout issues. Use a tooltip or aria-label="Feature post" to clarify its purpose. Also, ensure this doesn’t conflict with the current logic in ProfileFeed that naively treats the newest post as pinned
github.com
 – we’ll address that next. This step doesn’t break anything existing; it only introduces a new optional action for users. If the featured schema wasn’t in use before, no old code depends on it, so it should be safe.
