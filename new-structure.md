# Project Structure

Current project structure (src/ only):

```plaintext
app
components
lib
types

src/app:
(auth)
[collectiveSlug]
actions
analytics
api
dashboard
discover
favicon.ico
globals.css
invite
layout.tsx
newsletters
page.tsx
posts
settings

src/app/(auth):
sign-in
sign-up

src/app/(auth)/sign-in:
page.tsx

src/app/(auth)/sign-up:
page.tsx

src/app/[collectiveSlug]:
[postId]
layout.tsx
page.tsx

src/app/[collectiveSlug]/[postId]:
page.tsx

src/app/actions:
collectiveActions.ts
followActions.ts
likeActions.ts
memberActions.ts
postActions.ts
subscriptionActions.ts
userActions.ts

src/app/analytics:
_components
page.tsx

src/app/analytics/_components:

src/app/api:
auth
collectives
comments
like
posts
recommendations
stripe-webhook
subscribe

src/app/api/auth:
callback

src/app/api/auth/callback:
route.ts

src/app/api/collectives:
[collectiveId]
route.ts

src/app/api/collectives/[collectiveId]:
plans
stripe-onboard

src/app/api/collectives/[collectiveId]/plans:
route.ts

src/app/api/collectives/[collectiveId]/stripe-onboard:
route.ts

src/app/api/comments:
_commentId

src/app/api/comments/_commentId:
reactions

src/app/api/comments/_commentId/reactions:
route.ts

src/app/api/like:
route.ts

src/app/api/posts:
_postId
route.ts

src/app/api/posts/_postId:
bookmark
comments
reactions
route.ts
view

src/app/api/posts/_postId/bookmark:
route.ts

src/app/api/posts/_postId/comments:
route.ts

src/app/api/posts/_postId/reactions:
route.ts

src/app/api/posts/_postId/view:
route.ts

src/app/api/recommendations:
route.ts

src/app/api/stripe-webhook:
route.ts

src/app/api/subscribe:
route.ts

src/app/dashboard:
_components
[collectiveId]
collectives
layout.tsx
my-newsletter
new-personal-post
page.tsx
posts
profile

src/app/dashboard/_components:
CollectiveSelectorDropdown.tsx
DashboardNav.tsx
DashboardShell.tsx
DashboardSidebar.tsx
RecentPostRow.tsx
SidebarLink.tsx
SidebarNav.tsx
StatCard.tsx
UserMenu.tsx

src/app/dashboard/[collectiveId]:
new-post

src/app/dashboard/[collectiveId]/new-post:
NewCollectivePostForm.tsx
page.tsx

src/app/dashboard/collectives:
_components
[collectiveId]
new
page.tsx

src/app/dashboard/collectives/_components:
CollectiveCard.tsx
DashboardCollectiveCard.tsx

src/app/dashboard/collectives/[collectiveId]:
manage
page.tsx
posts
settings
subscribers

src/app/dashboard/collectives/[collectiveId]/manage:
members

src/app/dashboard/collectives/[collectiveId]/manage/members:
InviteMemberForm.tsx
ManageMembersClientUI.tsx
page.tsx

src/app/dashboard/collectives/[collectiveId]/posts:
new
page.tsx

src/app/dashboard/collectives/[collectiveId]/posts/new:
page.tsx

src/app/dashboard/collectives/[collectiveId]/settings:
EditCollectiveSettingsForm.tsx
page.tsx

src/app/dashboard/collectives/[collectiveId]/subscribers:
page.tsx

src/app/dashboard/collectives/new:
_actions.ts
NewCollectiveForm.tsx
page.tsx

src/app/dashboard/my-newsletter:
subscribers

src/app/dashboard/my-newsletter/subscribers:
page.tsx

src/app/dashboard/new-personal-post:

src/app/dashboard/posts:
_components
[postId]
page.tsx

src/app/dashboard/posts/_components:

src/app/dashboard/posts/[postId]:
edit

src/app/dashboard/posts/[postId]/edit:

src/app/dashboard/profile:
edit

src/app/dashboard/profile/edit:
EditProfileForm.tsx
page.tsx

src/app/discover:
_actions.ts
_components
page.tsx
RecommendationFeedbackButtons.tsx

src/app/discover/_components:
LoadMoreButton.tsx

src/app/invite:
[inviteCode]

src/app/invite/[inviteCode]:
page.tsx

src/app/newsletters:
_components
[userId]
layout.tsx

src/app/newsletters/_components:
SubscribeButton.tsx

src/app/newsletters/[userId]:
[postId]
layout.tsx
page.tsx

src/app/newsletters/[userId]/[postId]:
page.tsx

src/app/posts:
_components
_postId
[postId]
new

src/app/posts/_components:
BookmarkButton.tsx
CommentsSection.tsx
PostCard.tsx
PostReactionButtons.tsx
PostViewTracker.tsx

src/app/posts/_postId:
edit

src/app/posts/_postId/edit:

src/app/posts/[postId]:
edit
page.tsx

src/app/posts/[postId]/edit:
EditPostForm.tsx
page.tsx

src/app/posts/new:
NewPostForm.tsx
page.tsx

src/app/settings:
_components
page.tsx

src/app/settings/_components:
DeleteAccountSection.tsx
EditUserSettingsForm.tsx

src/components:
app
editor
FollowButton.tsx
landing
Navbar.tsx
PostLikeButton.tsx
ui

src/components/app:
auth
collectives
dashboard
discover
editor
nav
posts
SmoothScroll.tsx

src/components/app/auth:
AuthForm.tsx

src/components/app/collectives:
molecules

src/components/app/collectives/molecules:

src/components/app/dashboard:
atoms
collectives
molecules
nav
organisms
posts
template

src/components/app/dashboard/atoms:

src/components/app/dashboard/collectives:

src/components/app/dashboard/molecules:
compact-collective-card-skeleton.tsx
recent-post-row-skeleton.tsx
stat-card-skeleton.tsx

src/components/app/dashboard/nav:

src/components/app/dashboard/organisms:

src/components/app/dashboard/posts:
PostListItem.tsx

src/components/app/dashboard/template:

src/components/app/discover:

src/components/app/editor:
form-fields
sidebar

src/components/app/editor/form-fields:
PostFormFields.tsx
PostMetadataBar.tsx

src/components/app/editor/sidebar:
FileExplorer.tsx

src/components/app/nav:
ModeToggle.tsx
RouteProgress.tsx

src/components/app/posts:
molecules

src/components/app/posts/molecules:
PostCard.tsx

src/components/editor:
EditorLayout.tsx
EmbedUrlModal.tsx
nodes
plugins
PostEditor.tsx
SEOSettingsDrawer.tsx
Toolbar.tsx

src/components/editor/nodes:
CollapsibleContainerNode.tsx
ExcalidrawNode.tsx
HashtagNode.tsx
ImageNode.tsx
InlineImageNode.tsx
LayoutContainerNode.tsx
LayoutItemNode.tsx
PageBreakNode.tsx
PollNode.tsx
StickyNode.tsx
TweetNode.tsx
YouTubeNode.tsx

src/components/editor/plugins:
CodeHighlightPlugin.tsx
FloatingLinkEditorPlugin.tsx
SlashMenuPlugin.tsx

src/components/landing:
FadeInImage.tsx
sections
SlideInCard.tsx
SnippetCard.tsx

src/components/landing/sections:
AnimatedHero.tsx
CreateCollaborate.tsx
FragmentedFeeds.tsx

src/components/ui:
alert.tsx
badge.tsx
button.tsx
card.tsx
Collapsible.tsx
Footer.tsx
form.tsx
input.tsx
label.tsx
LexicalRenderer.tsx
mode-toggle.tsx
select.tsx
separator.tsx
sheet.tsx
skeleton.tsx
table.tsx
textarea.tsx

src/lib:
data
database.types.ts
email.ts
hooks
schemas
stripe.ts
supabase
supabaseAdmin.ts
types.ts
utils.ts

src/lib/data:
bookmarks.ts
comments.ts
posts.ts
reactions.ts
recommendations.ts
subscriptions.ts
views.ts

src/lib/hooks:
useAuth.tsx
useSupabaseRealtime.tsx

src/lib/schemas:
collectiveSettingsSchema.ts
memberSchemas.ts

src/lib/supabase:
actions.ts
browser.ts
server.ts

src/types:
@components-ui-mode-toggle.d.ts
@radix-ui__react-select.d.ts
@radix-ui__react-tooltip.d.ts
lucide-react.d.ts
next-headers.d.ts
next-link.d.ts
next-metadata-interface.d.ts
next-navigation.d.ts
radix-ui__react-select.d.ts
radix-ui__react-tooltip.d.ts
react.d.ts
supabase-js.d.ts
```
