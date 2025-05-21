Add Follow Button to Collective Pages (Frontend): Introduce a Follow UI on collective profiles to use the new followCollective logic. In the collective profile component (src/app/[collectiveSlug]/page.tsx), currently only a Subscribe button is shown for non-owners
github.com
. Under that, add logic to conditionally show a follow button if the viewing user is logged in and not already following. For consistency, we can reuse the SubscribeButton styling for a follow action, or even reuse the existing FollowButton component by making it flexible. The existing FollowButton is built for user targets (it calls followUser/unfollowUser)
github.com
. We can refactor it to accept a targetEntityType similar to SubscribeButton (e.g., 'user' | 'collective') and a targetId. If refactoring feels risky, create a separate FollowCollectiveButton component that is analogous: it manages an isFollowing state and calls followCollective or unfollowCollective server actions on toggle. Either way, ensure the button uses the same visual style: likely an outline or default variant button with an icon. You might use an icon like UserPlus for follow and UserMinus for unfollow (these are already imported in FollowButton
github.com
). Place this button in the collective header where Subscribe is – possibly to the left of Subscribe or below it. For example:
tsx
Copy
{user?.id !== collective.owner_id && (
  <div className="mt-4 flex gap-2">
    <FollowButton targetEntityType="collective" targetId={collective.id} targetName={collective.name} /* etc */ />
    <SubscribeButton ... />
  </div>
)}
Ensure you determine the initial follow state when rendering: just as we do initialIsFollowing for user profiles by counting follows
github.com
github.com
, do a similar check for collectives (where following_id = collective.id and following_type = 'collective'). Pass that to the Follow button for optimistic UI. When the user clicks follow/unfollow, use transitions to call the appropriate action and update state just like the user follow flow (handling errors by reverting state and showing a message, as FollowButton does now
github.com
github.com
). This addition will allow users to follow collectives without payment, complementing the subscription (paid) option. It should not conflict with existing functionality: subscribe remains for paid content (Stripe flow), and follow is a separate lightweight action using our follows table. Remember to update any relevant tests (e.g., SubscribeButton.test.tsx or create FollowButton.test.tsx) to include collective scenarios if tests exist
github.com
.
