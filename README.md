Lnked is a collaborative newsletter publishing platform (think Substack-meets-Linear), aiming for minimalist reading experiences with a power-user writer dashboard, real-time stats, and a design-token driven UI kit
github.com
. This guide explains the project’s architecture and rules for any future GPT-generated code contributions. It should be read by GPT-based tools before making changes to ensure consistency, safety, and alignment with the project’s design and goals.
Project Overview
Purpose & Vision: Lnked enables users to create and subscribe to newsletters, either individually or as part of Collectives (group publications). The platform emphasizes clean design, responsive UI, and collaborative writing features. The goal is to combine newsletter publishing with team collaboration and analytics
github.com
.
Key Modules & Features:
Authentication: User sign-up/sign-in flows (email/password, etc.) with Supabase Auth. Protected areas (like the Dashboard) require login.
Dashboard: An authenticated writer’s area for managing content. Users can write posts (with a rich text editor), view stats, manage their profile, and create or administer collectives.
Personal Newsletters: Every user can publish posts to their personal newsletter feed. These posts are viewable on the user’s public page.
Collectives: Group publications that multiple users can contribute to. Collectives have owners and members with roles (owner/editor/contributor/viewer) – owners can invite others to join. Each collective has its own newsletter feed and settings.
Content Delivery: Readers can visit public pages for a user’s or collective’s newsletter. Posts can be liked, commented on, and bookmarked. A Discover page offers recommendations for collectives to follow
github.com
github.com
.
Subscriptions & Payments: Users can subscribe (paid) to premium content from a particular user or collective. Stripe integration handles checkout and recurring subscriptions, with support for Stripe Connect so collective owners get payouts.
Real-time & Stats: The app is set up for real-time updates (Supabase Realtime) and tracking metrics (post views, subscriber counts, etc.), although some of these features may still be evolving.
Design & UX: The UI follows an atomic design system (reusable UI primitives and higher-level components) and a custom design token system for consistent theming. Dark mode is supported via CSS variables and the Next Themes provider.
Codebase Structure & Design Principles
Lnked’s codebase is organized for clarity and maintainability, separating concerns by feature and component type. The project uses Next.js App Router (Next 13+ / “Next.js 15”) with React Server Components (RSC) and Server Actions. Below is an overview of the repository structure
github.com
github.com
:
plaintext
Copy
Edit
lnked-project/
├─ src/
│ ├─ app/ # Next.js routes (App Router pages)
│ │ ├─ (auth)/ # Public auth pages (sign-in, sign-up)
│ │ ├─ dashboard/ # Protected dashboard (writer area)
│ │ ├─ newsletters/ # Public pages for user newsletters
│ │ ├─ api/ # API route handlers (Stripe, webhooks, CRUD)
│ │ └─ ... # Other top-level routes (e.g., discover, posts)
│ ├─ components/
│ │ ├─ ui/ # Atomic UI components (base primitives)
│ │ └─ app/ # Domain-specific components (posts, collectives, etc.)
│ ├─ lib/ # Libraries & utilities (Supabase clients, Stripe, hooks, schemas)
│ └─ tests/ # End-to-end tests (Playwright) and unit tests (Jest/RTL)
├─ public/ # Static assets (images, icons, etc.)
├─ supabase/ # Supabase config (SQL schemas, RLS policies, Edge Functions)
├─ .github/workflows/ci.yml # CI pipeline (lint, test, build checks)
└─ tailwind*rules.yml # Tailwind CSS guardrail rules for styling consistency
Separation of Concerns:
The src/app/ directory contains Next.js route segments. It uses the App Router conventions (each folder can have its own page.tsx, layout.tsx, etc.). Notably:
src/app/(auth)/ holds authentication pages (login/register). These pages are unprotected and use client-side components for forms.
src/app/dashboard/ is a protected area for logged-in users (writers). It likely includes sub-routes like profile/, collectives/, new-post/ etc., all gated by auth (see Authentication section on how route protection is enforced).
src/app/newsletters/ is intended for public newsletter pages. For example, newsletters/[userId] might list a user’s posts, and newsletters/[userId]/[postId] or the alternative [collectiveSlug]/[postId] route displays individual posts. (The code uses collectiveSlug as a dynamic route for both user and collective posts, treating a personal newsletter as a “collective” in many cases
github.com
github.com
.)
src/app/api/ contains Next.js Route Handlers (serverless API endpoints). These cover actions like subscribing to a plan, Stripe webhooks, user interactions (likes, follows), etc., all running on the server (Node.js or Edge runtime). For example, /api/subscribe creates a Stripe checkout session
github.com
github.com
, and /api/stripe-webhook processes incoming Stripe webhook events
github.com
github.com
.
The src/components/ directory holds all React components:
components/ui/ contains atomic, reusable UI components – low-level elements often wrapping Radix UI primitives or custom styled elements (buttons, inputs, modals, etc.). These are used throughout the app to ensure design consistency.
components/app/ contains domain-specific components grouped by feature or context (e.g., components specific to posts, to collectives, to navigation). This follows an Atomic Design approach where simple UI building blocks are composed into more complex units
github.com
. For instance, components/app/posts/ might have composite components like PostCard, CommentsSection, etc., built from the atomic UI components.
The src/lib/ directory contains utility modules and configuration:
lib/supabase/ – initialization for Supabase clients for both server and browser, plus any Supabase-related helpers.
lib/stripe.ts – setup for the Stripe SDK client (server-side only)
github.com
github.com
.
lib/schemas/ – Zod schema definitions for validating data (e.g., form inputs, database types).
Other utilities: e.g., lib/utils.ts for helper functions (like the cn className combiner), lib/hooks/ for custom React hooks, and any data-fetching logic that doesn’t belong in a component (e.g., fetchRecommendations for the Discover page
github.com
github.com
).
Design & Assets:
Global styles and CSS design tokens are in src/app/globals.css. This file defines CSS variables (for colors, spacing, etc.) under :root and .dark themes. All styling is done via Tailwind CSS classes using these CSS variables – no hard-coded hex colors in JSX
github.com
.
The tailwind_rules.yml file defines lint-like rules for Tailwind usage (enforced in CI). For example, it prevents upgrading Tailwind to v4 without approval, disallows using Tailwind color classes without pairing with base properties, etc.
github.com
. This ensures consistency and that the design token system is followed.
Routing Methodology: The app uses Next.js App Router conventions. Each subdirectory under app/ can have its own layout.tsx for shared UI (e.g., dashboard/layout.tsx for the dashboard’s nav), and page.tsx files for actual pages. Next’s file-based routing handles dynamic segments like [collectiveId] or [postId]. Middleware (see below) is used to redirect unauthorized users. Route Handlers in app/api allow implementing backend logic (instead of a separate Express server) – these are server-only and can securely use secrets and perform privileged operations.
Naming Conventions & File Organization: The codebase consistently uses PascalCase for React components and camelCase for variables and functions (following typical conventions)
github.com
. Files and directories are named for their purpose (e.g. InviteMemberForm.tsx, PostViewTracker.tsx) and colocated appropriately (UI atoms vs. domain components, server actions in app/actions, etc.). Each React component typically lives in its own file named after the component. The project aims to keep functions and components reasonably sized (preferably under ~50 lines) and refactor out helpers or child components as needed for readability
github.com
.
Technology Stack & External Libraries
Lnked is built on a modern web stack. The core technologies and libraries include
github.com
:
Next.js (v13+ App Router) – The React framework for the web application. The project uses Next’s App Router with React Server Components (RSC) and Server Actions. This means many pages and components run on the server by default, and client-side interactivity is added where needed ("use client"). The App Router structure provides built-in routing and layouts, and we leverage Next’s Middleware for advanced routing logic (auth redirects). Always refer to Next.js official docs when modifying routing, server components, or middleware, especially as Next continues to evolve (ensure compatibility with the current Next version used, noted as Next.js 15 in this project).
Supabase (Postgres + Auth + Storage) – Supabase is used as the backend database and authentication provider. It offers a Postgres database with Row-Level Security (RLS) policies for fine-grained auth, and built-in auth (email/password, etc.). The Supabase JS client is used both on the server and client:
On the server, we use the @supabase/ssr helpers to create a Server Supabase Client that integrates with Next’s cookies for SSR authentication
github.com
github.com
. This allows server-side code (including Server Actions and API routes) to securely determine the logged-in user from the same cookies set by Supabase auth. The server client uses the anon public key and runs with the user’s JWT, so RLS policies apply.
On the client, we use the Supabase client (from @supabase/supabase-js via @supabase/ssr’s createBrowserClient) to allow login, signup, and other operations in the browser
github.com
. This client persists auth state (using cookies/localStorage as configured by the SSR helper) and interacts with Supabase for real-time or UI-driven queries (like subscribing to a channel or performing an insert from the browser when appropriate).
A separate Supabase Admin client is configured with the service role key
github.com
. This is only used server-side for privileged actions that bypass RLS (for example, upserting subscription records on webhooks
github.com
github.com
, or checking/inserting data in protected tables). Never expose or use the service role key on the client – any GPT-introduced feature requiring admin privileges must run on the server (e.g., in an API route or Server Action) using supabaseAdmin. The codebase clearly documents this rule
github.com
.
Stripe – Stripe is integrated for payments (subscriptions). The server uses the official Stripe Node.js SDK:
A singleton Stripe client is created in src/lib/stripe.ts with the secret API key from environment
github.com
github.com
. This is only imported in server-side code (e.g., API routes under app/api/\**) since it uses a secret key. Always use official Stripe SDK methods for any payment functionality – do not attempt custom HTTP calls to Stripe or hand-rolled signature verification (the project uses stripe.webhooks.constructEvent for webhook verification
github.com
, per Stripe’s docs).
Checkout Sessions: To initiate a subscription, the client (browser) calls our Next API route /api/subscribe (via fetch) with the target plan info. The route handler creates a Stripe Checkout Session server-side
github.com
github.com
. This includes setting the mode (subscription), line item price ID, success/cancel URLs, and metadata (the Supabase user ID and the target entity being subscribed to). GPT should continue to follow this pattern for any new Stripe checkout flows: gather necessary info on the server, call stripe.checkout.sessions.create() with proper parameters and metadata, and return the session URL to the client.
Webhooks: Stripe webhooks (e.g. checkout completion, subscription updates) are handled by the /api/stripe-webhook route. This route is configured to use the Node.js runtime explicitly (because Stripe’s signature verification requires Node crypto)
github.com
. It verifies the webhook signature using the STRIPE_WEBHOOK_SECRET and processes relevant events
github.com
github.com
. For example, on checkout.session.completed, it links the Stripe customer ID to the user in the Supabase customers table
github.com
. On subscription created/updated/deleted events, it upserts the subscription record in the subscriptions table with status, dates, etc.
github.com
github.com
. If GPT adds or modifies webhook handling, it must strictly follow Stripe’s official patterns (verify signature, handle idempotently if needed, etc.) and never expose sensitive info in responses. Always test webhook logic thoroughly with Stripe’s testing tools.
Stripe Connect: The project supports collectives receiving payments. When a collective owner onboards to Stripe, the /api/collectives/[collectiveId]/stripe-onboard route creates or fetches a Stripe Express account for that collective and generates an onboarding link
github.com
github.com
. Subsequent subscriptions to that collective’s content will include a transfer_data.destination so that payouts go to the collective’s Stripe account
github.com
github.com
. If extending payment features (e.g., adding one-time payments or multiple pricing tiers), ensure to incorporate connect account logic where appropriate and store any new Stripe IDs in the database as needed.
Consult Official Docs: For any changes to Stripe integration (API version updates, new product/price handling, new webhook events), refer to Stripe’s official documentation. The apiVersion in our Stripe client is pinned for stability
github.com
, so coordinate carefully if updating it.
Database & ORM: We primarily use Supabase (PostgREST) as the data layer, not a traditional ORM. Queries are done via Supabase JS client (supabase.from(...).select(), .insert(), etc.), which translates to SQL under the hood. GPT should use the Supabase client for all DB interactions, respecting RLS. Do not bypass RLS by querying the Postgres directly – use supabaseAdmin only in cases where the logic truly requires it (and ensure such code runs server-side).
Zod (Schema Validation): Zod is extensively used to define and enforce schemas for data, especially for form inputs and API payloads. We define Zod schemas for things like new collective creation, profile updates, member invitations, etc., often in src/lib/schemas/* or alongside the action functions. On the client-side, these schemas integrate with React Hook Form via zodResolver to validate user input instantly
github.com
github.com
. On the server-side, the same schemas (or slightly stricter versions) are used to validate and sanitize incoming data in server actions or API routes
github.com
github.com
. GPT should always define a Zod schema for any new form or API input and use schema.safeParse() to validate before trusting input. This ensures runtime type safety and helps produce helpful error messages. Also, prefer deriving TypeScript types from Zod schemas (z.infer<typeof Schema>) to keep types in sync.
React Hook Form: We use React Hook Form for managing form state in the client. Combined with Zod, this provides a robust form validation setup. When adding or updating forms, use the existing patterns (use useForm with zodResolver and default values, etc.)
github.com
. Provide user-friendly error messages via the Zod schema error messages. Each form submission usually calls a Server Action or an API route to perform the update (to leverage SSR and secure credentials).
State Management: For global or cross-component state, we have integrated:
React Query (TanStack Query): This may be used for data fetching and caching client-side. (If not heavily used yet, it is included for future caching of queries like feed data or search results.) If GPT introduces client-side data fetching that needs caching or syncing with server state, consider using React Query’s useQuery/useMutation hooks as appropriate, and always follow their docs for SSR usage patterns.
Zustand: A lightweight state management library possibly used for ephemeral UI state or non-serializable state (the presence of Zustand in the stack suggests usage for things like controlling modals, editor state, or theme toggles). Check for any existing Zustand store patterns (e.g., a useStore hook). If needed, GPT can introduce a new store for specific cases, but keep it simple and document the shape of the state. Always initialize state in a separate module and use provider hooks rather than scattering global variables.
Next Themes: The app uses the next-themes library for dark mode. The ThemeProvider is set up in the root layout
github.com
. GPT should continue to use this for any theme-specific logic (e.g. don’t roll out a custom dark mode switch; use the provided context).
UI Libraries & Components: We rely on Tailwind CSS for styling and some Radix UI components for accessible primitives:
Tailwind CSS: We use Tailwind 3.x (locked to v3 until an intentional migration)
github.com
. All styling should use Tailwind utility classes, often leveraging design tokens (CSS variables) for colors. Do not hardcode colors (use the configured text-foreground, bg-background, etc., which map to CSS vars)
github.com
. Do not upgrade Tailwind or add incompatible plugins without approval, as CI will block it (see tailwind rules). Use the design tokens and spacing scale defined in the design system (8px grid)
github.com
github.com
. If new design tokens are needed, add them in globals.css under the appropriate theme selectors.
Radix UI & shadcn: Many base components (buttons, inputs, alerts, etc.) are built following Radix UI patterns, likely inspired by the shadcn UI library approach. We have a set of pre-built UI components (in components/ui) – always reuse these instead of installing new UI kits. Do NOT introduce heavy UI libraries like MUI, Chakra, or others (they are explicitly banned in our guidelines
github.com
). If a new component is needed, build it using Tailwind and our existing style conventions. Keep accessibility in mind (use proper ARIA labels, semantic elements)
github.com
github.com
, and prefer composition over adding new dependencies.
Lucide Icons: For icons, we use lucide-react (as seen by imports of icons like <Terminal />, <Bold /> etc.). Continue using Lucide for icons; do not mix in other icon libraries. Ensure icons have accessible labels if they’re not purely decorative
github.com
.
Rich Text Editor (Lexical): For the post editor, the project uses Lexical, a React-based rich text editor framework. There is an editor/ component directory containing Lexical setup (e.g., PostEditor, Toolbar, and custom nodes for embeds like polls, images, YouTube, tweets, etc.
github.com
github.com
). GPT should exercise caution when modifying the editor – Lexical has specific patterns for creating nodes, commands, and updating editor state. Always refer to Lexical’s official documentation when extending the editor (e.g., adding a new formatting button or custom node). The current implementation likely includes:
A LexicalComposer in PostEditor that sets up the editor with a theme and nodes.
Custom nodes (e.g., ImageNode, PollNode) defined in components/editor/nodes/* to support rich content embedding.
A floating or fixed toolbar (components/editor/Toolbar.tsx) with formatting controls (bold, italic, headings, alignment, etc.)
github.com
github.com
.
If adding features (say, a new embed type), ensure to register the node in the editor and update the toolbar or menus accordingly. Test thoroughly as Lexical is client-side only and does not persist content unless saved (likely, on submit, the editor’s content is serialized to HTML or JSON and stored in the database). Keep logic that transforms or sanitizes HTML on the server if needed (to avoid XSS – though Lexical provides safe parsing, any GPT-introduced processing of HTML should be reviewed for security).
Testing & CI: The project has tests set up:
Jest + React Testing Library for unit and component tests (run via pnpm test). If GPT adds new React components or logic-heavy functions, consider writing or updating tests for them. At minimum, ensure all tests continue to pass after changes.
Playwright for end-to-end tests (src/tests/e2e). Critical user flows (like login, creating a post, subscribing, etc.) might be covered by E2E tests. After significant changes, running E2E tests (if any) is expected. If GPT introduces a major feature, adding an e2e test for it is encouraged.
Linting: ESLint is configured (likely including TypeScript rules, import order, no unused vars, etc.). Prettier is also used. The CI (Continuous Integration) will run pnpm lint, pnpm test, and pnpm build on every pull request
github.com
. GPT must ensure code is lint-free and type-checks. Always format code with Prettier conventions (indentation, quotes, etc.) – never leave large blocks of commented-out code or TODOs in commits
github.com
.
Always Consult Official Documentation: For each of these technologies (Next.js, Supabase, Stripe, Lexical, React Hook Form, etc.), any non-trivial change should be informed by the official docs or well-vetted community examples. GPT should not rely on guesswork for library usage – if adding a Next.js Server Action, double-check the Next docs for the latest syntax; if updating a Supabase query, ensure the call matches Supabase’s API. This prevents regressions and ensures we use each tool as intended.
Safe Coding & Extension Guidelines
When GPT modifies or extends the codebase, it must adhere to strict safety and style guidelines:
Follow Project Conventions: All new code should match the established patterns in naming, style, and structure. Use the same lint rules, formatting, and file organization. For example, component files go in the appropriate folder (ui vs app components as described), functions use camelCase, component props are typed with TypeScript interfaces or types, etc. Do not introduce stylistic inconsistencies.
Atomic Design & Modularity: Respect the atomic design system. If adding a low-level UI element that could be reused elsewhere, implement it as a reusable component in components/ui/. If it’s specific to a feature (e.g., a special card for the dashboard), put it in components/app/<feature>/. This keeps the UI library scalable. Avoid duplicating code – abstract common logic into helper functions or components in lib/ or appropriate places when it’s used in multiple spots.
Introduce New Libraries Cautiously: Prefer using the existing stack and libraries. If a new dependency is absolutely required, ensure it’s lightweight and aligns with our needs. Any new package must be reviewed for licensing, size, and compatibility (and added via pnpm). In many cases, you should first try to use built-in web APIs or existing libraries. (For instance, do not add a moment.js for date handling – use native Date or a lightweight alternative already in use.) If in doubt, open a discussion rather than directly adding a new dependency.
No Unauthorized Major Upgrades: Do not upgrade major library versions or tools without explicit approval. This includes Next.js, React, Tailwind, Supabase, Stripe, etc. We have guardrails (for example, Tailwind is pinned to 3.x
github.com
) to avoid unplanned breaking changes. If you believe an upgrade is needed, you can propose it, but it should be done in a controlled manner (separate branch/PR, with testing).
Integration Boundaries: Keep clear lines between server-side and client-side logic:
Any code handling sensitive data (secrets, private user data) or performing privileged operations must run on the server. This often means using Next.js API routes or Server Actions. For instance, creating a Stripe checkout or handling a Supabase service-key query must be in an API route (as it already is in /api/subscribe). On the client-side, never expose secrets (don’t include SUPABASE_SERVICE_ROLE_KEY or STRIPE_SECRET_KEY in client code – they should remain exclusively in server environment variables).
Conversely, UI interactions and browser-only APIs (like localStorage, or direct DOM manipulation if needed) belong in client components or client-side code. Do not try to use browser-only APIs in server components (it won’t work).
We use Next’s "use client" and default server component distinctions – maintain these. If adding a new page or component:
Use a Server Component by default (no "use client" at the top) if it doesn’t need interactivity. Server Components can fetch data directly (using our Supabase server client or other server APIs) and are SEO-friendly.
Use a Client Component ("use client") only if needed (user interactivity, state, effects, etc.). In client components, you can use hooks like useState, useEffect, or context (e.g., React Query, Zustand).
It’s fine to mix: e.g., a server-rendered page that imports a client-only component for interactive parts.
Never mix secret data into client code. For example, if you are implementing a new API call that requires a secret API key, the fetch to the third-party service must happen server-side (either in an API route or in a server action), not directly from the browser.
Preserve Security Practices: The codebase uses Supabase RLS and explicit checks to secure data:
Continue to check user authentication on any action that needs it. For instance, see how createCollective first ensures user is not null
github.com
, or how follow/unfollow actions verify the user and handle unauthorized cases
github.com
github.com
. Follow this pattern: always validate that the user is logged in (supabase.auth.getUser() or getSession()) and return an appropriate error if not.
Maintain RLS by using row-level policies in the DB and using the regular supabase client for user-specific data. If GPT adds a new table or new queries, ensure that either a) RLS policies exist for it, or b) it’s only accessed via supabaseAdmin in secure server code. If using supabaseAdmin, be very cautious – it bypasses all security.
Never log sensitive info (passwords, tokens, personal data) to console or expose it in responses. Our code sometimes logs events for debugging (e.g., logging session establishment in auth) but avoids logging private data. Continue that discipline.
Validate all inputs on the server. Even if a form is validated on the client with Zod, double-check it on the server (defense in depth). Use Zod schemas or manual checks for any API route payloads. For example, the subscribe route ensures priceId, targetEntityType, etc., are present and valid before proceeding
github.com
github.com
.
Error Handling and Messages: Maintain user-friendly error handling. Many functions return structured results like { success: false, error: "message" } and sometimes fieldErrors for form validation issues
github.com
github.com
. Continue to use this pattern. Don’t expose raw exceptions to the user – catch errors and wrap them in friendly messages or error codes. Also, make sure to handle promise rejections (use try/catch in async functions) so that errors don’t cascade uncaught.
Testing Expectations: Every change should keep the build and tests passing. GPT-generated changes should run pnpm build (to ensure type correctness) and ideally pnpm test. If you implement a significant feature, add corresponding tests:
Unit tests for pure functions or complex login logic (if any).
Component tests for critical interactive components (especially forms and auth flow).
E2E tests if a user flow is added (you can script Playwright to simulate the new behavior).
At a minimum, manual testing of new features in a dev environment is required. The CI will catch failing builds or tests – GPT should aim to catch them before committing.
Performance Considerations: The app is designed to be scalable (thanks to SSR and caching). When adding new features, consider performance:
Use pagination or lazy loading for potentially large lists (e.g., the Discover page uses cursor-based pagination via LoadMoreButton).
Avoid N+1 queries by leveraging Supabase’s ability to select related data in one call (the post page does a single query joining author and collective and counting likes
github.com
).
For expensive operations (like image uploads or data crunching), consider moving them to edge functions or background jobs if needed (Supabase Edge Functions or Next.js API routes can be used).
Do not block the UI with slow calculations; use async patterns or optimistic UI updates when appropriate.
UI/UX Consistency: When extending the UI, keep it consistent with the current design:
Follow the design system for spacing (8px grid, use Tailwind spacing utilities)
github.com
github.com
.
Use existing color classes (text-primary, bg-muted, etc.) rather than new or arbitrary colors.
Ensure new components support dark mode (typically by automatically using theme variables or Radix primitives which handle theming).
Maintain accessibility: use semantic HTML (e.g., <button> for clickable buttons, <form> for forms, appropriate headings hierarchy). Include aria-labels or screen reader text for icons or non-text buttons
github.com
.
Mobile responsiveness: test new UI on small screens. Use Tailwind responsive utilities (e.g., md:px-6) as seen in existing code
github.com
.
By following these practices, GPT can add features safely without regressions or style issues. When in doubt, search the repository for similar implementations as reference, or consult the maintainers via comments.
Authentication & State Management
Authentication is powered by Supabase Auth, with careful handling to integrate it into Next.js App Router:
Supabase Auth Flow: Users authenticate (login/signup) via Supabase. On the client side, we use supabase.auth.signInWithPassword() or other auth methods. For example, the SignIn page calls supabase.auth.signInWithPassword({ email, password }) and obtains a session
github.com
. Supabase’s JS client will handle setting the session (by storing a refresh token). In our SSR setup, Supabase is configured to use cookies for storing the session token (rather than only local storage) so that the server can also read the session.
Session Persistence: After a user signs in, we ensure the session is persisted in cookies. The sign-in component explicitly checks supabase.auth.getSession() after login
github.com
, and only proceeds to redirect if a session is present. We even add a short delay before redirecting to allow the cookie to propagate
github.com
. This was a recent fix to handle Next.js’s async cookie writing – without this, sometimes the page would redirect before the auth cookie was available to the server. GPT should preserve this pattern: always confirm the user session is set before moving to a protected page.
Next.js Middleware for Auth: The project uses a Next.js middleware.ts to protect routes under /dashboard and to manage redirects for auth pages
github.com
github.com
. The middleware runs on Edge for every request to matching routes (/dashboard/*, /sign-in, /sign-up)
github.com
:
If a user is not logged in and tries to access /dashboard, the middleware redirects them to /sign-in?redirect=/dashboard/...
github.com
.
If a user is logged in and hits the auth pages (/sign-in or /sign-up), it redirects them to the dashboard
github.com
(so logged-in users don’t see the login form again).
The middleware uses createServerClient from @supabase/ssr with a custom cookie handler to read/write cookies on the NextResponse
github.com
github.com
. This is necessary because middleware runs before the full Next.js response, and we want to carry Supabase session cookies through. The code carefully catches errors (so a failure in auth check doesn’t crash the request, it just proceeds)
github.com
.
If GPT changes route structures or adds new protected sections, update the middleware.ts matcher and logic accordingly. For example, if adding an admin section, you might extend the matcher to protect /admin/\* as well.
Server-Side Auth (SSR): In server components or server actions, we use the createServerSupabaseClient() helper (see src/lib/supabase/server.ts) to get a logged-in Supabase client bound to the user’s session
github.com
. This uses Next’s cookies() under the hood to sync the Supabase client with the cookies for that request
github.com
. With this, we can safely query user-specific data on the server without additional tokens. For instance, a server action might do:
ts
Copy
Edit
const supabase = createServerSupabaseClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) { ...handle not logged in... }
This pattern is seen in many actions (e.g., getCurrentUserProfile, createCollective)
github.com
github.com
. GPT should use createServerSupabaseClient() in any new Server Action or API route that needs to know the current user, rather than trying to pass tokens manually.
Auth Callback Route: Supabase can send auth state change events (like password recovery or OAuth logins) to a listener. The project has an API route at /api/auth/callback that Supabase’s client library calls on certain events
github.com
. When supabase.auth.setSession() is used or when an OAuth flow returns to the app, this route is triggered with an event and session. The code in this route sets or removes the cookie on the server side accordingly
github.com
github.com
by constructing a server client with cookie access and calling supabase.auth.setSession(session)
github.com
. This ensures SSR cookies stay in sync with client actions (like sign out or token refresh). GPT should maintain this mechanism. If adjusting auth flows (e.g., adding OAuth providers), ensure the callback route handles new events appropriately. Do not remove this route – it is key to bridging Supabase Auth with Next SSR.
State Management (User State): Because we rely on Supabase for auth, the primary source of truth is the Supabase session. On the client, one could use a hook (like Supabase’s onAuthStateChange or a custom context) to track user. Currently, components fetch the user via supabase.auth.getUser() as needed (see SubscribeButton where it fetches current user on mount
github.com
). GPT might consider introducing a more centralized user context for convenience (e.g., using React Query or Zustand to store the user profile globally after login). If doing so, ensure it stays updated (listen to auth changes and update state) and does not conflict with SSR (e.g., use a Server Component to fetch user data and pass it down as props or use a client context provider).
Cookies & Next.js 13+: Next 13+ introduced an async cookies() and cookies() utility in server components. We use these in our server Supabase client and also in middleware. A recent Next.js update made the cookies interface asynchronous in certain contexts, which we accounted for by adjusting how we create the Supabase client (ensuring we capture cookies in middleware and server actions properly). GPT should be mindful of this: if Next.js changes how cookies or headers work in the future, adapt accordingly by following their latest examples for Supabase SSR. Always test that authentication flows still work (login -> redirect -> can access dashboard; logout -> redirect -> no dashboard access).
Session Expiration & Refresh: Supabase sessions include a refresh token that auto-renews. Our setup should handle token refresh transparently via the Supabase client (the @supabase/ssr client likely manages refreshing using the cookie store). If any issues arise (e.g., long sessions expiring), consider using Supabase’s onAuthStateChange to refresh session client-side, or ensure the /api/auth/callback handles TOKEN_REFRESHED events (the code already checks for that event and calls setSession)
github.com
. GPT should not implement its own refresh logic without consulting Supabase docs.
Other State (Zustand/Context): Non-auth state, such as UI preferences or form state, should be handled either locally or via context/zustand. For example, if a new feature requires global state (like a notification center open/closed), use a zustand store or React context rather than cluttering components or using heavy Redux. The key is to keep state management simple and localized. Do not put sensitive or critical data in zustand (since it’s client-side and ephemeral). For persistent data, rely on the database or URL state.
Middleware and Edge Considerations: Note that Next middleware runs on Vercel’s Edge (with some limitations). In our case, it’s relatively simple (auth check). Avoid doing anything heavy or unsupported in middleware (no direct database calls; instead, we do an auth check which under the hood uses a lightweight Supabase JWT check – that’s okay). If GPT adds new middleware logic, keep it fast and I/O-free (aside from maybe reading cookies or headers). For more complex auth gating, prefer server actions in layouts (for instance, using a server component to redirect if no user – but since we have middleware, that covers it globally).
Login Redirects: The login and signup pages take a redirect query param. Our middleware sets this when bouncing an unauthenticated user to sign-in
github.com
. The sign-in page/component should use that to redirect the user after successful login (currently, after login, we call router.push("/dashboard") after a delay
github.com
– ideally it should push to the redirect param if present). If this is not yet implemented, GPT could improve it. But ensure to URL-encode and validate the redirect param to prevent open-redirect vulnerabilities (only allow internal routes). Typically, a safe approach is: const dest = searchParams.redirect ?? "/dashboard"; router.push(dest).
Logout: Triggering logout (sign out) should call supabase.auth.signOut() on the client and possibly also clear the session server-side. We have handling for SIGNED_OUT event in the auth callback route which calls supabase.auth.signOut() server-side (clearing cookies)
github.com
. If adding a logout button, ensure it calls the client signOut and then perhaps redirect to home page. Supabase will handle removing its cookie via the callback event.
Profile & Settings: The user profile (like display name, avatar, bio) is stored in a users table in Supabase (likely with fields like full_name, avatar_url, etc.). The Edit Profile form uses Zod to validate input and a server action to update the profile
github.com
github.com
. Authentication ties in here because the server action must ensure the currently logged-in user is the one being updated. We do this via the Supabase server client’s user and then an update query. GPT should keep any user settings updates similarly tied to the auth context (don’t allow one user to update another’s data except through privileged roles).
In summary, authentication in Lnked is a cohesive system where Supabase provides the identities and session tokens, Next.js provides the routing and SSR integration, and our code ensures smooth redirects and accessible session data on both client and server. Any changes to auth or state logic must preserve this harmony. When introducing new authenticated features, always test the full flow: login (or sign up) -> perform the action -> see expected result -> logout -> ensure no access. Pay special attention to cookie behavior in Next.js SSR.
Stripe Integration (Subscriptions & Payments)
Stripe is used to manage subscriptions for paid newsletters. The integration is designed such that users can subscribe to content creators (individuals or collectives) with a single subscription tier (as of now), and collective owners can earn revenue via Stripe Connect. Key aspects of Stripe usage in Lnked:
Stripe Configuration: The Stripe secret API key is loaded from the environment (STRIPE_SECRET_KEY in .env.local)
github.com
. We instantiate a Stripe client in src/lib/stripe.ts as a singleton
github.com
. This client is only used on the server. The STRIPE_WEBHOOK_SECRET is also stored in env for verifying webhooks. For the subscription price, we use a single Price ID (retrieved from STRIPE_PRICE_ID env variable) for the subscription product
github.com
. This suggests a single-tier subscription model (e.g., one fixed price for all subscriptions) at the moment. GPT must use these env variables; do not hardcode API keys or Price IDs in code. If a different pricing scheme is required in the future (multiple tiers), it should be implemented by extending the database and logic, not by scattering new IDs in the code.
Creating a Checkout Session: When a logged-in user clicks “Subscribe” on a user’s or collective’s page, the app uses the /api/subscribe route:
The frontend (e.g., SubscribeButton component) does a POST to /api/subscribe with JSON including the priceId (or "default" indicating to use the env default price), the targetEntityType ("user" or "collective") and the targetEntityId (the ID of the user or collective being subscribed to)
github.com
. It also sends a redirectPath (the current page) so we know where to return after checkout
github.com
.
The route handler (src/app/api/subscribe/route.ts) checks the Supabase session for the logged-in user
github.com
github.com
(rejecting if not authenticated). It then reads the request body and ensures required fields are present
github.com
. It maps the "default" priceId to the actual STRIPE_PRICE_ID from env
github.com
. Next:
It looks up (via supabaseAdmin) if the user already has a Stripe Customer ID in our customers table
github.com
. If not, it creates a new Stripe customer with the user’s email (and name if available)
github.com
, then saves that to customers table
github.com
. This ensures each Supabase user maps to a Stripe customer.
It determines the success_url and cancel_url for Stripe checkout. We use the NEXT_PUBLIC_SITE_URL env as the base, and then redirect back to either the provided redirectPath or home page, appending ?stripe_session_id={CHECKOUT_SESSION_ID} on success for potential post-processing
github.com
.
If the target is a collective, the code fetches the collective’s stripe_account_id from the DB (collectives table)
github.com
. If the collective doesn’t have one or isn’t onboarded, it returns an error
github.com
(the user needs to onboard that collective to Stripe Connect first). If present, it prepares to use Stripe Connect: it sets transfer_data: { destination: stripe_account_id } for the checkout so that payment is routed to the collective’s account
github.com
github.com
.
Finally, it creates the Stripe Checkout Session via stripe.checkout.sessions.create
github.com
. It passes:
customer (the Stripe customer ID for the user subscribing),
mode: "subscription",
line_items with the price ID and quantity 1
github.com
,
subscription_data with metadata: we include userId (subscriber’s Supabase user ID), targetEntityType and targetEntityId
github.com
. (Also, if transfer_data was set for a collective, it’s included here to route payments
github.com
.)
success and cancel URLs as computed.
The route returns the checkoutSession.url back to the client
github.com
github.com
, or an error message if something went wrong. The client then router.push(session.url) to redirect the user to Stripe’s checkout page
github.com
.
GPT guidelines: If modifying the checkout creation, preserve all these steps. Always attach the relevant metadata (this is how we later identify which user/collective the subscription is for in webhooks). Continue to handle the case of missing Stripe customer (create and store it). Any new parameters or pricing should be configurable via env or database, not hardcoded. And never expose the Stripe session URL in a way other than redirecting (to avoid leaking it unnecessarily).
Stripe Webhook Handling: After the user completes payment on Stripe, Stripe will send events to our webhook endpoint (/api/stripe-webhook). We handle important events:
The route first verifies the signature using stripe.webhooks.constructEvent with the raw request body and STRIPE_WEBHOOK_SECRET
github.com
github.com
. If verification fails, we respond 400 (and Stripe will retry).
We filter events to those we care about (defined in relevantEvents: checkout session completed, customer subscription created/updated/deleted)
github.com
github.com
.
For checkout.session.completed:
We check if the session is for a subscription and has our expected metadata (userId, targetEntityType, targetEntityId)
github.com
github.com
. If so, we take the stripe_customer_id and upsert it into the customers table for that user (just in case it wasn’t already, or to update the ID)
github.com
github.com
. This maps the user to the Stripe Customer in our DB.
We log the event for debugging. (No further action is needed here because the actual subscription create event will handle the subscription record.)
For customer.subscription.created/updated/deleted:
We extract the subscription object, and from its metadata get subscriberUserId (the user who subscribed) and the target entity (type and ID)
github.com
github.com
. We ensure these are present; if not, we log an error because it’s critical to map the sub.
We get the price ID and other details from the Stripe Subscription object (like status, quantity, current period end, etc.)
github.com
github.com
.
We then upsert this data into our subscriptions table via supabaseAdmin (since subscriptions might be protected with RLS)
github.com
. The id of our subscriptions table is the Stripe subscription ID. We store the user_id, the target entity (collective or user they subscribed to), status (active, trialing, etc.), price, timestamps, and metadata. This way, our database knows who is subscribed to what and the state of that subscription.
If there’s an error upserting, we log it; otherwise, we log success
github.com
.
On deleted, the subscription status would likely be canceled or similar, and upsert will mark it accordingly (or we could handle deletion by removing or marking inactive, but currently upsert just updates status).
The webhook responds with JSON 200 after processing. This ensures Stripe won’t keep retrying.
GPT guidelines: If adding new payment flows (e.g., one-time purchases, new event types like invoice.payment_failed), make sure to extend the webhook handler. Always verify events and use supabaseAdmin to record changes in the database. Do not trust any event data without verification. Also, ensure idempotency: Stripe may retry events; our use of upsert helps because running it multiple times is okay. If you add logic with side-effects (like sending emails or notifications on payment, for example), ensure you handle deduplicating those if Stripe retries the webhook.
Stripe Connect (Collective Payouts): The system supports collectives having their own Stripe accounts:
The Stripe Onboarding route (/api/collectives/[id]/stripe-onboard) is called when a collective owner wants to connect a Stripe account
github.com
github.com
. It:
Confirms the requester is logged in and is the owner of that collective
github.com
github.com
.
If the collective doesn’t yet have a stripe_account_id, it creates a Stripe Express Account (Connect account) for that collective via stripe.accounts.create({ type: "express" })
github.com
, with the collectiveId in metadata. It saves this ID to the collective’s record in DB
github.com
.
Then it creates an Account Link (stripe.accountLinks.create) to generate a Stripe-hosted onboarding URL where the owner can finish setting up (providing bank info, etc.)
github.com
. It uses refresh_url and return_url back to our site (likely the collective’s settings page).
Returns this onboarding URL to the client. The client will redirect the owner to Stripe to complete onboarding.
Once a collective is connected (Stripe sends an email or redirects back when done), the collective’s stripe_account_id will be used in checkout sessions (as transfer_data.destination). This means when someone subscribes to that collective, Stripe will automatically split the payment – typically, it goes entirely to the connected account (minus Stripe fees and potentially our platform fee if configured).
GPT should preserve this connect integration. If adding any new monetization features for collectives, ensure they also account for connect (e.g., if a collective could have multiple prices or products, those need to belong to the collective’s Stripe account).
We currently do not have a platform fee configured; if in the future we add one, it would involve adding an application_fee_amount or percent when creating Checkout Sessions for collectives (with transfer_data). This would also require the platform Stripe account to be set as the Stripe Connect platform. GPT should not implement this without product direction, but be aware of how it would fit.
Billing UI & Cancellation: On the frontend, users need to know their subscription status and possibly cancel:
There is likely UI in the dashboard for a user to see their current subscriptions (and status like active or trialing) and to unsubscribe. The subscriptionActions.ts provides getSubscriptionStatus and unsubscribeFromEntity functions
github.com
github.com
:
getSubscriptionStatus(targetType, targetId) queries the subscriptions table for the current user and given target, and checks if there is an active subscription
github.com
github.com
. It returns an object indicating if subscribed, and details like status and period end date
github.com
.
unsubscribeFromEntity(dbId, stripeSubId) verifies the current user owns that subscription record and then uses the Stripe SDK to cancel the subscription (currently it sets cancel_at_period_end)
github.com
github.com
. After calling Stripe’s subscriptions.update or subscriptions.del (not fully shown in snippet), it should update the DB or let the webhook update it on the next event.
GPT should use these existing flows if extending subscription management. E.g., if you add a “Cancel now” vs “Cancel at period end” option, ensure to use the Stripe API appropriately (and perhaps update our DB immediately for UI purposes, while still relying on webhook for source of truth).
Always confirm user identity for such actions (as done by verifying user.id matches the subscription’s user_id in the DB
github.com
).
Pricing & Plans: Currently, STRIPE_PRICE_ID denotes a single subscription price. If new plans are introduced:
You’d likely add a table in DB for products/plans and possibly store allowed price IDs per collective or per content type.
You must ensure that the price used in Checkout Session corresponds to the correct collective’s product. A rule in our guidelines says “validate stripe_price_id maps to a price that belongs to the correct collective”
github.com
. Right now, our implementation assumes one global price or that the chosen price is appropriate. If multiple prices exist, GPT should enforce that, for example, a collective’s page only offers its own price (perhaps stored in the collective record or a separate plans table). Any new logic should prevent a user from, say, calling the subscribe API with a price ID that isn’t intended for that target (to avoid cross-collective confusion or abuse).
Keep such logic server-side for security.
Testing Stripe flows: When making changes, simulate the full flow:
Use Stripe test mode, ensure Checkout session creates correctly and redirects.
Trigger Stripe webhook events (Stripe CLI can forward events or use test mode events) to see that our handlers work.
Test edge cases: subscribing when already subscribed (should maybe prevent or handle gracefully), subscribing to one’s self (should be disallowed likely – currently the SubscribeButton prevents self-subscription by redirecting to sign-in if not logged, but maybe not checking if currentUser == target user; this could be a future improvement), and canceling subscriptions.
In essence, the Stripe integration is robust and encapsulated: GPT must not expose Stripe secrets, must use server routes for all Stripe operations, and follow Stripe’s official integration patterns. Any enhancement (multiple subscription tiers, different billing intervals, refunds, etc.) should be built on top of this foundation with close adherence to Stripe’s best practices and thorough testing.
Zod Schemas & Validation Usage
Zod is used throughout the codebase to ensure data is validated and typed consistently. GPT should continue leveraging Zod for any new forms, API inputs, or config validations. Here’s how Zod is applied in Lnked:
Form Validation: Every significant form has a Zod schema:
Example: The “Create Collective” form has a CollectiveSchema defining rules for name, slug, and description
github.com
github.com
. On form submission, the server action createCollective(inputData) uses CollectiveSchema.safeParse(inputData) to validate and collect errors
github.com
. If validation fails, it returns a structured error with fieldErrors for each field
github.com
. The client form can use these errors to display messages.
Example: The “Edit Profile” form defines ClientUserProfileSchema on the client for immediate feedback (requiring non-empty name, limiting bio length, etc.)
github.com
. It uses React Hook Form’s zodResolver to enforce these rules in real-time
github.com
. Meanwhile, on the server, there is likely a corresponding schema or at least similar checks in updateUserProfile action to ensure data integrity.
Pattern: For each form:
Define a Zod schema for the form fields. If client and server rules differ slightly, you can define a base schema and then extend it. (We do this in some cases: e.g., InviteMemberClientSchema vs InviteMemberServerSchema where the server requires a role and the client schema might provide a default
github.com
github.com
.)
Use @hookform/resolvers/zod to bind the schema to the form on the client, so users get instant validation messages.
On the server, use the schema to parse the incoming data again. This double validation ensures nothing sneaks through if someone bypasses the frontend.
Provide user-friendly error messages via the schema (Zod allows custom messages on each rule, as seen in the schema definitions
github.com
).
Return or throw errors in a consistent format. Many server actions return an object like { error: "Invalid input.", fieldErrors: { fieldName: ["Message"] } } so the client can display them. GPT should stick to this convention for new actions.
Schema for API payloads: Not just forms, but any JSON payload hitting an API route should be validated:
For instance, the subscribe route manually checks required fields and types for its JSON body
github.com
. We could use Zod to define a schema for SubscribeRequestBody (it’s defined via TypeScript interface in code
github.com
, but Zod could enforce it at runtime too). GPT could integrate Zod there for consistency, but whether using Zod or manual checks, the important part is to validate.
If GPT creates a new route, say /api/posts/create, define a Zod schema for the expected body (title, content, etc.), and use it in the handler to parse await req.json(). If it fails, return 400 with errors.
Runtime Type Safety: We use Zod not only for validation but also to derive TypeScript types. This ensures our types align exactly with our validation rules. GPT should do the same: after defining a schema, use export type X = z.infer<typeof XSchema>; to get the TypeScript type. This avoids inconsistencies between what we think a payload is and what it actually is.
Database Schema vs Zod: Our Supabase database has its own schema (see src/lib/database.types.ts which is generated from Supabase). Ensure Zod schemas align with database constraints:
For example, if the collectives.slug column is varchar(50) and must be unique and lowercase, our Zod schema enforces max length 50 and a regex for allowed characters
github.com
. This way, the validation error happens before even trying the DB insert, giving a nicer message.
If a DB enum exists (Supabase exports enums in Database["public"]["Enums"]), use z.enum or z.nativeEnum to validate that input. In memberSchemas.ts, we define COLLECTIVE_MEMBER_ROLES as a const array and then z.enum from it
github.com
github.com
, ensuring the role is one of the allowed strings. This matches the DB enum constraint.
Always check the length/format requirements from the DB (like passwords min length if any, emails format, etc.) and mirror them in Zod.
Error Handling with Zod: When a Zod validation fails, use error.flatten() or error.formErrors to extract messages. We do validationResult.error.flatten().fieldErrors to get a map of field -> [messages]
github.com
. GPT should output similar structured errors. Consistency here means the front-end can generically display errors without special-casing new forms.
Zod for Config: If GPT introduces any config files or complex environment structures, consider using Zod to validate them at startup. For instance, if we had a complex JSON config for feature flags, a Zod schema could validate its shape. Currently, env vars are primitive enough not to need it, but the principle is to catch errors early.
Locations of Schemas: Some schemas are defined alongside the feature (e.g., in the same file as a component if only used there), others in src/lib/schemas. If a schema is reused in multiple places (client and server), it’s best in lib/schemas to import from both sides. For one-off use on a single page, defining in that file is acceptable. GPT should place new schemas in a logical location and export them for use on both client and server if needed.
Example of end-to-end schema usage: Inviting a member to a collective:
Zod schemas: InviteMemberServerSchema and InviteMemberClientSchema in lib/schemas/memberSchemas.ts
github.com
github.com
.
The invite form on the client likely uses InviteMemberClientSchema for form validation (ensuring email and maybe optional role selection).
The server action inviteMemberToCollective(formData) uses InviteMemberServerSchema.safeParse(formData) to validate the input from the form again
github.com
.
If valid, it proceeds to check permissions and insert a record into collective_members table via supabaseAdmin
github.com
github.com
. If invalid, it returns success: false, error: "Invalid input." plus fieldErrors
github.com
.
This ensures that an invalid email or missing collectiveId is caught without hitting the database or causing a deeper error.
When not to use Zod: There may be cases where validation logic is more complex than what Zod easily handles (though Zod is quite powerful). If implementing something like a custom password strength meter or cross-field validation, you can still use Zod (with refinements or custom .superRefine for cross-field conditions). Try to use Zod for consistency. Only avoid it if truly necessary for performance (e.g., extremely large payloads) or if the validation logic depends on async checks (like checking the DB for uniqueness – those you handle in code, not Zod, as we do for slug uniqueness after validation).
Updating Schemas: If the underlying data model changes (say we add a new required field in a form), always update the Zod schema accordingly, on both client and server. All tests and form components should then be updated to match. GPT should search for references to the old fields to adjust everywhere.
In summary, Zod is our gatekeeper for data integrity on the front and back ends. GPT contributions should maintain that every new data input path has a Zod schema validating it. This will reduce bugs and security issues by ensuring we never trust unexpected input.
Changelog Requirements for GPT Contributions
To maintain transparency and traceability of code changes made by AI (GPT), we have a changelog system. Every time GPT modifies the codebase, it must append an entry to the JSON file changelog.json at the root of the repository. This file serves as a log of AI-driven changes, with unique IDs and descriptions. GPT must update this file for every file it alters, on every edit session, following this format:
json
Copy
Edit
{
"<UUID>": {
"<filepath>": "<brief summary of change>"
},
"...": {
"...": "..."
}
}
Each entry’s key is a newly generated UUID (v4 recommended). The value is an object where the key is the path of the file changed (relative to repository root) and the value is a short human-readable summary of what was changed in that file. For example, if GPT modifies src/components/Navbar.tsx to fix a typo in the logo text, it would add an entry like:
json
Copy
Edit
{
"f4c3a9b0-1234-4ce6-9f1a-56789example": {
"src/components/Navbar.tsx": "Fix typo in brand name text"
}
}
If multiple files are changed in one operation, add multiple entries, each with its own UUID. (Alternatively, entries can be grouped by commit if instructed, but the simplest rule is one file per entry for clarity.) The changelog JSON should remain valid JSON syntax. GPT should take care to insert commas, braces, and quotes properly. Usually, new entries go at the end of the file (but still inside the top-level object). The exact insertion point can be at the end of the object before the closing brace, with a trailing comma on the previous entry. Why this is important: This changelog lets human developers review what GPT has done in a succinct way and revert or adjust if needed. It also helps the next GPT sessions to see historical context of changes. No code change by GPT should be done without a corresponding changelog entry. GPT should generate a new UUID for each entry (do not reuse IDs). The summary should be specific but brief. For example, “Add new route for password reset” or “Refactor stripe webhook error handling”. If multiple changes are done in one file, one summary covering them is fine. Before finalizing any pull request or commit, ensure changelog.json is updated. Failing to update the changelog will be considered a violation of the contribution rules and CI or maintainers might reject the change. (Technical note: If the project maintainers set up automation, they might enforce this file change on CI. Regardless, GPT must diligently do this.)
Supporting Future Evolution & Refactoring
We encourage continuous improvement. GPT is allowed – even expected – to evolve the codebase over time to improve functionality, performance, maintainability, and user experience. This means the AI can propose and implement refactors or even large-scale changes, as long as they are well-justified and align with project goals. Some guidelines for future evolution:
Embrace Improvement: If a part of the codebase is outdated or suboptimal, GPT should not hesitate to suggest a better approach. For example, if Next.js releases a new feature that simplifies our code, it might be worth adopting. Or if a section of code has become a bottleneck, refactor it. We are open to significant changes (e.g., reorganizing components, switching a library for a better one) provided the benefits are clear and the change is executed carefully.
Backwards Compatibility & Data Migration: When making dramatic changes, consider the impact on existing data and users. For instance, if changing the structure of a Supabase table or altering an API response shape, handle the migration. This could mean writing a SQL migration script (in supabase/ directory) or adding code to handle both old and new data during a transition. GPT should highlight such needs and ideally include the migration steps as part of the change.
Documentation & Justification: Any non-trivial refactor or new pattern should be well-documented:
Explain the rationale in code comments or in commit messages (and possibly in the changelog summary). For example, “Refactor editor state management to use Lexical’s new APIs (Next.js 15 compatibility) – simplifies code and fixes memory leak.”
Update relevant docs – e.g., if GPT changes how auth is handled, this README guide should be updated too. (Maintainers might prompt GPT to update documentation; it’s good practice to do it proactively.)
If introducing a new library or major concept, add a section in this guide or a separate MD file explaining how to use it.
Consult Official Sources: As emphasized, major changes should be based on authoritative guidance. If refactoring Next.js usage, use the official Next migration guides or examples. If switching a library, ensure it’s a community-accepted improvement (for instance, replacing a custom form validation with Zod was good – we already do that; another example could be adopting a React context for something widely, but only do so if it’s indeed better).
Testing After Refactors: Run the full test suite and click-test critical user flows after any large refactor. Ensure parity of functionality. If something is intentionally changed (e.g., a different UX for a feature), make sure stakeholders have agreed.
Performance and UX Wins: Some evolutions are aimed at performance – e.g., adding caching, reducing bundle size, optimizing queries. GPT should feel free to implement these, again citing reasons. For example, “Use Next.js Incremental Static Regeneration for public newsletter pages for better performance” could be an idea – if doing so, document the reasoning and how to revalidate, etc.
UI/Design Upgrades: We also welcome improvements to the user interface as long as they are consistent with our clean design. If GPT determines a page layout could be better or more mobile-friendly and can justify the change, it can proceed. Just ensure it doesn’t contradict any branding guidelines or specific design decisions. (Always maintain accessibility and responsive design.)
Feature Additions: If adding a new feature (say a new notification bell or a search bar), ensure it integrates well and doesn’t break existing ones. It’s often wise to implement incrementally and behind a flag if risky. GPT can append notes in the code like // FEATURE: ... to mark new additions for review.
Removal of Deprecated Code: Over time, some code may no longer be needed. GPT can remove or clean up code that is confirmed unused or obsolete, but be careful to verify it’s truly not in use (search the codebase for references). We keep the code lean – no dead code or leftover stubs.
Coordination: For very large changes, it might be better for GPT to break them into smaller commits/PRs. Each should be self-contained (passing tests) so it’s easier to review. The changelog will record each anyway.
Remember, the goal is to improve the project continuously. GPT’s value is not just in rote code generation, but in recognizing opportunities to enhance the code. As long as the changes are grounded in official best practices and thoroughly tested, they will be appreciated. Don’t be afraid of change – but do change with purpose and caution.
Additional Notes & Constraints
Finally, some miscellaneous guidelines and reminders specific to this codebase:
API Routes & RESTful Design: The API route handlers under app/api should generally follow RESTful or RPC-like patterns consistent with Next’s conventions. Many are singular (e.g., /api/like to like/unlike a post might use the method to determine action, or /api/posts/[id]/bookmark). When creating new API routes, place them logically (grouped under resource if applicable) and use HTTP methods semantics (GET for fetch, POST for create, PUT/PATCH for update, DELETE for removal). Use NextResponse to return JSON. Ensure new routes are added to the matcher in middleware if they require auth (or do an explicit auth check within the handler).
Custom Utilities: Leverage existing utilities:
Use lib/utils.ts (which likely contains common helpers like cn (classNames merge) and perhaps date formatters or others) instead of writing duplicates.
Use lib/hooks for custom hooks (for example, useSupabaseRealtime hook is provided
github.com
, which might manage live updates via Supabase’s real-time channels).
If a new utility is needed and could be widely used, add it to lib/utils.ts or a new module in lib/. Write JSDoc or comments to explain its purpose.
Environment Variables & Config: The .env.local.example (and README env section
github.com
) lists all necessary env vars. GPT should not introduce new env vars without reason. If absolutely needed, document them and update the example file. Use the NEXT_PUBLIC* prefix for any var that needs to be exposed to client-side (and only those). For instance, we use NEXT_PUBLIC_SUPABASE_URL for Supabase because the browser needs it
github.com
, but SUPABASE_SERVICE_ROLE_KEY is secret (server only)
github.com
. Always follow this pattern: sensitive keys are server-only. Also, utilize NEXT_PUBLIC_SITE_URL for any URLs needed in client code or emails, rather than hardcoding a domain.
Maintaining Branding & Metadata: Certain texts and elements represent our branding:
The app name “Lnked” and its presentation (capitalization and the dot in the logo) should remain consistent
github.com
. If GPT is, say, redesigning the navbar, ensure the brand name remains as intended. Do not casually rename the app or change its primary color without instruction.
The <head> metadata (set via Next’s export const metadata in layouts) defines our site title and description
github.com
. If any changes are needed there (SEO improvements, adding meta tags), do so thoughtfully and keep the title format.
Content like emails or notifications (if implemented via Supabase functions or future features) should use the project’s voice and name appropriately.
Design Tokens & Hardcoded Values: Do not circumvent the design token system. For example, if you need a new color variant, add a CSS variable and use it via Tailwind (text-[colorVar]). Do not put literal hex codes in components. The design is meant to be easily themable; hardcoding values undermines that.
Same for spacing: use Tailwind spacing classes (or the predefined theme spacing scale) instead of inline styles with arbitrary numbers.
If using any magic numbers or constants, add a comment explaining them or derive them from a single source of truth. For instance, if 280px is used as a breakpoint somewhere, consider using Tailwind’s sm/md breakpoints or define it in one place.
Role & Permission Logic: The app has roles (collective member roles, possibly in the future admin roles). GPT should ensure any feature respects those:
Only collective owners can invite or remove members
github.com
.
Only authors or editors can edit a post (this might be enforced by RLS on the posts table, but if implementing UI conditions, check the current user’s role).
If introducing admin-only features, protect them (maybe via checking a claim in the JWT or a flag in the users table).
Row Level Security (RLS): The Supabase policies (likely defined in SQL files under supabase/) enforce data permissions. GPT should be aware of them (e.g., “users can only see their own subscriptions in subscriptions table”, or “only collective members can select posts of that collective if published”). Without diving deep, just remember to use supabase appropriately – for example, to retrieve posts for a collective, we likely ensure the collective is public or the user is a member. Do not try to circumvent these policies in client code; instead, adjust queries or use service key if absolutely needed (and secure).
Email/Notifications: Currently, authentication uses Supabase’s email (if using magic links or confirmations). If GPT adds any email-sending features (like newsletters or alerts), consider using Supabase Functions or an external service, and do not embed SMTP secrets in the repo. This might be out of scope for now, but keep security in mind.
Logging and Debugging: The code contains console.log and console.error for debugging (especially in auth and webhook flows)
github.com
github.com
. This is fine for development and debugging issues in staging. However, in production these should be either removed or turned into structured logs (if we had a logging service). GPT can add logs when troubleshooting, but avoid leaving extremely verbose logging in long term. And never log private data as mentioned. If adding logs, keep them to error cases or critical points, and include identifiers not raw data (e.g., log user IDs, not full objects).
Front-end Performance: The Next.js setup means a lot of rendering is on the server, which is good for initial load. But for client-side interactions, ensure performance:
Use React’s state updates wisely (batch them, avoid heavy calculations in render).
For lists, use keys and avoid unnecessary re-renders.
If a component might be large or rarely used, consider code-splitting (dynamic import).
Monitor bundle size if adding dependencies – Next will tree-shake and split, but don’t import huge libraries in a client component that is used globally (like the navbar).
Accessibility: Continue to follow accessibility best practices:
All interactive elements need focus states and keyboard support.
Provide alt text for images (the editor’s ImageNode likely has an alt property; any new image usage should too).
Use ARIA roles when appropriate (e.g., role="dialog" for modals, etc., if not already handled by Radix).
Test features with screen reader or at least ensure semantic markup. E.g., headings should descend in order (<h1> then <h2>; avoid skipping levels purely for styling).
Preserve Hardcoded IDs or Keys if any: If you encounter any place where an ID or key is intentionally hardcoded (sometimes integration keys or test IDs), think twice before altering it. For instance, if the code expects a specific Stripe Price ID from env, don't replace it with a different mechanism unless there's a reason. Or if a certain collective slug like "welcome" has special meaning, be cautious. Always search the codebase for a value before deciding to change it, to see if it’s referenced in multiple places or documented as special.
Environment-specific Logic: The code might have some checks like if (process.env.NODE_ENV !== 'production') { ... } for dev-only behaviors (like console logs or test endpoints). Be mindful when modifying such sections – ensure the behavior remains appropriate for dev vs prod.
Use Feature Flags if needed: If GPT introduces a big feature that is not immediately meant for all users, consider implementing a simple feature flag (could be an env var or a constant) to toggle it. This allows merging the code without activating it until ready.
