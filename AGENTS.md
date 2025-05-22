Lnked Codebase Deep Analysis
File Mapping
The Lnked repository is structured with a clear separation of source code, configuration, assets, and tests. Below is a breakdown of every file and directory grouped by their purpose, along with an explanation of each:
Root & Configuration Files:
README.md: Project overview, feature list, tech stack, and conventions
github.com
github.com
.
.env.example: Template for environment variables (contains keys for Supabase, Stripe, Resend, etc., used to configure external services in development)
github.com
.
package.json: Node package manifest listing all dependencies (Next.js, Tailwind, Lexical, Supabase, Radix UI, etc.) and scripts for building, testing, linting, etc.
github.com
github.com
.
tsconfig.json: TypeScript configuration, including path aliases (e.g. @/ mapped to the src directory) and compiler options
github.com
.
next.config.ts: Next.js configuration file (enables experimental app router features and any custom Next.js settings).
next-env.d.ts: TypeScript definitions for Next.js (auto-generated).
tailwind.config.ts: Tailwind CSS configuration (defines design tokens, color palette, dark mode, etc.).
eslint.config.mjs: ESLint configuration for code linting (extends Next.js defaults)
github.com
.
prettier configuration: (Not a standalone file; Prettier runs with default settings via package.json script).
jest.config.js: Jest testing configuration (uses Next.js preset; ignores e2e tests)
github.com
.
jest.setup.ts: Jest setup file (executed after environment setup, likely importing @testing-library/jest-dom for extended DOM matchers).
playwright.config.ts: Playwright end-to-end testing config (defines test directory, browser settings for e2e tests).
.github/workflows/ci.yml: GitHub Actions workflow for Continuous Integration (runs linting, type-checking, tests on pushes).
.gitignore: Git ignore file (excludes node_modules, build output, environment files, etc.).
(Optional) Supabase config: There is a supabase directory with a .temp/pooler-url file
github.com
(likely a local Supabase config artifact). No migrations are versioned here, indicating database schema is managed in Supabase itself or via SQL scripts outside the repo.
Source Code – Application (src/ directory):
The application is built with Next.js App Router structure, using TypeScript and organized by feature. The src/app folder contains page components and API routes, while src/components holds reusable UI and app-specific components following an atomic design approach
github.com
. Supporting code resides in src/lib and src/types. Key groupings include:
src/app/layout.tsx: The root layout for the Next.js App Router. It wraps all pages with global providers and the navigation header. It includes the theme provider, a smooth-scroll component, a top progress bar, and the main site header (with the Navbar)
github.com
github.com
. It also fetches the current user (via Supabase) on the server to pass user info to the Navbar
github.com
github.com
.
Public Pages (src/app/(public)/...): These pages are accessible without authentication:
src/app/(public)/page.tsx: The landing page (home). This likely presents a marketing or overview of Lnked for new visitors.
src/app/(public)/sign-in/page.tsx and sign-up/page.tsx: Pages for user authentication. They import client-side components for the sign-in/sign-up form logic (see SignInPageClient.tsx, SignUpPageClient.tsx)
github.com
. These pages render the <AuthForm> component with appropriate mode (sign-in or sign-up).
src/app/(public)/profile/[username]/page.tsx: Dynamic route for user profiles. Serves the public profile page for a given username (accessed via URLs like /@username, with a middleware rewrite)
github.com
. This page likely shows a user's public newsletter feed and info.
src/app/(public)/collectives/[slug]/page.tsx: Dynamic route to view a Collective’s public page (a collective is a collaborative newsletter group). It likely lists collective posts and details. There is also a sub-page followers/page.tsx to list followers of the collective
github.com
.
src/app/(public)/discover/page.tsx: The Discover page for finding new collectives
github.com
. It fetches recommended collectives (via fetchRecommendations) and displays them using CollectiveCard components
github.com
github.com
. Pagination is handled with a LoadMoreButton for infinite scroll or manual loading
github.com
. Each collective card can show feedback buttons (Interested/Not Interested) which submit to a server action for recommendation feedback
github.com
github.com
.
src/app/invite/[inviteCode]/page.tsx: Page for handling invite links (e.g., to join a collective via an invite code). It reads an inviteCode param and likely uses Supabase to validate the invite and allow the user to join.
Authenticated App Pages: These require login (enforced via Next.js middleware):
src/middleware.ts: Global request middleware that protects routes and handles rewrites
github.com
github.com
. It rewrites any path starting with /@username to the corresponding /profile/username page for user profiles
github.com
. It also checks if a request is for an auth-required path (like /dashboard, creating or editing posts) and redirects to /sign-in if the user is not authenticated
github.com
github.com
. Conversely, it redirects logged-in users away from the sign-in/up pages to the dashboard
github.com
. This uses a Supabase server client to validate the session from cookies.
src/app/dashboard/layout.tsx: Layout for the user dashboard section. This is a server component that checks auth (redundantly to middleware, for extra safety) and fetches the list of collectives the user is a member of or owns
github.com
github.com
. It passes that data into a <DashboardShell> component which renders the persistent sidebar and top navigation for the dashboard area
github.com
. All pages under /dashboard render inside this layout.
src/app/dashboard/page.tsx: The Dashboard Home page (likely a personalized overview for the user). Could show recent posts, stats, or a welcome.
src/app/dashboard/posts/page.tsx: A page listing the user’s posts (perhaps drafts and published posts) with options to edit or create new posts
github.com
.
src/app/dashboard/collectives/page.tsx: A page listing collectives the user owns or participates in.
src/app/dashboard/collectives/new/page.tsx: Page for creating a new collective (a form to input collective details). It likely uses a server action in \_actions.ts (found in the same folder) to handle the creation logic
github.com
.
src/app/dashboard/collectives/[collectiveId]/page.tsx: Dynamic dashboard page to manage a specific collective (accessible only to that collective’s owner/admin). This might show collective settings, membership management, or post listings for that collective.
src/app/dashboard/profile/edit/page.tsx: Page for editing the user’s profile. It fetches the current user’s profile data on the server and renders an <EditProfileForm> client component with prefilled values
github.com
github.com
. The form allows updating profile fields (name, bio, avatar, etc.) and on submission triggers a server action (updateUserProfile in userActions.ts) to save changes in Supabase
github.com
github.com
.
Editor Pages (Post Editor, route group src/app/(editor)/...):
Editing and creating newsletter posts are handled in a special route group that provides a focused editor UI:
src/app/(editor)/layout.tsx: Layout for editor pages, providing a simplified full-width container without the standard header/footer wrapping
github.com
. This likely hides the main nav to reduce distraction.
src/app/(editor)/posts/new/page.tsx: Page for creating a new post. It probably renders a rich text editor interface (using Lexical) for composing a post. The actual editor UI may be encapsulated in components like <PostEditor> and a form, possibly with server actions for saving the draft.
src/app/(editor)/posts/[slug]/edit/page.tsx: Dynamic page for editing an existing post. Similar to the new post page, but pre-loads the post content by slug and allows updating it. Uses the same editor components.
These editor pages use many components from src/components/editor (see below) – a custom Lexical-based editor – to provide features like formatting toolbar, drag/drop upload, embeds for tweets or videos, etc. The separation into an (editor) group ensures the heavy editor scripts are only loaded for these routes and not for general browsing, improving performance.
API Routes (src/app/api/...): Backend endpoints defined with Next.js API Route handlers (using the new App Router convention of route.ts). They handle server-side actions that are not tied to a single page or that need to be called from the client or webhooks:
src/app/api/stripe-webhook/route.ts: Stripe Webhook endpoint for handling events from Stripe
github.com
github.com
. It verifies Stripe’s signature and processes events like checkout completions and subscription updates. For example, on a successful subscription checkout, it upserts the customer record and logs the subscription to the Supabase DB
github.com
github.com
. This keeps the app’s database in sync with Stripe (for newsletter subscriptions or payments).
src/app/api/collectives/[collectiveId]/stripe-onboard/route.ts: Endpoint to initiate or finalize Stripe Connect onboarding for a collective. When a collective owner wants to accept payments, this route likely creates a Stripe Connect account link or handles the OAuth callback from Stripe (the exact code would detail this).
src/app/api/collectives/[collectiveId]/plans/route.ts: Handles retrieving or creating subscription plans for a collective (e.g., getting pricing info or creating a Stripe product/price for the collective’s paid newsletter).
src/app/api/recommendations/route.ts: Provides collective recommendations (likely used by the Discover page). It may run a server-side function or query to get recommended collectives for the current user, possibly leveraging collaborative filtering or predefined suggestions.
src/app/api/posts/[slug]/reactions/route.ts: Endpoint for post reactions (likes or similar). The presence of reactions suggests that readers can react to a post (or a comment) and this route updates the reaction count in the database.
src/app/api/comments/[commentId]/reactions/route.ts: Similar to above, but for comment reactions (like upvote/downvote on comments).
(Note: Many create/update operations are handled via Next’s Server Actions instead of API routes – see the src/app/actions folder below – so the API directory is mainly for webhooks and possibly for GET endpoints or when an action needs to be called via fetch from the client.)
Reusable Components (src/components/ directory):
The project follows an Atomic Design System
github.com
, organizing components into hierarchical layers of UI (generic atoms and molecules) and App (page-specific molecules and organisms):
src/components/ui/: Atomic UI components – low-level, reusable presentational components, often wrapping Radix UI primitives or basic HTML with Tailwind classes. These are building blocks used throughout the app. For example:
button.tsx: a generic <Button> component with variants (likely using Tailwind and a variant utility)
github.com
.
input.tsx, label.tsx: form inputs and labels for consistent styling.
card.tsx, alert.tsx: card containers, alert messages (probably using Radix Dialog or custom styles for modals/alerts).
badge.tsx: a small UI element for badges/pills
github.com
.
select.tsx: a custom select dropdown, possibly built on Radix Select
github.com
.
dialog.tsx or sheet.tsx: modal dialog and slide-out panel components (the search results show a sheet.tsx likely implementing a side drawer UI)
github.com
.
mode-toggle.tsx: a theme toggle switch (for light/dark mode) both as UI and integrated in nav
github.com
.
These UI components ensure accessibility and consistent styling across the app (e.g. using Radix UI for accessibility where needed, but custom-tailored to the design).
src/components/app/: App-specific components – grouped by feature or page context, often higher-level (molecules/organisms in atomic design terms). Notable subdirectories and components:
auth/: contains <AuthForm> component for sign-in and sign-up flows
github.com
github.com
. It handles form state for login/register, input fields, and error display. This form is used on the sign-in/up pages.
dashboard/: components used in the dashboard area:
organisms/ (in dashboard/organisms/): e.g. DashboardShell.tsx (wraps the dashboard layout structure and probably renders the sidebar + top nav around dashboard content)
github.com
; DashboardSidebar and SidebarNav.tsx for the sidebar navigation links
github.com
; DashboardNav.tsx (maybe a top navigation bar or menu)
github.com
; UserMenu.tsx (user dropdown menu in the dashboard header)
github.com
.
collectives/: e.g. DashboardCollectiveCard.tsx for listing a collective in the dashboard context (maybe showing collective stats or a manage button)
github.com
; possibly forms for creating/editing collectives.
posts/: components for displaying posts or related actions:
molecules/PostCard.tsx: likely a card UI to display a post summary (title, snippet, author)
github.com
.
molecules/BookmarkButton.tsx: a button to bookmark/save a post
github.com
.
Perhaps PostLikeButton.tsx: a button to like a post (since PostLikeButton.tsx appears in search)
github.com
.
newsletters/: components related to newsletters (user’s personal newsletter context):
molecules/SubscribeButton.tsx: button to subscribe/unsubscribe from a newsletter or collective
github.com
.
discover/: components for the Discover page:
molecules/LoadMoreButton.tsx: a button to load the next page of recommendations (likely triggers a router navigation with ?cursor= param or uses a React Server Action to fetch more)
github.com
.
(The RecommendationFeedbackButtons for Discover are co-located in the app folder as a client component to use server actions, as seen in src/app/(public)/discover/RecommendationFeedbackButtons.tsx
github.com
.)
editor/ (this is distinct from src/components/editor – see below): It might contain any app-specific editor integrations. For example, src/components/app/editor/sidebar/FileExplorer.tsx is referenced
github.com
, possibly a sidebar component for managing media or post outline in the editor.
nav/: common navigation components:
Navbar.tsx: The main site navigation bar component (rendered in the root layout header)
github.com
github.com
. It displays the logo (“Lnked.”) and the user menu or auth links.
RouteProgress.tsx: likely a top-of-page progress bar (uses nprogress) to indicate route loading. Indeed, RouteProgress is imported in the layout
github.com
.
ModeToggle.tsx: theme toggle button to switch dark/light mode (likely included in nav or settings)
github.com
.
FollowButton.tsx and FollowCollectiveButton.tsx: standalone components to follow/unfollow users or collectives
github.com
github.com
. These likely call server actions or API to update follow status and update UI accordingly.
src/components/editor/: Rich Text Editor components built on Lexical (a rich text editor framework). This is a major feature of Lnked (the “Rich Post Editor”):
PostEditor.tsx: The main editor component that ties together the Lexical editor instance with plugins and nodes
github.com
. It provides the editing area for posts.
Toolbar.tsx: The editor’s formatting toolbar (with buttons for bold, italic, headings, etc.)
github.com
.
EditorLayout.tsx: Likely a layout or wrapper for the editor interface (could be what wraps the editor and maybe a sidebar or modals, distinct from Next layout)
github.com
.
Custom Nodes (editor/nodes/): A set of custom Lexical node definitions enabling rich content:
e.g. ImageNode.tsx for embedded images
github.com
, InlineImageNode.tsx for images inline with text
github.com
, ExcalidrawNode.tsx for embedding Excalidraw diagrams
github.com
, TweetNode.tsx for embedding tweets
github.com
, YouTubeNode.tsx for YouTube embeds, StickyNode.tsx for sticky notes
github.com
, PollNode.tsx for polls with options
github.com
, PageBreakNode.tsx for inserting a page break or separator
github.com
, LayoutContainerNode.tsx and LayoutItemNode.tsx for complex layout blocks (perhaps for multi-column layouts)
github.com
.
Each node component typically defines how the node is rendered in the editor and possibly how it’s serialized/deserialized to the editor’s JSON format.
Editor Plugins (editor/plugins/): Extensions that add behavior to the Lexical editor:
FloatingLinkEditorPlugin.tsx: plugin for editing hyperlinks (probably shows a floating toolbar when a link text is selected)
github.com
.
SlashMenuPlugin.tsx: implements a Slack/Notion-style “slash command” menu to insert various node types quickly (matching the typeahead menu feature)
github.com
.
CodeHighlightPlugin.tsx: syntax highlighting for code blocks (likely using PrismJS under the hood)
github.com
.
DragDropUploadPlugin.tsx: enables drag-and-drop image uploads into the editor, probably interacting with Supabase storage or an upload API
github.com
.
Others might include plugins for Markdown shortcuts, history/undo, etc., though not explicitly listed, they could be integrated via Lexical’s official plugins.
EmbedUrlModal.tsx, SEOSettingsDrawer.tsx: Components that likely provide editor UI for embedding content via URL (e.g., entering a tweet or video URL) and editing SEO metadata for a post (title/description)
github.com
. These could be invoked from the editor toolbar.
Overall, this editor directory represents a custom-built, extensible editor, which is a central part of creating rich newsletter posts in the app.
Utility & Hook Libraries (src/lib/ directory):
This folder contains supporting modules for data access, integration with external services, and custom hooks/utilities:
src/lib/supabase/: Supabase client helpers for different environments:
server.ts: Creates a Supabase client configured for server-side use (using the service role if needed, or cookies from Next SSR)
github.com
. For example, createServerSupabaseClient() is used in server components to securely query the DB with the user's session
github.com
.
browser.ts: Creates a Supabase client for browser-side use (using the public anon key, typically)
github.com
. This is used in client components (like the sign-in form) to perform actions like supabase.auth.signInWithPassword
github.com
.
These abstractions ensure the code uses the correct Supabase client depending on context (to handle auth either via cookies on server or local storage on client).
supabaseAdmin.ts: A Supabase client instance with admin privileges (using the secret service key)
github.com
. It is used for secure operations like inserting or deleting data bypassing row-level security (e.g., in Stripe webhooks or account deletion logic). For instance, deleting users or updating Stripe fields in DB uses supabaseAdmin
github.com
github.com
.
stripe.ts (implied by usage): Likely exports a configured Stripe SDK client or a helper getStripe() to initialize Stripe using a secret API key
github.com
. This is used in server actions and API routes (like stripe webhooks) to call Stripe’s API.
hooks/: React hooks for specific realtime or client-side logic:
useSupabaseRealtime.tsx: A custom hook to subscribe to Supabase realtime channels (e.g., to listen for new comments or post updates)
github.com
. This would maintain live updates on UI elements without manual refresh.
Other hooks might include ones for infinite scrolling, form handling, etc., as needed.
data/: Modules for data querying and business logic:
recommendations.ts: Encapsulates logic to fetch recommended collectives for the Discover page
github.com
. Likely calls a Supabase RPC or a SQL view that returns recommendations based on user interests.
views.ts: Possibly contains utilities for tracking view counts or reading data related to content views.
These help keep data-fetching logic separate from UI components.
schemas/: Zod schema definitions for validating data:
e.g. postSchemas.ts: Zod schemas for post creation/editing inputs
github.com
github.com
. It defines validation rules (title length, content minimal length, etc.) and is used in server actions to validate form data for posts
github.com
github.com
. It even includes a helper to ensure the post content JSON has at least a certain amount of text (so posts aren’t empty or just media)
github.com
github.com
.
Similar schemas likely exist for other forms (profile updates, collective creation, etc.), either defined inline in actions or as separate modules.
database.types.ts: Likely contains TypeScript types for Supabase tables (if they used Supabase codegen). The TablesInsert/TablesUpdate types imported in some actions
github.com
suggest a generated types file for the DB structure.
Type Definitions (src/types/ directory):
This includes custom .d.ts files to supplement TypeScript where needed:
next-link.d.ts: Probably extends Next.js’s Link component types to allow href starting with @ (for username links) or other custom routing patterns
github.com
.
radix-ui**react-select.d.ts, @radix-ui**react-tooltip.d.ts: These provide TypeScript definitions for Radix UI components if they were missing or needed patching
github.com
. This ensures the Radix UI components used in src/components/ui have proper typing.
Any other global or package-specific type overrides would be here as needed.
Assets (Public Directory):
The app likely has a public/ directory for static assets like images or icons. In this project, most icons are from Lucide Icons (an icon font library), and styles are via Tailwind, so there are few custom static assets. Likely includes:
public/favicon.ico and maybe public/manifest.json for PWA config (if set up).
Possibly default images (logo, default avatar placeholder). If user avatars are stored in Supabase Storage, there may not be many images in the repo itself.
(No large asset files are present in the repository search results, implying assets are minimal or handled externally.)
Tests:
Unit/Integration Tests (src/components/**tests** etc.): The repository contains some React component tests using Jest and React Testing Library. For example, src/components/**tests**/NavbarEditorRoute.test.tsx is a test that probably verifies the Navbar’s behavior when on an editor route (perhaps ensuring the editor link is active or hidden)
github.com
. These tests use jest.setup.ts to include testing-library helpers (like toBeInTheDocument()).
End-to-End Tests (tests/e2e/ directory): Comprehensive user-flow tests written with Playwright:
tests/e2e/basic-flow.spec.ts: Might cover a basic signup -> create post -> logout scenario.
tests/e2e/dashboard.spec.ts: Tests dashboard functionality (e.g., creating a collective, making a post, etc.)
github.com
.
tests/e2e/post-create.spec.ts: Tests the post creation flow (ensuring the rich editor works to publish a post)
github.com
.
tests/e2e/comment-flow.spec.ts: Tests adding comments and reactions, verifying real-time updates perhaps
github.com
.
These E2E tests run in a headless browser environment and simulate user interactions to ensure the entire stack (frontend + Supabase backend) works as expected in a realistic scenario. The Playwright config launches a dev server and runs these flows.
CI Integration: The CI workflow likely runs unit tests (pnpm test which runs Jest) and possibly E2E tests (Playwright) on each push. This helps catch regressions in the codebase automatically.
Each of the above files and directories plays a specific role in making Lnked a “modern, accessible, and extensible publishing platform”, with a clear separation between configuration, presentation components, application logic, and testing.
Architecture Mapping
The Lnked application follows a monolithic web application architecture centered on Next.js’s App Router. It is essentially a single Next.js app that handles everything – there are no separate microservices for backend logic (instead, Next server functions and Supabase serve those needs). The architecture can be characterized as client-server with SSR (Server-Side Rendering) and heavy integration of external services (Supabase for backend and Stripe for payments). Below is a mapping of how the modules interact and the overall architecture pattern:
Overall Architecture & Pattern: Lnked is built on Next.js (React framework) using the App Router. This encourages an MVC-like separation:
Pages/Layouts (Next.js Server Components) act as the Controller/View – they fetch data on the server and render the appropriate UI.
Components serve as the View layer – UI is broken into atomic components (atoms, molecules, organisms) and assembled in pages.
Supabase (external service) functions as the Model layer for persistence – it’s a hosted Postgres database with built-in auth. Instead of writing a custom backend or ORM, the app interacts with Supabase via its JS client or RPC calls.
The architecture is server-centric (“Server-first” as described in the README
github.com
): data is fetched on the server whenever possible (using async server components or API routes) to leverage SSR for SEO and initial load speed
github.com
. For example, pages like the Discover page or Profile page load content via server-side Supabase queries and render the HTML on the server
github.com
github.com
.
The app still uses client-side interactivity where needed (Next’s use client components): e.g., the rich text editor and forms for sign-in are client-side React components for responsiveness, but they often utilize React Server Actions to submit data to the server without full page reloads.
Module Interaction & Data Flow:
The flow of data in Lnked involves Next.js components (server & client), the Supabase backend, and occasionally Stripe:
Authentication Flow: When a user visits a protected route (like /dashboard), the Next.js middleware runs first. It uses createServerClient from @supabase/ssr to check the session cookie
github.com
github.com
. If no valid session, it redirects to /sign-in
github.com
. On sign-in, the user submits credentials via the <AuthForm>; the SignInPageClient component calls supabase.auth.signInWithPassword() using the browser client
github.com
. Supabase handles verification and sets a session cookie. The client then navigates to the dashboard
github.com
. The session cookie (HttpOnly) is automatically picked up by the middleware and server components on subsequent requests, so the user stays logged in.
Data Fetching (SSR): Pages and layouts frequently call Supabase on the server to retrieve data:
e.g. DashboardLayout fetches the list of user’s collectives from the database on each load
github.com
github.com
, then renders the dashboard shell with that data.
The DiscoverPage calls a fetchRecommendations() helper on the server to get recommended collectives
github.com
, which might involve complex SQL or an RPC on Supabase’s side. The recommendations are returned and the page maps them to UI (CollectiveCard components)
github.com
. This yields fully rendered HTML for search engines (good for SEO).
Similarly, the Profile page server-component would query the user’s profile info and posts from Supabase and render them.
The Next.js App Router enables nested layouts and loading states, but in Lnked they often choose to fetch critical data in layouts (for persistent navigation needs) and page components (for page-specific content), using async/await in the component definition (as seen in EditProfilePage which awaits Supabase queries at the top level)
github.com
.
Server Actions vs API routes: The codebase uses Next.js Server Actions (functions marked with "use server") for form submissions and certain mutations, instead of traditional REST endpoints. For example:
src/app/actions/userActions.ts contains updateUserProfile and deleteUserAccount functions that run on the server when invoked
github.com
github.com
. The profile edit form likely calls updateUserProfile via a form action, which validates input with Zod and then uses Supabase to update the DB
github.com
github.com
. On success, it triggers Next to revalidate relevant pages (to reflect the changes)
github.com
.
src/app/actions/postActions.ts similarly has createPost and updatePost for handling post submissions from the editor
github.com
github.com
. These actions validate the post content (using postSchemas), ensure the user has permission (e.g., check collective membership)
github.com
github.com
, then insert or update the post in Supabase. They also generate a slug for the post title and return the new post’s ID/slug
github.com
github.com
. On creation, they might revalidate the user’s posts list or the collective page to show the new post (using revalidatePath)
github.com
.
src/app/actions/likeActions.ts: likely contains actions to handle liking/unliking posts or comments, which update Supabase and return the new like count.
These actions are imported by client components or forms and called via <form action={actionFn}> or useFormState hook (as seen with logRecommendationFeedback in Discover’s feedback form)
github.com
github.com
. This mechanism simplifies data mutations without writing a lot of API fetch calls – Next handles invoking the server action and updating the client state.
When API routes are used: Certain operations require handling external webhooks or being callable from outside the Next app. For those, traditional API routes are used:
The Stripe webhook route is called by Stripe’s servers to notify of events – it can’t be a server action because it’s not triggered by an in-app form, so a dedicated endpoint is needed. It uses the Stripe library to parse events and then uses supabaseAdmin to update the database (e.g., mark subscriptions active, update customer IDs)
github.com
github.com
.
Stripe Connect onboarding likely uses an API route to finalize the OAuth handshake. The app might redirect the user to Stripe’s onboarding, which then returns to the /api/collectives/[id]/stripe-onboard route with a code; that route would then use Stripe’s API (via getStripe()) and supabase to link the Stripe account ID to the collective.
The recommendations API route could be invoked by the client (maybe via React’s use or a fetch) to load more recommendations asynchronously (though the code seems to handle paging via LoadMoreButton adjusting search params, which might actually leverage the server component to fetch next page without a separate API call).
In general, the mix of server actions for first-party interactions and API routes for third-party callbacks or fine-grained endpoints keeps the architecture clean and optimized.
Client-side Interaction & Real-time Updates: On the client, after initial SSR:
The rich text Post Editor is a complex client-side app in itself. It uses Lexical’s React framework to manage the editor state. When an editor page loads, the Lexical editor nodes and plugins initialize to allow editing. If the user drags an image into the editor, the DragDropUploadPlugin will handle uploading to Supabase Storage (likely via a signed URL or using Supabase’s storage API) and then insert an ImageNode with the returned URL.
The editor likely autosaves content: possibly by periodically calling a server action (or using Supabase’s real-time to save drafts). The mention of “autosave” in features suggests the editor might use a debounce to call updatePost server action for draft saves.
Real-time features: the useSupabaseRealtime hook implies the app opens WebSocket channels to Supabase. For example, if multiple people are collaborating or viewing a collective, new posts or comments could be broadcast in real-time. A likely use-case: real-time comments – when one user comments on a post, others viewing it see the comment appear without refresh. The hook would subscribe to the comments table events and update state on insert.
Optimistic UI and state management: Many client components use local state to give immediate feedback. E.g., the Recommendation feedback buttons use useFormState to get immediate submission status and show a message if feedback is recorded
github.com
github.com
. Likes or follow buttons might toggle instantly and then confirm via server action in background.
The app does not appear to use a global state library (no Redux/MobX, etc. mentioned) – it relies on React state, server-passed props, and revalidation. Next.js caching (App Router can cache rendered results by default) is managed manually using revalidatePath after mutations to keep SSR content fresh.
Theme and accessibility: The next-themes integration allows storing the user’s theme preference and applying it on the client. Radix UI components ensure keyboard and screen-reader accessibility (e.g., proper focus trap in dialogs). The atomic design approach means every UI component is designed with accessibility in mind (labels on form fields, aria attributes on icons/buttons)
github.com
.
Architecture Diagram in Words: In practice, when a user visits Lnked:
Request Routing: Next.js serves the page – if it’s a dynamic route, Next uses the filesystem (app folder) to route it. Middleware might rewrite the URL (for /@user profiles) or block access (for dashboard).
Server-side Rendering: The page’s React component (server component) runs. It calls Supabase (via createServerSupabaseClient() or supabaseAdmin depending on context) to get data from the Postgres DB. The data is then passed into JSX and rendered into HTML. Example: visiting /collectives/tech-news triggers the [slug]/page.tsx which likely fetches collective info and recent posts, then returns HTML.
Client Hydration: The HTML is sent to the browser. React hydrates interactive parts (e.g., the theme toggle, any client components like the Subscribe button or comment forms). The page is now interactive. The Navbar recognizes if a user is logged in (receiving initialUser via props from SSR) and shows either a user menu or sign-in link accordingly
github.com
github.com
.
User Interaction: The user clicks or submits forms:
Navigating to another page uses Next’s Link, causing a client-side route transition if possible. A loading bar (RouteProgress with NProgress) is shown on top during route changes for feedback.
If the user creates a new post: they go to /posts/new (editor page). The Editor UI loads (Lexical JS bundle). As they type and add content, the app might autosave through a server action. When they hit “Publish”, a form action calls createPost server function. That function inserts the post into the DB and returns (perhaps the new post slug). The UI might then redirect to the newly created post’s page or the dashboard.
If a user likes a post: clicking the like button might optimistically update the count and call a server action or API route to record the like in the DB and broadcast via Supabase realtime (so if the author is online, they could see a notification, for example).
External interactions: If the user opts for a paid subscription, Stripe Checkout is used. For instance, subscribing to a collective might redirect to Stripe Checkout. Upon success, Stripe calls the stripe-webhook API. That route updates Supabase (e.g., inserts a record into a subscriptions table, marks the user as subscriber of that collective). The next time the user requests data (or via realtime), the app knows they have access.
Architecture Pattern Summary: Lnked’s structure is essentially a modular monolith – one cohesive codebase where front-end and back-end logic blend using Next.js. It leans on Third-Party Backend Services (BaaS): Supabase provides the database, auth, and storage; Stripe handles payments; Resend might handle transactional emails (invite emails, etc.). This reduces the need for a separate server application – Next’s serverless functions and Supabase cover that. The design principles followed include:
Atomic Design & Reusability: UI is systematically broken down, improving maintainability and consistency.
Separation of Concerns: Business logic for data (in lib/_ and app/actions/_) is kept separate from presentational components. This makes it easier to test and evolve logic (e.g., adjusting a Zod schema in one place affects validation everywhere that schema is used).
Performance & UX: Using SSR for initial loads (fast content delivery + SEO), and client-side enhancements (smooth scroll with Lenis, progress indicators, real-time updates) for a snappy user experience. The editor is loaded only when needed, and heavy operations like image uploads or link previews are handled asynchronously or on the server.
Scalability: As a Next.js app, it can scale horizontally (deploy on Vercel or similar) and rely on Supabase for scalable storage and queries. The use of serverless patterns (server actions and API routes) means each user action is a discrete function – easier to scale than a long-running server.
In essence, the files and modules interact in a typical Next.js flow: Layouts and Pages gather data (often via lib/ helpers) and pass it to Components which render UI. User actions from those components invoke Server Actions or API routes that use Supabase/Stripe libraries (in lib/) to update data, and then results are reflected back in the UI (through revalidation or realtime). This architecture provides a robust, extensible platform for collaborative publishing, exactly aligning with the project’s goals (extensibility via adding new Lexical nodes, collaboration via realtime updates, etc.).
Structural Evaluation
Overall, the structure of the Lnked codebase is functionally sound and well-organized. It adheres to modern best practices (Next.js App Router, atomic design, serverless functions) and integrates powerful services without a monolithic backend. Here’s an evaluation of its strengths and potential areas for improvement regarding maintainability, scalability, and performance:
Clarity & Maintainability: The project’s file organization makes it easy for developers to locate relevant code. Grouping by feature (auth, dashboard, editor, discover, etc.) and by atomic design layers (ui vs app components) is logical and scales well as features grow. The use of TypeScript with defined types and Zod schemas for validation ensures reliability – catching errors at build time and validating data at runtime (e.g., form inputs), which improves maintainability. Adding new features (like a new embed type in the editor, or another page) can be done in a modular way by following the existing patterns (create a new node, or a new page in app and corresponding components). Documentation via the README and clear naming (e.g. updateUserProfile, DeleteUserAccount) further improves maintainability by signaling each part’s purpose.
Reusability & Atomic Design: The atomic design approach (atoms/molecules/organisms) avoids duplication of UI code and encourages reusability. For instance, a button style defined once in components/ui/button.tsx is used everywhere, so a style change propagates consistently. This is good for maintainability and theming. One must be careful to document these components and enforce their usage, but given the small team nature, it likely isn’t an issue. As the app grows, the distinction between what belongs in components/ui vs components/app should be maintained to avoid confusion (so far it appears consistent, e.g., form controls in ui vs. domain-specific cards in app).
Scalability: Because the app relies on Supabase (managed Postgres and scalability features) and Next.js (which can be serverless), it should scale to a fair amount of load without major rewrites. The database queries (e.g., fetching posts or collectives) are relatively straightforward and leverage indexes (primary keys, etc., via Supabase). Potential considerations:
The DashboardLayout fetches all collectives a user is in on every dashboard navigation
github.com
. If a user is part of hundreds of collectives, this could slow down each dashboard page load. Caching or pagination might be needed in the future. However, realistically, a user might be in a handful of collectives, so it’s likely fine for now.
The heavy use of server actions means each form submission creates a new serverless function invocation. This is scalable (each invocation can handle heavy logic without blocking others), but complex actions (like deleting an account) execute many sequential queries and API calls
github.com
github.com
. If a lot of users perform these concurrently, it could strain the database or hit rate limits on Stripe. In practice, these actions are rare. If needed, such logic could be offloaded to a background job queue or broken into transactions, but for moderate scale it’s acceptable.
Stripe Integration: The architecture smartly integrates Stripe via webhooks and on-demand API calls. This is scalable as the heavy lifting is on Stripe’s side. Just ensure the webhook handling remains idempotent and secure (they do signature verification
github.com
and early returns).
Real-time features: Using Supabase Realtime scales up to moderate subscriber counts, but if a collective had thousands of live members, the app would need to ensure not all get overwhelmed by updates. Supabase can handle many concurrent subscriptions; the app just needs to handle incoming events efficiently (e.g., debouncing UI updates if needed).
Monolithic vs Microservices: For now, the monolithic approach is beneficial – all logic in one place, fewer deployment moving parts. As usage grows, some parts could be separated (for example, a dedicated microservice for intensive recommendation calculations or a separate process for sending emails via Resend). However, Supabase already provides a lot of backend functionality (like row level security and RPCs) that reduces the need for custom microservices. The structure is appropriate for current scope.
Performance: The app is poised for good performance:
Next.js SSR ensures fast first paint and good SEO for public content. The use of dynamic segmentation (like grouping editor code separately) prevents shipping large unused bundles to users who don’t need them.
Tailwind CSS with utility classes leads to a small CSS footprint (unused styles can be purged). The design tokens and dark mode are handled by CSS classes (no heavy runtime).
The Lexical editor is probably the largest chunk of client JS. By isolating it to editor routes and leveraging code-splitting, regular visitors (readers) don’t pay the cost for editor code. This is a wise structural decision for performance.
Database queries are likely fast: most are simple .select(...) or .insert(...) on keyed fields. Supabase (Postgres) can handle these, and the amount of data per user (posts, comments, etc.) is not extreme in early stages. They do multiple queries in some actions (like loading both owned and joined collectives separately
github.com
github.com
) – these could be combined into one query with a union or a more complex SQL, but doing it in two queries then filtering in JS is acceptable for clarity, and performance impact is negligible unless those lists are large.
One potential performance improvement area: SEO for Post Content. Currently, posts are rich text stored likely as Lexical JSON. When rendering a post for reading, it’s unclear if they server-render any of the content or simply mount a read-only Lexical editor. If content isn’t SSR’d, search engines might not index the post text (counter to the SSR/SEO goal). A possible improvement is to generate HTML from the Lexical state on the server (Lexical provides methods to convert to HTML or plain text). Ensuring that the post’s text is present in the initial HTML would greatly improve SEO for newsletter posts. This could be done by storing an HTML copy or by on-the-fly converting in a server component. This is a future consideration for structural improvement to fully realize the SEO feature
github.com
.
Another performance note: the use of force-dynamic on the Discover page
github.com
means it does not get cached by Next and will run on every request. This is likely needed because recommendations are personalized and updating. It’s a valid trade-off (fresh data vs caching). The team should monitor if this becomes slow and maybe introduce caching at the query level (e.g., caching recommendation results per user for a short time).
Potential Structural Improvements & Issues:
Duplication of Auth Checks: Both the middleware and various server components (DashboardLayout, EditProfilePage) check for authenticated user and possibly redirect. This double-check ensures security (in case one bypasses, the other catches), but it is slightly repetitive. It’s mostly harmless (a small performance cost to check session twice). In the future, if Next.js evolves, they might consolidate auth handling in one place or use a provider. Right now, consistency is key – they do ensure no sensitive page loads without auth.
Error Handling and Resilience: Some server actions (e.g., deleteUserAccount) perform a sequence of operations without an explicit transaction. If one step fails (e.g., Stripe API call fails), the function currently just logs an error and proceeds
github.com
github.com
. This could leave data partially in sync (for instance, user deleted in some tables but not others). In practice, they attempt to delete the Supabase Auth user at the very end (not shown but likely after deleting from users table) – if that fails, the user might be ghosted. Improving this with transaction support (Supabase does allow explicit transactions via SQL or soon via the JS client) or compensating logic would make the system more robust for edge cases.
Testing Coverage: The presence of both unit tests and e2e tests is a strength. To further improve, they might add more unit tests for critical logic like the Zod schemas (ensuring certain invalid inputs produce proper errors) or the recommendation algorithm. Given the project’s complexity (editor, integrations), having thorough tests is important. The current structure lays the groundwork (Jest + RTL, Playwright are configured), so it’s about expanding test cases as the project grows.
Extensibility: Architecturally, it’s built to be extensible – adding a new content node to the editor is as simple as creating a new Node component and registering it (the Lexical setup likely has a place where all nodes are combined). The design system approach means new UI elements will fit in with consistent styling. The use of Zod schemas and centralized data definitions means any addition to the data model (like new fields) can be propagated in a controlled way. One thing to watch: the database.types.ts should be kept up-to-date if the DB schema changes (Supabase provides a generator or one must manually update it). Mismatches there could cause runtime issues – so a process for updating those types is important for maintainability.
No major code smells or anti-patterns are evident. The code uses modern React (function components, hooks), avoids any heavy context or prop-drilling by using either server props or co-located components within route folders. The separation of concerns (UI vs data vs logic) is done well for a project of this scope.
In summary, Lnked’s current structure is solid: it’s logically organized, uses modern frameworks appropriately, and is mindful of performance (SSR where needed, code-splitting, etc.). Maintainability is strong thanks to TypeScript, clear file structure, and testing. Scalability is largely inherited from using Next.js and Supabase – which is a wise choice at this stage. There are always areas to monitor (auth checks, transaction safety, SEO rendering of content), but those are improvements to consider as the project matures. The codebase is in a good position to grow new features without significant refactoring, which is a sign of a healthy architecture.
Dependency Mapping
Lnked leverages a range of external packages and libraries to implement its features. Below is a list of all major external packages used in the project, each with a brief description and a link to its official documentation:
Next.js – A React framework for building web applications with SSR, SSG, and a rich routing system. Lnked uses Next.js (App Router) for page structure, API routes, and fast server-rendered content. Next.js Docs
React – A JavaScript library for building user interfaces. Used as the core UI library. Lnked likely uses React 18+ (with concurrent features). React Docs
TypeScript – A typed superset of JavaScript that adds static types. Provides type safety across the codebase (for props, API responses, etc.). TypeScript Documentation
Tailwind CSS – A utility-first CSS framework for rapidly styling the application. Tailwind provides design tokens (colors, spacing, etc.) and responsive utility classes. Lnked uses Tailwind for layout and theming (including dark mode). Tailwind CSS Docs
Radix UI Primitives – An accessible UI components library (unstyled primitives). Lnked uses several Radix React components such as Dialog, Select, Tooltip, Dropdown Menu, Collapsible, Label, Slot (for composition) to build accessible UI elements
github.com
. Radix ensures proper ARIA attributes and focus handling for modals, menus, etc. These are integrated into Lnked’s custom UI components. Radix UI Documentation
Lucide Icons (lucide-react) – An icon library (the React version of Lucide). Provides a set of versatile SVG icons (a fork of Feather icons). Lnked uses Lucide icons for UI elements (e.g., the Terminal icon in error alerts
github.com
, thumbs up/down icons for feedback
github.com
, etc.). Lucide Icons Docs
Lexical – A rich text editor framework by Meta, used to build Lnked’s custom post editor. Lexical is highly extensible; Lnked includes the core lexical package and multiple official plugins: lists, links, tables, code, markdown, rich-text, selection, etc.
github.com
github.com
. These provide building blocks for lists, tables, text formatting, and even a markdown shortcut system in the editor. Lexical Documentation
@excalidraw/excalidraw – Excalidraw is a virtual whiteboard for sketching diagrams. This React component allows embedding the Excalidraw drawing canvas. Lnked’s editor uses this for an embedded drawing feature (via the ExcalidrawNode). Excalidraw Wiki (official site is the Excalidraw app itself)
Supabase (supabase-js and @supabase/ssr) – Supabase’s JavaScript client libraries. @supabase/supabase-js is the main client for interacting with the Supabase RESTful API (database CRUD, auth, storage). @supabase/ssr provides helpers for Next.js integration (such as creating a server client that can work with Next middleware and server components)
github.com
. In Lnked, these libraries manage user authentication (sign up/in, session), database queries (fetching posts, etc.), and storage (uploading images for avatars or post images). Supabase JS Docs
Stripe – The Stripe Node.js library is used for payment processing. Lnked uses Stripe for newsletter subscriptions/payments. The Stripe library handles creating checkout sessions, retrieving customers, and managing subscriptions (as seen in the webhook logic)
github.com
github.com
. Stripe API Reference
Resend – An email sending service (API for transactional emails). While not heavily evidenced in code excerpts, .env.example suggests Resend integration. It would be used to send emails like invite emails or confirmation emails. Resend Documentation
React Hook Form – A library for building form components in React with minimal re-renders. It manages form state and validation. Lnked uses RHF for various forms (possibly the profile edit form, sign-in form, etc.), to register inputs and handle submission easily. React Hook Form Docs
@hookform/resolvers (for Zod) – This is a companion to React Hook Form that allows integration with schema validation libraries like Zod. It allows RHF to use Zod schemas to validate form data easily. In Lnked, forms that have a Zod schema (e.g. profile or post forms) could use this to generate RHF validation rules. Hookform Resolvers Docs
Zod – A TypeScript-first schema validation library. Lnked uses Zod extensively to validate inputs to server actions and forms (e.g., PostFormSchema, UserProfileSchema)
github.com
github.com
. Zod ensures that data meets the expected format and provides detailed errors. Zod Documentation
Framer Motion – An animation library for React. Likely used for subtle UI animations (collapsible panels, modal transitions, etc.). For instance, the presence of framer-motion suggests some interactive elements (maybe the smooth collapse of menus or fading in of modals) leverage it. Framer Motion Docs
Lenis – A smooth scrolling library for fluid scroll experience. Lnked imports a SmoothScroll component in the root layout
github.com
, which likely configures Lenis to enable inertial scrolling and scroll animations across the site. Lenis (Smooth Scroll) Docs
NProgress – A slim progress bar library often used to show page loading progress. Lnked uses nprogress (via RouteProgress component) to show a top loading bar on route transitions
github.com
. NProgress GitHub (documentation on README)
PrismJS – A syntax highlighting library for code snippets. In the editor, PrismJS is likely used to highlight code blocks when rendering them (the CodeHighlightPlugin ties into PrismJS to apply highlighting to <pre><code> content). PrismJS Website
class-variance-authority (CVA) – A utility for managing Tailwind class variants. It helps define a component’s base classes and variants (like size, style variations) in a type-safe way. Lnked likely uses CVA inside components like button.tsx to easily switch styles based on props (e.g., primary vs secondary button). CVA GitHub
clsx – A tiny utility for conditionally joining classNames. Commonly used with Tailwind to include classes only if certain conditions are true. Lnked likely uses clsx in many components where dynamic classes are needed. clsx GitHub
tailwind-merge – A utility to intelligently merge Tailwind CSS classes, avoiding conflicts (e.g., if you conditionally add p-4 over p-2, it ensures only one is applied). Lnked might use this when composing classes to ensure the final class string doesn’t have contradictory styles. tailwind-merge README
Next Themes (next-themes) – A plugin to manage theme (dark/light) in Next.js applications. It abstracts the logic of applying a theme class to <html> and persisting the choice. Lnked uses it in the root layout to enable dark mode toggling and system theme detection
github.com
. next-themes Documentation
Geist UI – (Listed as geist in package.json) A React component library (from Vercel) for UI elements. Its presence is a bit curious since the project emphasizes custom UI. It might be a leftover dependency or used for a specific component. Possibly, Geist’s components or styles could have been used initially for something like a confirmation dialog or avatar, but currently the project appears to prefer custom Radix-based components. If used, it would provide pre-built UI components; however, given the “Custom UI Only” rule
github.com
, this might not be actively utilized. Geist UI Docs (if relevant).
Each of these dependencies plays a role in the stack: Next.js and React form the foundation, Tailwind and Radix handle UI/UX, Lexical and associated plugins power the rich text editor, Supabase and Stripe provide backend services, and utilities like Zod, RHF, clsx ensure reliability and developer productivity. The thoughtful combination of these packages enables Lnked’s rich feature set – from real-time collaboration to payments – while keeping the code relatively concise and high-level, as much of the heavy lifting is delegated to these well-maintained libraries.
