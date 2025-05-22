# Lnked Codebase Deep Analysis

## File Mapping

The Lnked repository is structured with a clear separation of source code, configuration, assets, and tests. Below is a breakdown of every file and directory grouped by their purpose, along with an explanation of each:

### Root & Configuration Files:

- **README.md**: Project overview, feature list, tech stack, and conventions
- **.env.example**: Template for environment variables (contains keys for Supabase, Stripe, Resend, etc., used to configure external services in development)
- **package.json**: Node package manifest listing all dependencies (Next.js, Tailwind, Lexical, Supabase, Radix UI, etc.) and scripts for building, testing, linting, etc.
- **tsconfig.json**: TypeScript configuration, including path aliases (e.g. @/ mapped to the src directory) and compiler options
- **next.config.ts**: Next.js configuration file with custom redirects for collective routing (excludes profile and users routes from collective redirects) and security headers
- **next-env.d.ts**: TypeScript definitions for Next.js (auto-generated)
- **tailwind.config.ts**: Tailwind CSS configuration (defines design tokens, color palette, dark mode, etc.)
- **eslint.config.mjs**: ESLint configuration for code linting (extends Next.js defaults)
- **prettier configuration**: (Not a standalone file; Prettier runs with default settings via package.json script)
- **jest.config.js**: Jest testing configuration (uses Next.js preset; ignores e2e tests)
- **jest.setup.ts**: Jest setup file (executed after environment setup, imports @testing-library/jest-dom for extended DOM matchers)
- **playwright.config.ts**: Playwright end-to-end testing config (defines test directory, browser settings for e2e tests)
- **.github/workflows/**: GitHub Actions workflow for Continuous Integration (runs linting, type-checking, tests on pushes)
- **.gitignore**: Git ignore file (excludes node_modules, build output, environment files, etc.)
- **supabase/**: Directory with Supabase configuration and migrations

### Source Code – Application (src/ directory):

The application is built with Next.js App Router structure, using TypeScript and organized by feature. The src/app folder contains page components and API routes, while src/components holds reusable UI and app-specific components following an atomic design approach. Supporting code resides in src/lib and src/types.

#### Core Layout:

- **src/app/layout.tsx**: The root layout for the Next.js App Router. It wraps all pages with global providers and the navigation header. It includes the theme provider, a smooth-scroll component, a top progress bar, and fetches the current user (via Supabase) on the server to pass user info to the global Navbar component.

#### Public Pages (src/app/(public)/...):

These pages are accessible without authentication:

- **src/app/(public)/page.tsx**: The landing page (home) presenting a marketing overview of Lnked for new visitors
- **src/app/(public)/sign-in/page.tsx** and **sign-up/page.tsx**: Pages for user authentication. They render client-side components for the sign-in/sign-up form logic using the <AuthForm> component
- **src/app/(public)/profile/[username]/page.tsx**: Dynamic route for user profiles. Serves public profile pages accessible via `/profile/username` URLs. Features smart lookup that tries username first, then falls back to user ID for backward compatibility. Shows user's public posts, follower/subscriber counts, and profile information.
- **src/app/(public)/profile/[username]/followers/page.tsx**: Shows followers list for a user profile
- **src/app/(public)/collectives/[slug]/page.tsx**: Dynamic route to view a Collective's public page. Lists collective posts and details, with a sub-page for followers
- **src/app/(public)/discover/page.tsx**: The Discover page for finding new collectives. Fetches recommended collectives and displays them using CollectiveCard components with pagination via LoadMoreButton
- **src/app/(public)/search/page.tsx**: Search functionality across posts, users, and collectives
- **src/app/(public)/posts/[slug]/page.tsx**: Individual post viewing page with comments, reactions, and social features
- **src/app/(public)/users/[userId]/followers/page.tsx**: Alternative followers page using user ID

#### Authenticated App Pages:

These require login (enforced via Next.js middleware):

- **src/middleware.ts**: Global request middleware that protects routes. It checks authentication for protected paths (like /dashboard, post creation/editing) and redirects to /sign-in if not authenticated. Conversely, redirects logged-in users away from sign-in/up pages to the dashboard.
- **src/app/dashboard/layout.tsx**: Layout for the user dashboard section. Checks auth and fetches the list of collectives the user is a member of or owns, passing data to the <DashboardShell> component
- **src/app/dashboard/page.tsx**: The Dashboard Home page showing personalized overview, recent posts, stats, and quick actions
- **src/app/dashboard/posts/page.tsx**: Lists the user's posts (drafts and published) with edit/create options
- **src/app/dashboard/collectives/page.tsx**: Lists collectives the user owns or participates in
- **src/app/dashboard/collectives/new/page.tsx**: Page for creating new collectives
- **src/app/dashboard/collectives/[collectiveId]/**: Dynamic dashboard pages for managing specific collectives including settings, members, subscribers, and posts
- **src/app/dashboard/profile/edit/page.tsx**: Page for editing user profile with prefilled form values
- **src/app/dashboard/settings/page.tsx**: Account settings page including username management, profile updates, and account deletion options

#### Editor Pages (src/app/(editor)/...):

Editing and creating newsletter posts in a focused editor UI:

- **src/app/(editor)/layout.tsx**: Simplified layout for editor pages without standard navigation
- **src/app/(editor)/posts/new/page.tsx**: New post creation with rich text editor
- **src/app/(editor)/posts/[slug]/edit/page.tsx**: Edit existing posts by slug

#### API Routes (src/app/api/...):

Backend endpoints for webhooks and external integrations:

- **src/app/api/stripe-webhook/route.ts**: Stripe webhook handler for payment events
- **src/app/api/collectives/[collectiveId]/stripe-onboard/route.ts**: Stripe Connect onboarding
- **src/app/api/collectives/[collectiveId]/plans/route.ts**: Subscription plan management
- **src/app/api/recommendations/route.ts**: Collective recommendations API
- **src/app/api/posts/[slug]/**: Post-related APIs (reactions, comments, bookmarks, views)
- **src/app/api/comments/[commentId]/reactions/route.ts**: Comment reaction handling

#### Server Actions (src/app/actions/):

Next.js Server Actions for form handling and mutations:

- **src/app/actions/userActions.ts**: User profile management including `updateUserProfile` (with username validation and uniqueness checking) and `deleteUserAccount`
- **src/app/actions/postActions.ts**: Post creation and editing with content validation
- **src/app/actions/likeActions.ts**: Post and comment liking functionality
- **src/app/actions/**: Other actions for collectives, subscriptions, etc.

### Reusable Components (src/components/):

Following Atomic Design principles:

#### UI Components (src/components/ui/):

Low-level, reusable presentational components built on Radix UI primitives:

- **button.tsx**: Generic button component with variants
- **input.tsx**, **label.tsx**: Form elements with consistent styling
- **card.tsx**, **alert.tsx**: Container and notification components
- **badge.tsx**: Small UI elements for tags/pills
- **select.tsx**: Custom select dropdown
- **dialog.tsx**, **sheet.tsx**: Modal and slide-out panel components
- **mode-toggle.tsx**: Theme toggle for light/dark mode

#### App Components (src/components/app/):

Feature-specific components organized by domain:

- **auth/**: Authentication forms and components
- **dashboard/**: Dashboard-specific UI including DashboardShell, navigation, and user menus
- **posts/**: Post-related components including PostCard with optimistic like updates
- **collectives/**: Collective management and display components
- **newsletters/**: Newsletter subscription components
- **nav/**: Global navigation including updated Navbar with profile links using `/profile/username` format
- **profile/**: Profile display and management components
- **settings/**: Settings forms including EditUserSettingsForm with username field

#### Editor Components (src/components/editor/):

Rich text editor built on Lexical framework:

- **PostEditor.tsx**: Main editor component
- **Toolbar.tsx**: Formatting toolbar with improved error handling for image uploads
- **nodes/**: Custom Lexical nodes for rich content (images, embeds, polls, etc.)
- **plugins/**: Editor plugins for enhanced functionality

### Utility Libraries (src/lib/):

- **src/lib/supabase/**: Supabase client configurations for server, browser, and admin access
- **src/lib/hooks/**: Custom React hooks including real-time subscriptions
- **src/lib/data/**: Data fetching and business logic modules
- **src/lib/schemas/**: Zod validation schemas for forms and data
- **src/lib/database.types.ts**: TypeScript types for database schema

### Configuration Updates:

#### Next.js Redirects (next.config.ts):

The redirect configuration has been updated to properly handle profile routes:

```typescript
// Excludes profile and users from collective redirects
'/:slug((?!dashboard|sign-in|sign-up|discover|invite|posts|settings|search|api|collectives|profile|users|_next)(?!$)[a-zA-Z0-9][a-zA-Z0-9-_]*)';
```

This prevents profile URLs from being incorrectly redirected to collective pages.

#### Username Functionality:

- **Database Schema**: Users table includes a nullable `username` field
- **Profile URLs**: Support both `/profile/username` and `/profile/user-id` patterns
- **Username Validation**: Enforced uniqueness, 3-30 characters, alphanumeric with underscores/hyphens
- **Backward Compatibility**: Existing user ID-based URLs continue to work
- **Navigation**: All profile links updated to use username when available, falling back to user ID

## Architecture Mapping

The Lnked application follows a monolithic web application architecture centered on Next.js App Router with heavy integration of external services (Supabase for backend, Stripe for payments).

### Overall Architecture Pattern:

- **MVC-like separation**: Pages/Layouts as Controller/View, Components as View layer, Supabase as Model layer
- **Server-first approach**: Leverages SSR for SEO and performance
- **Serverless functions**: Uses Next.js Server Actions and API routes
- **Real-time capabilities**: Supabase real-time subscriptions for live updates

### Key Architectural Decisions:

1. **Username Implementation**: Smart lookup strategy (username → user ID fallback)
2. **Profile Routing**: Clean `/profile/username` URLs with redirect protection
3. **Authentication Flow**: Middleware-protected routes with session validation
4. **Error Handling**: Improved error logging with proper Supabase error extraction
5. **Type Safety**: Comprehensive TypeScript coverage with Next.js 15 compatibility

### Data Flow:

1. **Authentication**: Middleware → Supabase session validation → Route protection
2. **Profile Access**: URL params → Username lookup → User ID fallback → Profile rendering
3. **Form Submissions**: Client forms → Server Actions → Supabase updates → UI revalidation
4. **Real-time Updates**: Supabase subscriptions → React state updates → UI updates

## Recent Updates and Fixes:

### Next.js 15 Compatibility:

- Updated all page components to await `params` and `searchParams` (23 files total)
- Fixed parameter handling for dynamic routes
- Ensured build compatibility with latest Next.js version

### Profile System Enhancements:

- Added username field to user profiles with validation
- Implemented username uniqueness checking
- Updated all navigation to use clean profile URLs
- Fixed redirect conflicts in next.config.ts

### Error Handling Improvements:

- Fixed empty object error logging by properly extracting Supabase error properties
- Improved user feedback for image upload failures
- Added proper error messages throughout the application

### Database Schema Fixes:

- Removed references to non-existent columns (`pinned_at`, deprecated `username` references)
- Updated queries to work with actual database structure
- Fixed type definitions and component interfaces

The codebase is now fully functional with Next.js 15, features comprehensive username support, and maintains backward compatibility while providing a solid foundation for future development.
