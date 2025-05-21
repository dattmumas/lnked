Enhance Collective Profile Page with Owner Info & Tags: Similar improvements for collective profiles in the [collectiveSlug] page (src/app/[collectiveSlug]/page.tsx). We currently fetch the collective’s name, description, and owner_id
github.com
 and display the name and description in the header
github.com
github.com
. Extend this by also fetching the collective’s tags (interests/topics) and possibly a logo/banner if available (the schema likely includes an avatar URL for collectives similar to user profile media). Display the collective’s tags or category and consider showing the owner or member count. For example, you might list the collective’s owner (since owner_id is fetched, join with the users table to get owner’s name for display) or how many members the collective has (query collective_members for that collective). Add this context under the collective name. Also, plan space for a collective avatar/logo in the header; if a collectives avatar field exists (or use a generic icon if not), include it similarly to user avatars. Finally, ensure that if the collective has any pinned or featured post, it will show up at the top of the feed (we will implement pinning in a later step). Keep styling consistent with the rest of the app – for example, center the header content as it is now
github.com
 and use the existing card styles for description text
github.com
. This enriched collective profile should not break existing functionality; it uses additional fields from the collectives table (like tags, which is a text array
github.com
) and simple joins, so it remains read-only and safe.
