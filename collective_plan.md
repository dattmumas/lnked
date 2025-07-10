### **Collective Management System Overhaul: Detailed Plan (Revision 3)**

This document outlines the phased implementation plan for a comprehensive overhaul of the collective management system. Each step includes its rationale, implementation details, and verification criteria. This plan serves as the definitive engineering blueprint for the project.

---

### **Guiding Principles**

#### **1. State & Cache Management**

This project utilizes two caching layers. They must be managed correctly to ensure UI consistency.

1.  **Next.js Data Cache (Server-Side):** Managed with `revalidatePath` and `revalidateTag`. This is for data fetched within **Server Components**. Every Server Action that modifies data must call the appropriate revalidation function at the end of its execution.
2.  **TanStack Query Cache (Client-Side):** Managed with `queryClient.invalidateQueries`. This is for data fetched on the client. After a Server Action completes successfully, the client-side logic (e.g., in a `form.handleSubmit` function) should call this to refetch the data and update the UI.

#### **2. Component Architecture**

We will follow a "Container/View" pattern adapted for RSC:

- **Route Components (`page.tsx`, `layout.tsx`):** These are **always** Server Components. They are responsible for data fetching, permission checks, and passing data down.
- **Client-Side Dashboards/Forms (`*Client.tsx`):** Any component requiring hooks (`useState`, `useEffect`, `useForm`) will be a Client Component, clearly named with a `Client` suffix. They will receive their initial data as props from their RSC parent.

---

### **Phase 1: Core Collective & Membership Foundation (Backend)**

**Goal:** Engineer the database and server-side logic to be the unshakeable source of truth. All permissions, data models, and business rules will be enforced here first, ensuring data integrity regardless of how the frontend evolves.

#### **1.1: Database Schema Enhancements & Verification**

**Task:** Modify the database to support all required features for governance, moderation, and monetization.

- **Sub-Task 1.1.1: Verify Current Schema State**

  - **Action:** Execute `mcp_supabase_list_tables` and `mcp_supabase_execute_sql` on `information_schema.columns` for `collectives`, `collective_members`, and `post_collectives`.
  - **Goal:** Create a definitive baseline of the current schema to avoid redundant or failing migrations. This step is complete.

- **Sub-Task 1.1.2: Migration for `collective_members` Revenue Sharing**

  - **Rationale:** To enable future revenue sharing, each member needs a field to store their agreed-upon percentage.
  - **Verification:** Check if `share_percentage` column exists on `collective_members`.
  - **Migration SQL (`migrations/YYYYMMDDHHMMSS_add_share_percentage_to_collective_members.sql`):**

    ```sql
    -- File: supabase/migrations/YYYYMMDDHHMMSS_add_share_percentage_to_collective_members.sql
    ALTER TABLE "public"."collective_members"
    ADD COLUMN IF NOT EXISTS "share_percentage" NUMERIC(5, 2)
    NOT NULL
    DEFAULT 0
    CHECK (share_percentage >= 0 AND share_percentage <= 100);

    COMMENT ON COLUMN "public"."collective_members"."share_percentage" IS 'The percentage of collective revenue allocated to this member. Defaults to 0.';
    ```

  - **Action:** Apply migration using `mcp_supabase_apply_migration`.
  - **Post-Action: Regenerate TypeScript Types**
    - **CRITICAL:** To synchronize the application with the new database schema, the types file **MUST** be regenerated using the following CLI command. **NEVER** edit or overwrite `src/lib/database.types.ts` manually.
    - **Command:** `npx supabase gen types typescript --project-id tncnnulhjathjjzizksr > src/lib/database.types.ts`
  - **Existing Schema Location:** `src/lib/database.types.ts` (search for `collective_members` → `share_percentage`)

- **Sub-Task 1.1.3: Migration for `post_collectives` Moderation Workflow**

  - **Rationale:** To support a "pending approval" workflow, the link between a post and a collective needs its own status.
  - **Verification:** Check if the `post_publication_status` ENUM type and the `status` column on `post_collectives` exist.
  - **Migration SQL (`migrations/YYYYMMDDHHMMSS_setup_post_moderation.sql`):**

    ```sql
    -- File: supabase/migrations/YYYYMMDDHHMMSS_setup_post_moderation.sql
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_publication_status') THEN
        CREATE TYPE post_publication_status AS ENUM ('published', 'pending_approval', 'rejected');
      END IF;
    END$$;

    ALTER TABLE "public"."post_collectives"
    ADD COLUMN IF NOT EXISTS "status" post_publication_status
    NOT NULL
    DEFAULT 'published';

    COMMENT ON COLUMN "public"."post_collectives"."status" IS 'Moderation status of a post within a specific collective.';
    ```

  - **Action:** Apply migration using `mcp_supabase_apply_migration`.
  - **Post-Action: Regenerate TypeScript Types**
    - **CRITICAL:** To synchronize the application with the new database schema, the types file **MUST** be regenerated using the following CLI command. **NEVER** edit or overwrite `src/lib/database.types.ts` manually.
    - **Command:** `npx supabase gen types typescript --project-id tncnnulhjathjjzizksr > src/lib/database.types.ts`
  - **Existing Table Definition:** `src/lib/database.types.ts` (`post_collectives`)

#### **1.2: RLS Policies & Helper Functions**

**Task:** Implement non-negotiable security at the database row level.

- **Modern Security Note:** All RLS policies will use SECURITY DEFINER functions to minimize performance overhead in high-concurrency scenarios. Add database indexes on common query columns (e.g., `collective_id` in `collective_members`) to ensure performant lookups.

* **Sub-Task 1.2.1: Create SQL Helper Functions**

  - **Rationale:** To simplify and standardize RLS policies, making them more readable and less error-prone.
  - **Verification:** Check `supabase/migrations` for existing functions with similar names.
  - **Migration SQL (`migrations/YYYYMMDDHHMMSS_create_rls_helpers.sql`):**

    ```sql
    -- File: supabase/migrations/YYYYMMDDHHMMSS_create_rls_helpers.sql
    CREATE OR REPLACE FUNCTION get_user_role_in_collective(p_collective_id uuid, p_user_id uuid)
    RETURNS text AS $$
      SELECT role FROM public.collective_members
      WHERE collective_id = p_collective_id AND member_id = p_user_id;
    $$ LANGUAGE sql SECURITY DEFINER;

    CREATE OR REPLACE FUNCTION is_owner_of_collective(p_collective_id uuid, p_user_id uuid)
    RETURNS boolean AS $$
      SELECT EXISTS (
        SELECT 1 FROM public.collectives
        WHERE id = p_collective_id AND owner_id = p_user_id
      );
    $$ LANGUAGE sql SECURITY DEFINER;
    ```

  - **Action:** Apply migration.
  - **Post-Action: Regenerate TypeScript Types**
    - **CRITICAL:** To synchronize the application with the new database schema, the types file **MUST** be regenerated using the following CLI command. **NEVER** edit or overwrite `src/lib/database.types.ts` manually.
    - **Command:** `npx supabase gen types typescript --project-id tncnnulhjathjjzizksr > src/lib/database.types.ts`
  - **Existing Helpers:** Check `supabase/migrations/**` — functions `get_user_role_in_collective`, `is_owner_of_collective` may already exist.

* **Sub-Task 1.2.2: Apply RLS Policies**

  - **Rationale:** To enforce the principle of least privilege directly on the data.
  - **Verification:** Use the Supabase dashboard or `pg_policies` view to check existing policies.
  - **Migration SQL (`migrations/YYYYMMDDHHMMSS_apply_collective_rls.sql`):**

    ```sql
    -- File: supabase/migrations/YYYYMMDDHHMMSS_apply_collective_rls.sql
    -- RLS for 'collectives' table
    ALTER TABLE public.collectives ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow public read access" ON public.collectives;
    CREATE POLICY "Allow public read access" ON public.collectives FOR SELECT USING (is_public = true);
    DROP POLICY IF EXISTS "Allow member read access" ON public.collectives;
    CREATE POLICY "Allow member read access" ON public.collectives FOR SELECT USING (get_user_role_in_collective(id, auth.uid()) IS NOT NULL);
    DROP POLICY IF EXISTS "Allow admin/owner update" ON public.collectives;
    CREATE POLICY "Allow admin/owner update" ON public.collectives FOR UPDATE USING (get_user_role_in_collective(id, auth.uid()) IN ('admin', 'owner'));
    DROP POLICY IF EXISTS "Allow owner delete" ON public.collectives;
    CREATE POLICY "Allow owner delete" ON public.collectives FOR DELETE USING (is_owner_of_collective(id, auth.uid()));

    -- RLS for 'collective_members' table
    ALTER TABLE public.collective_members ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow members to view other members" ON public.collective_members;
    CREATE POLICY "Allow members to view other members" ON public.collective_members FOR SELECT USING (get_user_role_in_collective(collective_id, auth.uid()) IS NOT NULL);
    DROP POLICY IF EXISTS "Allow owners to manage members" ON public.collective_members;
    CREATE POLICY "Allow owners to manage members" ON public.collective_members FOR ALL USING (is_owner_of_collective(collective_id, auth.uid()));
    ```

  - **Action:** Apply migration.

**Definition of Done for Phase 1:**

- All specified database migrations have been written and successfully applied.
- All RLS policies and helper functions are implemented and can be tested via SQL queries.
- `database.types.ts` is up-to-date with all schema changes.

---

### **Phase 2: Frontend for Collective Management**

**Goal:** Build a pixel-perfect, intuitive, and highly functional settings dashboard for collective owners and administrators.

#### **2.1: Settings Page Architecture**

**Task:** Create the foundational routes, layout, and data-loading patterns for the entire collective settings section.

- **Sub-Task 2.1.1: File & Route Creation**

  - **Rationale:** A dedicated route group provides a logical namespace and allows for a shared layout, improving user navigation and code organization.
  - **Action:** Create the following directory structure:
    ```
    /src/app/(app)/settings/collectives/[slug]/
    ├── layout.tsx
    ├── page.tsx           // General Settings
    ├── members/page.tsx
    ├── monetization/page.tsx
    └── danger/page.tsx
    ```

- **Sub-Task 2.1.2: Implement the Settings Layout (`layout.tsx`)**
  - **Rationale:** A single layout will handle permission checking and data fetching for all sub-pages, preventing code duplication.
  - **Performance Optimization:** Use React Suspense for streaming child components. Wrap data fetches in async functions and add `<Suspense fallback={<LoadingSkeleton />}>` in the layout.
  - **Modern Data Fetching:** Convert to RSC pattern: fetch data server-side and pass as props. Use `revalidatePath('/settings/collectives/[slug]')` after updates.
  - **Technical Specification:**
    - **Component:** `CollectiveSettingsLayout({ children, params })` - This will be a **Server Component**.
    - **Data Fetching:**
      1.  Inside the component, call `createServerSupabaseClient()`.
      2.  Fetch the collective data: `supabase.from('collectives').select('*, owner_id').eq('slug', params.slug).single()`.
      3.  Fetch the current user's role: `supabase.rpc('get_user_role_in_collective', { p_collective_id: collective.id, p_user_id: user.id })`.
    - **Permission Logic:**
      - If `collective` is not found, call `notFound()`.
      - If user's `role` is not 'admin' or 'owner', call `redirect()` to the main collective page.
    - **UI:**
      - A two-column layout.
      - **Left Column (Sidebar):** A client component (`<SettingsNav>`) using `usePathname` to highlight the active settings page (General, Members, etc.).
      - **Right Column:** The `{children}` prop, which will render the specific settings page.
    - **Props Drilling:** Pass the fetched `collective` and `userRole` data down to the children via React Context to avoid prop drilling. Create a new context `CollectiveSettingsContext`.
  - **Existing Pages:**
    - Server component: `src/app/(app)/collectives/[slug]/settings/page.tsx`
    - Form component: `src/app/(app)/collectives/[slug]/settings/EditCollectiveSettingsForm.tsx`

#### **2.2: Member Management UI (`members/page.tsx`)**

**Task:** Implement the complete user interface for viewing, inviting, and managing collective members.

- **Sub-Task 2.2.1: Data Fetching and Component Structure**

  - **Component:** `MembersPage` - a **Server Component**.
  - **Data Fetching:** Fetch two lists in parallel:
    1.  `supabase.from('collective_members').select('*, member:users(*)').eq('collective_id', collective.id)`
    2.  `supabase.from('collective_invites').select('*').eq('collective_id', collective.id).eq('status', 'pending')`
  - **Component Composition:** Pass the fetched lists as props to a client component, `MembersDashboardClient`.
  - **Existing Members Page:** `src/app/(app)/collectives/[slug]/members/page.tsx`
  - **Existing Client UI:** `src/app/(app)/collectives/[slug]/members/ManageMembersClientUI.tsx`

- **Sub-Task 2.2.2: `MembersDashboardClient` Component**
  - **Rationale:** To handle all client-side interactivity for the members page.
  - **Modern State Management:** Integrate TanStack Query for caching member/invite lists (e.g., `useQuery({ queryKey: ['collective-members', collectiveId] })`). Use optimistic mutations for invite submission/removal.
  - **Performance:** Dynamically import heavy components like `<Table>` with `next/dynamic` to enable code splitting.
  - **Accessibility:** Ensure table has ARIA labels (e.g., `aria-label="Collective Members"`), keyboard-navigable dropdowns, and focus management in modals.
  - **Error Handling:** Wrap form submissions in try-catch, displaying toast notifications for errors (use `react-hot-toast`).
  - **State Management:**
    - `const [members, setMembers] = useState(initialMembers);`
    - `const [invites, setInvites] = useState(initialInvites);`
    - `const [isInviteModalOpen, setInviteModalOpen] = useState(false);`
  - **UI Implementation:**
    - **Invite Button:** A `<Button>` from Shadcn/UI that sets `isInviteModalOpen(true)`.
    - **Invite Modal (`<InviteMemberDialog>`):**
      - A controlled component using `react-hook-form` for validation.
      - **Fields:** An `<Input>` for email, and a `<Select>` for role (`admin`, `editor`, `author`).
      - **Submission:** The form's `onSubmit` will call the `inviteMemberToCollective` server action. A `useTransition` hook will be used to manage the pending state, disabling the form and showing a spinner. On success, the modal closes and the `invites` state is optimistically updated.
    - **Members Table:** A `<Table>` component from Shadcn/UI displaying `avatar`, `full_name`, `username`, and `role`.
      - **Actions Column (Owner-only):** If `userRole === 'owner'`, render a `<DropdownMenu>` with "Change Role" and "Remove Member" items. These actions will open further confirmation dialogs before calling their respective server actions.
  - **Existing Invite Form:** `src/app/(app)/collectives/[slug]/members/InviteMemberForm.tsx`

**Definition of Done for Phase 2:**

- The new settings route group and layout are implemented and correctly protect routes based on user role.
- All specified UI components for General, Branding, Members, and Danger Zone sections are built.
- Client-side forms correctly call their respective Server Actions and handle loading/error states.
- The invite acceptance flow is functional for all user states (logged in, logged out, invalid code).

---

### **Phase 3: Content & Moderation Integration**

**Goal:** Seamlessly connect the collective management system with the content creation and public-facing profile pages.

#### **3.1: Post Editor Enhancements**

**Task:** Integrate collective selection and moderation status directly into the post creation flow.

- **Sub-Task 3.1.1: Refine `CollectiveSelectionModal`**

  - **Rationale:** To ensure users can only post to collectives where they have the appropriate permissions.
  - **Data Fetching:** The modal should fetch the user's tenants using the `get_user_tenants` RPC and filter for tenants where `user_role` is `owner`, `admin`, or `editor`.
  - **UI:** The component will display a list of selectable collectives. If the list is empty, it will show a message: "You do not have posting permissions in any collectives."
  - **State:** The `usePostEditorStore` (Zustand) will store the `selectedCollectiveId`.

- **Sub-Task 3.1.2: Update Post-Saving Logic**
  - **Rationale:** The `useAutoSavePost` hook must now account for the collective's governance model when saving.
  - **Performance:** Use TanStack Query mutations with optimistic updates for auto-save. Cache governance_model fetches with `useQuery` to avoid redundant calls.
  - **Logic Modification:**
    1.  When saving a post, check if a `selectedCollectiveId` is present in the store.
    2.  If it is, fetch the `governance_model` for that collective.
    3.  If `governance_model` is `'moderated'`, the `insert` into `post_collectives` must set `status: 'pending_approval'`.
    4.  Otherwise, the status will be `'published'`.

#### **3.2: Collective Profile Page (`/c/[slug]`)**

**Task:** Create the public-facing profile page for a collective.

- **Sub-Task 3.2.1: Page Component (`/c/[slug]/page.tsx`)**
  - **Component:** `CollectiveProfilePage` - a **Server Component**.
  - **Data Fetching:**
    1.  Fetch collective details: `supabase.from('collectives')...`
    2.  Fetch published posts for the collective: `supabase.from('posts')...where('collective_id', collective.id).join('post_collectives', ...).eq('status', 'published')`.
    3.  Fetch the current viewer's role to determine if the "Manage" button should be shown.
  - **UI:** Display collective branding (logo, cover), description, and a grid or list of its published posts.
  - **Existing Implementation:** `src/app/(app)/collectives/[slug]/page.tsx`

#### **3.3: Content Moderation UI (`/settings/collectives/[slug]/moderation`)**

- **Task:** Build the interface for admins/owners to approve or reject submitted content.
- **Modern Implementation:** Use RSC for the page, with TanStack Query for the pending posts query. Add infinite scrolling if the list grows large.
- **Accessibility:** Buttons will have `aria-labels` (e.g., `Approve post titled {title}`) and focus traps in dialogs.
- **Component:** `ModerationPage` - a **Server Component** fetching data, passed to `ModerationDashboardClient`.
- **Data Fetching:** Fetches all records from `post_collectives` where `collective_id` matches and `status` is `'pending_approval'`, joining with the `posts` table to get post details.
- **UI (`ModerationDashboardClient`):**
  - A table listing pending posts (title, author, date submitted).
  - Each row will have "Approve" and "Reject" buttons.
  - Clicking a button will call a new server action (`moderatePost`) that updates the `status` in the `post_collectives` table.

**Definition of Done for Phase 3:**

- The post editor correctly integrates collective selection based on user permissions.
- The post-saving logic correctly applies moderation status based on the collective's governance model.
- The public-facing collective profile page correctly displays information and lists only published posts.
- The content moderation dashboard is fully functional, allowing admins/owners to approve or reject posts.

---

### **Phase 4: Monetization (Stripe Integration)**

**Goal:** Implement the full creator economy feature set, allowing collectives to generate revenue.

#### **4.1: Backend Server Actions for Stripe**

- **Sub-Task 4.1.1: Stripe Connect Onboarding Action**

  - **Action:** `getOrCreateStripeConnectAccount(collectiveId)`
  - **Logic:**
    1.  Check if user is the collective owner.
    2.  Check if `stripe_account_id` already exists on the collective. If not, call `stripe.accounts.create({ type: 'express' })`.
    3.  Store the new account ID on the `collectives` table.
    4.  Call `stripe.accountLinks.create` to generate a one-time onboarding link.
    5.  Return the link to the client.

- **Sub-Task 4.1.2: Stripe Webhook Enhancements**

  - **File:** `/api/stripe-webhook/route.ts`
  - **Performance & Security:** Use `next/cache` to invalidate related paths after webhook processing. Add rate limiting and signature verification for webhooks.
  - **Logic:** Add a `case` for the `account.updated` event. When received, parse the payload to check `charges_enabled` and `payouts_enabled`, and update the corresponding boolean columns on the `collectives` table.

- **Sub-Task 4.1.3: Price Tier Management Actions**
  - **Action:** `createPriceTier(payload: { collectiveId, amount, interval })` and `deactivatePriceTier(payload: { priceId })`.
  - **Logic:** These actions will interact with the Stripe API (`stripe.prices.create`, `stripe.prices.update`) and mirror the resulting price data to the local `prices` table.

#### **4.2: Frontend UI for Monetization (`monetization/page.tsx`)**

- **Task:** Build the UI for owners to manage all monetization settings.
- **UI Breakdown:**
  - **Stripe Onboarding Section:** Displays the collective's Stripe account status (`Not Connected`, `Pending`, `Active`). A button calls `getOrCreateStripeConnectAccount` and redirects the user to the returned Stripe URL.
  - **Subscription Tiers Section:** Lists existing price tiers from the `prices` table. A "Create Tier" button opens a modal to define a new price (amount, interval), which calls the `createPriceTier` action.
  - **Revenue Sharing Section:** A table of `collective_members`. For each member, the owner can input a `share_percentage`. A "Save Shares" button calls a new `updateRevenueShares` server action, which validates that the total percentage does not exceed 100.

**Definition of Done for Phase 4:**

- Backend server actions for Stripe Connect onboarding, status checks, and price tier management are complete.
- Stripe webhook handler is enhanced to manage account status updates.
- Frontend monetization dashboard is fully implemented, allowing owners to connect Stripe and manage pricing.
- The revenue sharing UI correctly updates member percentages.
- Content paywalls are functional, correctly hiding/showing content based on subscription status.

---

### **Phase 5: Final Polish & Advanced Features**

**Goal:** Finalize the user experience with advanced governance controls, notifications, and comprehensive testing.

#### **5.1: Advanced Governance Controls**

- **Task:** Allow owners to define their collective's moderation policy.
- **UI:** In the "General" settings page, add a `<Select>` menu for `governance_model` with options:
  - `'direct'`: All members can publish directly.
  - `'moderated'`: Posts from authors/editors go to the pending queue.
- **Backend:** The `updateCollectiveSettings` action will be updated to save this value. The post-saving logic from Phase 3 will use this field to determine the initial `status` of a post.

#### **5.2: Notifications**

- **Task:** Integrate with a notification service to keep users informed of key events.
- **Logic:** Enhance existing server actions to call a `create_notification` RPC.
  - `inviteMemberToCollective` -> notify the invited user.
  - `acceptCollectiveInvite` -> notify the collective owner/admins.
  - `moderatePost` (`approved` or `rejected`) -> notify the post author.
  - New subscriber -> notify the collective owner/admins.

#### **5.3: Testing and Documentation**

- **Task:** Ensure the system is robust, bug-free, and maintainable.
- **Unit/Integration Tests:**
  - Write Jest/RTL tests for all new client components (`MembersDashboardClient`, modals, etc.).
  - Write integration tests for every server action to validate permission checks, data manipulation, and error handling.

* - **E2E Testing:** Add Playwright tests for full flows (e.g., invite → accept → post to collective → moderate).
* - **Performance Testing:** Use Lighthouse in CI/CD to audit page loads; aim for scores >90.

- **Documentation:**
  - Create a `README.md` within the `/settings/collectives` directory explaining the architecture of the settings pages.
  - Update the main `collective_manager.md` to reflect all the new features and functionalities.

* - **CI/CD Integration:** Add Vercel deployment previews for PRs, with automatic tests running on push.

- **Backend Actions Already Implemented:**
  - `updateCollectiveSettings`, `deleteCollective`, `transferCollectiveOwnership` → `src/app/actions/collectiveActions.ts`
  - Member invites & role changes → `src/app/actions/memberActions.ts`

**Definition of Done for Phase 5:**

- Advanced governance controls are implemented and functional.
- All key user actions trigger notifications.
- The system is covered by unit, integration, and E2E tests.
- All relevant documentation is up-to-date.
- The CI/CD pipeline is configured with automated testing and performance audits.
