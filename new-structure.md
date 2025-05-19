src/
├─ app/
│ ├─ (auth)/ # Route group for public auth pages (no main layout):contentReference[oaicite:13]{index=13}
│ │ ├─ sign-in/
│ │ │ └─ page.tsx # Sign-in page (public)
│ │ ├─ sign-up/
│ │ │ └─ page.tsx # Sign-up page (public)
│ │ └─ layout.tsx # Minimal layout for auth pages (no navbar, etc.)
│ │
│ ├─ page.tsx # Home page (marketing landing or feed) – uses root layout
│ ├─ layout.tsx # Root layout (includes Navbar, Footer, ThemeProvider, etc.)
│ ├─ globals.css # Global styles (design tokens, Tailwind base utilities)
│ │
│ ├─ dashboard/ # Protected dashboard area for logged-in users:contentReference[oaicite:14]{index=14}
│ │ ├─ page.tsx # Dashboard index (e.g. overview with stats, recent posts)
│ │ ├─ layout.tsx # Dashboard layout (e.g. sidebar shell, auth gating)
│ │ ├─ \_components/ # Dashboard-specific UI components (not routes)
│ │ │ ├─ DashboardShell.tsx # Layout shell combining sidebar, etc.
│ │ │ ├─ DashboardSidebar.tsx # Sidebar menu for dashboard
│ │ │ ├─ StatCard.tsx # Example: card component for stats (dashboard use)
│ │ │ └─ ... (other dashboard-only components, e.g. RecentPostRow, etc.)
│ │ ├─ profile/
│ │ │ └─ page.tsx # User profile management page (/dashboard/profile)
│ │ ├─ posts/
│ │ │ ├─ new/
│ │ │ │ └─ page.tsx # Create a new post (/dashboard/posts/new)
│ │ │ ├─ [postId]/
│ │ │ │ └─ page.tsx # (Optional) Edit a specific post (/dashboard/posts/123) – if editing in its own page
│ │ │ └─ \_components/ # Post-related components for dashboard (editor, form, etc.)
│ │ │ └─ PostEditor.tsx # e.g. rich text editor or form for writing posts
│ │ ├─ collectives/
│ │ │ ├─ page.tsx # List/manage user’s collectives (/dashboard/collectives)
│ │ │ ├─ new/
│ │ │ │ └─ page.tsx # Create a new collective (/dashboard/collectives/new)
│ │ │ ├─ [id]/
│ │ │ │ ├─ page.tsx # Collective management dashboard (/dashboard/collectives/[id])
│ │ │ │ ├─ members/page.tsx # Manage members of a collective
│ │ │ │ ├─ settings/page.tsx # Collective settings page
│ │ │ │ └─ posts/
│ │ │ │ ├─ page.tsx # List posts in this collective (perhaps /dashboard/collectives/[id]/posts)
│ │ │ │ └─ new/page.tsx # New post in this collective
│ │ │ └─ \_components/ # Collective-related components for dashboard (cards, forms)
│ │ │ └─ CollectiveCard.tsx # e.g. card listing a collective (for dashboard view)
│ │ └─ **(other sub-routes as needed)** (e.g. `/dashboard/settings` if personal settings are kept under dashboard)
│ │
│ ├─ discover/
│ │ ├─ page.tsx # Discover page (public explore collectives/posts)
│ │ └─ \_components/
│ │ └─ LoadMoreButton.tsx # Button or UI piece specific to discover page
│ │
│ ├─ newsletters/ # Public-facing newsletter feeds (users & collectives):contentReference[oaicite:15]{index=15}
│ │ ├─ [slug]/ # Dynamic route for user or collective slug
│ │ │ ├─ page.tsx # Public newsletter page for the given user/collective (list of posts)
│ │ │ └─ [postId]/
│ │ │ └─ page.tsx # Individual post page under that newsletter
│ │ ├─ layout.tsx # (Optional) layout for newsletter pages (could wrap both list & post view with common styles or subscribe bar)
│ │ └─ \_components/
│ │ ├─ PostCard.tsx # UI for listing a post excerpt on a newsletter page
│ │ ├─ SubscribeButton.tsx # Follow/subscribe UI specific to newsletter pages
│ │ └─ ... (other newsletter-only components)
│ │
│ ├─ posts/ # (Optional: direct post route if kept – could redirect to newsletters)
│ │ ├─ [postId]/
│ │ │ └─ page.tsx # Public individual post page (if /posts/:id is used in addition to slug route)
│ │ └─ \_components/
│ │ └─ PostViewTracker.tsx # Example: component for tracking views on a post (only used on post pages)
│ │ └─ ... (any other post-specific components)
│ │
│ ├─ settings/
│ │ ├─ page.tsx # Account settings page (protected – user profile & preferences)
│ │ └─ \_components/
│ │ └─ SettingsForm.tsx # Form or components for settings page
│ │
│ ├─ analytics/
│ │ ├─ page.tsx # Analytics dashboard (protected – e.g. detailed stats page)
│ │ └─ \_components/
│ │ └─ AnalyticsChart.tsx # Example: chart components for analytics page
│ │
│ └─ api/ # API route handlers (server-only routes):contentReference[oaicite:16]{index=16}
│ ├─ subscribe/route.ts # (Example: endpoint to create Stripe checkout session)
│ ├─ stripe-webhook/route.ts# (Stripe webhook handler)
│ ├─ posts/[id]/route.ts # (Example: CRUD endpoint for posts by ID)
│ └─ ... (other API routes grouped by feature)
├─ components/ # **Shared/UI components** (global, reusable across routes)
│ ├─ ui/ # Atomic design system components (buttons, cards, alerts, etc.)
│ ├─ app/ # (After refactor, most domain-specific comps move into app/\_components.
│ │ This folder can be trimmed or removed if empty/redundant.)
│ ├─ landing/ # Marketing/landing page sections (if any, used on home page)
│ └─ Navbar.tsx, Footer.tsx, PostLikeButton.tsx, etc. # Shared components used in multiple areas
├─ lib/ # **Shared utilities & modules** (non-component logic)
│ ├─ supabase/ # e.g. Supabase client config (server and client helpers)
│ ├─ stripe/ # e.g. Stripe integration helpers
│ ├─ data/ # data fetching logic, ORMs, and hooks (e.g. `recommendations` fetcher)
│ ├─ utils.ts # general utilities (formatting, etc.)
│ └─ ... (other shared libs like schema definitions, context, hooks)
└─ ... (other project folders like public/, supabase/ configs, tests/, etc. remain as before)
