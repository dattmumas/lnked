Extend Follow Mechanics to Collectives (Backend): Currently, the follow system (follows table and followUser/unfollowUser actions) is only for user-to-user following
github.com
github.com
. We need to allow users to follow collectives as well (for free, non-paid updates). First, extend the data model: if not already present, add a following_type field to the follows table (using the member_entity_type enum of 'user' | 'collective'
github.com
) to distinguish the target type. (If the schema already included this as part of initial setup, just utilize it; otherwise, we’d perform a Supabase migration to add it, but per instructions we assume it’s ready.) Then implement new server actions in src/app/actions/followActions.ts for collectives. For example, create followCollective(collectiveId: string) and unfollowCollective(collectiveId: string) similar to the existing user follow functions. These should check auth (!user -> error just like followUser does
github.com
), prevent following one’s own collective (you might allow it or treat it like you cannot follow your own, analogous to not following yourself
github.com
), then insert/delete from the follows table. Use follows.insert({ follower_id: user.id, following_id: collectiveId, following_type: 'collective' }) for follow
github.com
, and a corresponding delete query for unfollow (matching on follower_id, following_id, and type). Include error handling for duplicates (if a unique constraint exists on that combination) similar to user follow
github.com
. After a successful follow or unfollow, revalidate any relevant pages, e.g., the collective’s page or a user’s feed, to update follower counts
github.com
. Security: set up RLS on follows such that inserts require auth.uid() matches follower_id (likely already done for user-user follow) – ensure it accommodates collective targets as well. With this backend in place, we haven’t changed any existing behavior (user follows still work as before), but we’ve expanded functionality to new entity types using the same pattern.
