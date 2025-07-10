# Collective Management System Overhaul: Progress Report

This document details the work completed so far on the collective management system overhaul, as per the engineering plan in `collective_plan.md`.

---

## Phase 1: Core Collective & Membership Foundation (Backend) - COMPLETE

The backend foundation is fully implemented and secured. All database schema changes, helper functions, and security policies are in place.

### 1. Database Schema & Type Synchronization

The database schema has been verified and enhanced to support all planned features.

- **`post_collectives` Table (Moderation):**

  - **File Affected:** Supabase Schema (`public.post_collectives` table)
  - **Details:** The `status` column on this table was successfully migrated from a simple `TEXT` type to a robust `post_publication_status` ENUM (`'published'`, `'pending_approval'`, `'rejected'`). This was a complex, multi-step migration that involved temporarily dropping dependent RLS policies, creating the new ENUM type, rebuilding the column to cast existing data, and then re-applying the RLS policies. This ensures data integrity for the content moderation workflow.

- **`collective_member_role` ENUM (Role Correction):**

  - **File Affected:** Supabase Schema (`public.collective_member_role` type)
  - **Details:** A critical discrepancy was identified and resolved where the database ENUM for member roles (`contributor`, `viewer`, etc.) did not match the application's requirements (`admin`, `editor`, `author`). A series of migrations were performed to drop all dependent RLS policies, rename the old ENUM, create the new correct ENUM, update all existing records, and finally re-create the RLS policies. The database now correctly enforces the role structure required by the application logic.

- **TypeScript Type Generation:**
  - **File Updated:** `src/lib/database.types.ts`
  - **Details:** After every database schema modification, the Supabase CLI command (`npx supabase gen types typescript...`) was used to regenerate this file. The application's TypeScript code is now perfectly synchronized with the live database schema, including the corrected ENUMs for roles and post publication status. This provides end-to-end type safety.

### 2. RLS Policies & SQL Helper Functions

The database has been secured with Row-Level Security policies.

- **SQL Helper Functions Created:**

  - **File Affected:** Supabase Schema (New SQL Functions)
  - **Details:** Two `SECURITY DEFINER` helper functions were created via a database migration to simplify and secure RLS policies:
    1.  `get_user_role_in_collective(p_collective_id uuid, p_user_id uuid)`: Returns the role of a given user in a specific collective.
    2.  `is_owner_of_collective(p_collective_id uuid, p_user_id uuid)`: Returns `true` if the user is the owner of the collective.

- **RLS Policies Applied:**
  - **Files Affected:** Supabase Schema (`public.collectives` & `public.collective_members` tables)
  - **Details:** A migration was applied to enable and create a full suite of RLS policies on the `collectives` and `collective_members` tables. These policies use the helper functions above to enforce the following rules at the database level:
    - Public collectives are readable by anyone.
    - Private collective details are only readable by members.
    - Only admins or owners can update a collective's settings.
    - Only the owner can delete a collective.
    - Members of a collective can view the other members.
    - Only the owner can add, remove, or change the roles of members.

---

## Phase 2: Frontend for Collective Management - IN PROGRESS

The foundational UI and data-fetching patterns for the collective settings dashboard have been implemented.

### 1. Settings Page Architecture

The file structure and primary layout for the entire settings section have been built.

- **New Route Structure Created:**

  - **Files Created:**
    - `src/app/(app)/settings/collectives/[slug]/layout.tsx`
    - `src/app/(app)/settings/collectives/[slug]/page.tsx` (General)
    - `src/app/(app)/settings/collectives/[slug]/members/page.tsx`
    - `src/app/(app)/settings/collectives/[slug]/monetization/page.tsx`
    - `src/app/(app)/settings/collectives/[slug]/danger/page.tsx`
  - **Details:** The complete directory structure has been scaffolded with placeholder pages, establishing the routes for each settings section.

- **Shared Settings Layout:**
  - **File Implemented:** `src/app/(app)/settings/collectives/[slug]/layout.tsx`
  - **Details:** This is a fully functional React Server Component. It fetches the collective and the current user's role, and it **enforces permissions** by redirecting any user who is not an 'owner' or 'admin'. It renders a two-column layout containing a placeholder navigation sidebar and the main content area for the child pages.

### 2. Member Management UI

The primary interface for managing members is now functional.

- **Members Page (Server Component):**

  - **File Implemented:** `src/app/(app)/settings/collectives/[slug]/members/page.tsx`
  - **Details:** This Server Component uses React `<Suspense>` to stream the UI. It contains a data-fetching component (`MembersData`) that fetches the list of current members and pending invites in parallel. This data is then passed directly as props to the client component.

- **Members Dashboard (Client Component):**
  - **File Implemented:** `src/app/(app)/settings/collectives/[slug]/members/ManageMembersClientUI.tsx`
  - **Details:** This is a fully interactive `'use client'` component built with Shadcn UI components.
    - It receives initial members and invites as props and manages them in its local state.
    - It features an "Invite Member" `<Button>` which opens a `<Dialog>` with a form to invite new users.
    - The invite form calls the `inviteMemberToCollective` Server Action and uses the `sonner` library to display success or error toast notifications.
    - It renders two `<Table>` components: one for current members and one for pending invites.
    - For owners, the members table includes a `<DropdownMenu>` with fully functional actions for "Change Role" and "Remove Member", complete with confirmation dialogs and optimistic UI updates.

* **General Settings Form:**

  - **Files Implemented:**
    - `src/app/(app)/settings/collectives/[slug]/page.tsx` (Server Component, data loader)
    - `src/app/(app)/settings/collectives/[slug]/EditCollectiveSettingsForm.tsx` (Client Component, form logic)
  - **Details:** A fully functional and type-safe form for editing a collective's name, slug, description, and public visibility. It uses `react-hook-form` for validation and calls the `updateCollectiveSettings` server action to persist changes, providing user feedback via toast notifications.

* **Branding Settings Form:**

  - **Files Implemented:**
    - `src/app/(app)/settings/collectives/[slug]/branding/page.tsx` (Server Component, data loader)
    - `src/app/(app)/settings/collectives/[slug]/branding/BrandingSettingsForm.tsx` (Client Component, form logic)
    - `src/app/actions/collectiveActions.ts` (new `updateCollectiveBranding` action)
  - **Details:** A functional UI for updating a collective's branding. Users can upload a new logo and cover image. The form calls a dedicated server action that uploads the files to Supabase Storage and updates the collective's `logo_url` and `cover_image_url` in the database.

* **Danger Zone UI:**

  - **Files Implemented:**
    - `src/app/(app)/settings/collectives/[slug]/danger/page.tsx` (Server Component, data loader)
    - `src/app/(app)/settings/collectives/[slug]/danger/DangerZoneClient.tsx` (Client Component, form logic)
  - **Details:** A functional UI for the two most sensitive actions. Both actions are protected by a confirmation dialog requiring the user to type the collective's name.
    - **Transfer Ownership:** Allows the owner to select a new owner from a list of members and transfer the collective.
    - **Delete Collective:** Allows the owner to permanently delete the collective.

* **Content Moderation UI:**
  - **Files Implemented:**
    - `src/app/(app)/settings/collectives/[slug]/moderation/page.tsx` (Server Component, data loader)
    - `src/app/(app)/settings/collectives/[slug]/moderation/ModerationDashboardClient.tsx` (Client Component, UI and actions)
    - `src/app/actions/collectiveActions.ts` (new `moderatePost` action)
  - **Details:** A complete moderation dashboard where admins/owners can view posts pending approval. They can approve or reject posts, which updates the post's status in the database and provides optimistic UI feedback.

### 3. UI Dependencies

- **Toast/Notification Component:**
  - **Action:** Installed the `sonner` component library.
  - **File Created:** `src/components/ui/sonner.tsx`
  - **File Updated:** `src/app/layout.tsx` - The global `<Toaster />` component was added to the root layout, making notifications available application-wide.
- **Analytics:**
  - **Action:** Installed the `@vercel/analytics` package.
  - **File Updated:** `src/app/layout.tsx` - The `<Analytics />` component was added to the root layout.

## Phase 4: Monetization - Continued Enhancements (Date: 2025-07-10)

### Stripe Status & Onboarding Flow Improvements

- **File Updated:** `src/app/actions/collectiveActions.ts`
  - Enhanced `getCollectiveStripeStatus` to read `stripe_charges_enabled` and `stripe_payouts_enabled` flags.
  - Now returns `status: 'active' | 'pending' | 'none'` where `pending` indicates account exists but charges/payouts not enabled.

### Monetization Settings Page – Price Tier Listing

- **Files Updated:**
  - `src/app/(app)/settings/collectives/[slug]/monetization/page.tsx`
    - Fetches all Stripe **products** linked to the collective, then queries **prices** for those products.
    - Passes `initialPrices` prop to client component for immediate rendering.
  - `src/app/(app)/settings/collectives/[slug]/monetization/MonetizationSettingsClient.tsx`
    - Displays pending status banner if Stripe account is still under review.
    - Renders list of existing price tiers with amount and interval.

### Type Synchronization

No schema changes were required. All updates are purely application-layer improvements; therefore no type regeneration was necessary.

## Phase 4: Monetization - Revenue Sharing (Date: 2025-07-10)

### Revenue Sharing UI & Logic

- **Files Updated:**
  - `src/app/(app)/settings/collectives/[slug]/monetization/page.tsx`:
    - Now fetches `collective_members` with their associated `users` data.
  - `src/app/actions/collectiveActions.ts`:
    - Added a new `updateRevenueShares` server action. This action is protected, ensuring only the collective owner can call it. It validates that the total share percentage does not exceed 100 before committing the changes.
  - `src/app/(app)/settings/collectives/[slug]/monetization/MonetizationSettingsClient.tsx`:
    - Added a new "Revenue Sharing" card, which appears once a Stripe account is active.
    - The card displays a table of all collective members.
    - Each member has an input field to set their revenue share percentage.
    - The UI provides real-time feedback by displaying the total share percentage and disabling the save button if it exceeds 100.
    - The "Save Shares" button calls the `updateRevenueShares` action and provides user feedback via toast notifications.

## Phase 5: Advanced Features & Polish (Date: 2025-07-10)

### Advanced Governance Controls

- **Files Updated:**
  - `src/app/(app)/settings/collectives/[slug]/EditCollectiveSettingsForm.tsx`:
    - Added a new "Content Governance" section to the general settings form.
    - This section contains a `<Select>` input allowing the collective owner to choose between two governance models: 'Direct Publishing' and 'Moderated'.
    - The form's Zod schema was updated to validate this new `governance_model` field.
  - **`updateCollectiveSettings` Action:**
    - No changes were needed. The existing server action was already capable of handling the new field, demonstrating the robustness of the initial design.
