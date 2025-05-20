Understood. I’ll generate a detailed implementation plan for Cursors Agentic AI to fully redesign your post editor page. It will follow your new layout structure: an interactive left-side file explorer, a top bar for critical post metadata, and a main editor canvas. SEO and other secondary controls will be repositioned accordingly.

I’ll include precise file-level modifications and layout specifications compatible with the Lexical editor, Tailwind CSS, and your current component architecture. I’ll get back to you shortly with the full plan.

# Post Editor Page Redesign Implementation Plan

This plan details the file-by-file changes required to implement the new post editor page layout, following the provided wireframe and guidelines. The redesign introduces a left-hand file explorer, a top metadata bar (with title/status/etc.), a formatting toolbar below it, and the Lexical editor canvas filling the rest of the area. SEO fields and other secondary controls will be moved into a collapsible drawer. All changes use Tailwind CSS and align with the design system for spacing, colors, and typography.

## `src/components/editor/EditorLayout.tsx`

**Restructure the Editor layout:** Refactor the component to use a three-section layout: a left sidebar for navigation, a top metadata bar, and the main editor area (toolbar + content) below the top bar. The old centered card wrapper (max-width container) can be removed, allowing the editor to span a wider area (up to the DashboardShell’s max width, currently `max-w-6xl`). Key changes:

- **Overall Layout Container:** Wrap the children in a horizontal flex container. For example:

  ```tsx
  return (
    <div className="flex h-full">
      {/* Left sidebar file explorer will go here */}
      <aside className="hidden md:block bg-sidebar text-sidebar-foreground border-r border-sidebar-border w-64 overflow-y-auto">
        {/* File explorer content inserted here */}
      </aside>

      {/* Main content area (flex column for top bar + editor) */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Top metadata bar */}
        <div className="metadata-bar sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
          {/* Metadata inputs and publish button will be placed here */}
        </div>
        {/* Editor canvas + toolbar region */}
        <div className="flex-1 relative overflow-y-auto">
          {/* Rich text editor and toolbar content here */}
        </div>
      </div>
    </div>
  );
  ```

  This structure places an `<aside>` for the file explorer on the left (hidden on small screens), and the main area on the right. The main area is a flex column: the top bar and the scrollable editor canvas. We use design token classes like `bg-sidebar`, `text-sidebar-foreground`, `border-sidebar-border` for the sidebar (consistent with the existing DashboardSidebar styles).

- **Integrate children/components:** Instead of accepting `settingsSidebar` and `mainContent` props as before, `EditorLayout` will directly render the needed sub-components. We will remove the old prop-based API and switch to composition. For example, in the JSX above, the `<div className="metadata-bar">` will contain the metadata input fields and publish button (see **PostFormFields / Top Bar** below), and the `<div className="flex-1 relative">` will contain the `<PostEditor>` component (which includes the toolbar and text canvas). This means in the editor page route (e.g. `new-personal-post/page.tsx`), we will no longer do `return <EditorLayout settingsSidebar={...} mainContent={...}/>` but instead render `<EditorLayout>...children...</EditorLayout>` with the appropriate child elements in order.

- **Top Metadata Bar:** Inside `EditorLayout`, create a container for the post metadata inputs and actions. This bar should include the **Post Title** input, **Status** dropdown (and publish date picker if scheduled), **Visibility/Collection** selector if applicable, and the **Publish/Save button**. These elements will be arranged inline on desktop and stacked on mobile (see **PostFormFields.tsx** for details). The metadata bar should be visually separated (e.g. with a bottom border and background). We use classes like `sticky top-0 z-10 bg-background border-b border-border` so that this bar remains on top within the scrollable editor area (ensuring it stays visible when scrolling the content, similar to how the toolbar was made sticky). The height will adjust based on its content (likely one or two lines tall).

- **Editor Canvas Section:** Below the metadata bar, the main editor canvas (including the formatting toolbar) should fill the remaining space. The parent `<div className="flex-1 relative overflow-y-auto">` allows the content to scroll independently if it exceeds the viewport height (keeping the top bar in place). The Lexical editor itself will be rendered here via `<PostEditor />`. We’ll ensure this container is `relative` (as it already was) to position any floating UI elements properly, and `overflow-y-auto` so that long posts scroll. By making this a flex-1 container in a column, the canvas naturally expands to use all remaining space under the top bar.

- **Remove Card Styling:** The old implementation wrapped the editor in a centered card (`bg-card rounded-xl shadow-lg p-8` in a max-width container). In the new design, we drop this card for a full-width, app-like layout. The editor area can still have internal padding for readability (we can add some padding in the content area if needed, e.g. `px-4 py-6` inside the editor container to avoid text touching edges). But it will no longer be a fixed-width floating card – instead, it spans the available width next to the sidebar. (If we want to cap text line length, we could add an inner wrapper with something like `max-w-3xl mx-auto` within the content area, but this is optional.)

- **SEO Drawer Integration:** `EditorLayout` will not permanently render the SEO settings fields in its layout. Instead, we will include the new **SEOSettingsDrawer** component (see below) in the component tree (likely placing it at the end of `EditorLayout` or within the metadata bar as a trigger). The SEO drawer itself will portal to the body when open, so it doesn’t disturb the layout. We just need to ensure there is a button (e.g. a “SEO” or settings icon) in the top bar that toggles the drawer’s open state.

By restructuring `EditorLayout` as above, we shift from the previous two-column design (main vs. settings sidebar) to the new left-nav + top-bar layout. The page components (`new-personal-post` and others) will be updated to supply the children for `EditorLayout` accordingly (metadata bar content and editor content).

## Sidebar Navigation -> File Explorer (`SidebarNav.tsx` and `DashboardSidebar.tsx`)

**Replace the existing sidebar nav with an interactive file explorer tree.** We will refactor or repurpose `SidebarNav.tsx` to display the user’s posts and collectives in a hierarchical tree, instead of the current static nav links. The goal is to have two main sections: **Personal Newsletter** and **Collectives**, each expandable to show posts.

- **Remove old nav items:** The current `SidebarNav` lists “Overview” and “My Posts” links, and a Collectives list (each collective as a link), plus a Settings section. All of that will be replaced. We can remove the `mainNavItems` and `settingsNavItems` arrays and their mapping in the JSX. The file explorer will become the sole content of the sidebar for the editor page.

- **Personal Newsletter section:** At the top of the sidebar (after maybe a header), show a node for the user’s personal newsletter. This can be simply a non-collapsing section or a parent folder. For example:

  - **Personal newsletter** (as a label or folder name). Under it, list the titles of the user’s personal posts (drafts and published). Each post title will be a link that navigates to that post’s edit page (e.g. `/dashboard/posts/[postId]/edit`). We should fetch the list of the user’s posts to populate this. This can be done via Supabase (e.g. select from `posts` where `author_id = userId`), ideally server-side in the parent or via a React query on mount. For this implementation plan, assume we have an array `personalPosts` with `{id, title, status}` for the user.
  - Indent the post items slightly under the “Personal newsletter” heading for clarity. We might style the heading as we did other sidebar section titles (uppercase text-xs with muted color). The posts can be regular links styled similar to the existing sidebar links (text-sm). If needed, use an icon (like a document icon) for posts. However, text alone is fine.

- **Collectives section:** Below personal posts, list the collectives similarly:

  - A heading “Collectives” (could be just a label, since we may have multiple collective sub-folders).
  - For each collective the user is part of (we have `collectives` prop already passed into SidebarNav from DashboardShell), display it as a collapsible folder. The collective’s name serves as the folder label. Under each, list the posts for that collective (if the user has permission to edit them). We’ll need to fetch each collective’s posts (or fetch all user’s collective posts and group by collective). Alternatively, we might lazy-load posts for a collective when the user expands it, but to keep it simple, we can fetch on load.
  - Each collective’s posts are listed as links (e.g. `/dashboard/posts/[postId]/edit` or `/dashboard/collectives/{id}/posts/...` depending on routing; in the provided routes it looks like editing a collective post might also be under `/dashboard/posts/[postId]/edit`, but new collective post is `/dashboard/[collectiveId]/new-post` – we should verify the edit route for collective posts. If needed, adjust href accordingly).
  - Use indentation or tree styling to show hierarchy. For example, the collective name could be bold or accompanied by an icon (e.g. Users icon) and the posts indented under it.

- **Interactivity (expand/collapse):** If the tree gets large, making sections collapsible is useful. We can implement basic expand/collapse toggling by maintaining state for each section. For example, in `SidebarNav` use `useState` to track expandedCollectiveIds. The collective headings can be clickable to toggle their post list (maybe using a small arrow icon that rotates). Since the personal section is likely always desired open (and smaller), we could keep it always expanded. This is an enhancement; initially, we can show all by default.

- **Active post highlighting:** Highlight the currently open post in the list. We can reuse the active styles from `SidebarLink`: for the non-collapsed view, it uses a background accent tint and bold text. We can apply a similar class when a post’s link matches the current route (use `usePathname()` to get the current URL in this client component, and compare the post ID or path). For example:

  ```tsx
  const pathname = usePathname();
  const isActive = pathname.includes(post.id); // or exact match if possible
  <Link
    href={`/dashboard/posts/${post.id}/edit`}
    className={cn(
      "block px-3 py-1 text-sm rounded-md",
      isActive
        ? "bg-sidebar-accent/10 text-sidebar-accent font-medium"
        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/5 hover:text-sidebar-foreground"
    )}
  >
    {post.title}
  </Link>;
  ```

  This gives active links a highlighted background and text (using design token classes like `text-sidebar-accent` for the primary color).

- **Incorporate into `DashboardSidebar`:** The `DashboardSidebar` component currently renders `<SidebarNav ... />` inside the `<aside>` with branding and the "Create Post" button. We will integrate our new file explorer here. Likely we can still use `DashboardSidebar`’s container (for consistent width and styles), but point it to our updated `SidebarNav`. Specifically:

  - Keep the top logo/branding section as is (the "Lnked" logo at the top of sidebar).
  - Replace the content under the comment "Navigation sections" with the new file explorer. For now, we might not need the “Create Post” button at the bottom (since the file explorer itself could include an entry to create a new post, see next point), but we can retain it if desired. The plus icon button currently at the bottom of `DashboardSidebar` can remain to quickly create a new personal post.
  - If we keep the create button, verify it still works (it links to `/dashboard/new-personal-post`). This is fine; we might also consider adding a “New Post” entry as the first item under Personal newsletter for discoverability (optional). For example, a faux-post item like “+ New Post” that links to the new post page can be the first in the personal posts list.

- **Mobile behavior:** On mobile, the sidebar is not visible by default (DashboardShell hides it with `hidden md:flex`) and instead is accessed via a slide-out menu. The existing mobile menu in `DashboardNav` uses a Radix Dialog (sheet) to show `SidebarNav` content. After our changes, that same mechanism will display the file explorer. We should ensure the SidebarNav still renders correctly in that context (likely collapsed prop false). We might add a header in the sheet (“Navigation” as they had, which we could change to “Posts” or just keep “Navigation”). The file explorer list should be scrollable within the sheet if tall; we can wrap it in a `<div className="overflow-y-auto">` if needed, or rely on the `SidebarNav` internal scroll.

**Note:** If the editor page is the only place we need this file explorer, we may conditionally render it. However, given the instructions, we likely want this unified across managing posts. It’s acceptable to use the file explorer nav in all dashboard pages (the “Overview” and other links could be moved elsewhere, like top nav or user menu). In this implementation, we prioritize the new explorer for the editor context. We will test that the DashboardShell integration works (the `userCollectives` prop is already available to build the tree for collectives).

## `src/components/app/editor/form-fields/PostFormFields.tsx` (Top Bar Metadata Inputs)

**Refactor post form fields for inline display:** We will update this component to better serve the new top metadata bar. Currently, `PostFormFields` renders the title, status, and publish date fields stacked vertically with labels. We need to make it output these fields in a compact, horizontal arrangement with minimal labels, suitable for a single-line (or two-line on mobile) layout above the editor.

Key changes:

- **Export only critical fields:** Ensure `PostFormFields` only manages Title, Status, and Publish Date (as it does now). If there were any additional fields (like SEO or excerpt) in the future, they should be handled elsewhere (SEO now goes to the drawer). We will keep the Zod schema in this file focused on these three fields for validation (title required, min length, status enum, conditional published_at).

- **Add an `inline` layout option:** Introduce a prop (e.g. `inline?: boolean`) or a separate component mode to render fields in one horizontal bar. When `inline` is true, we will:

  - Omit or visually hide the field labels (“Post Title”, “Post Status”) to save space. We can keep them for accessibility by adding `className="sr-only"` on the `<Label>` elements, or remove the `<Label>` entirely and use `aria-label` on inputs instead. The goal is that in the top bar, we see just the input and dropdown without large labels.

  - Use Tailwind utility classes to arrange inputs in flex rows. For example, wrap the title and status controls in a container with `flex flex-col gap-2 md:flex-row md:items-center md:justify-between`. This will stack them on small screens and place them on one line on medium+ screens.

  - **Title Input:** Make the title field take most of the width. We can give it a class like `flex-grow` (so it expands in the flex container). Possibly style it with larger font to stand out (for instance, `text-xl font-semibold` to mimic a title style). The `Input` component already styles borders; ensure we apply any error border if `errors.title` is present (same logic as before). Use the `titlePlaceholder` prop for the placeholder (e.g. “Post Title” or “New post in \[Collective Name]”).

  - **Status Dropdown & Date:** Place the status `<select>` next to the publish button (or next to the title depending on design). We likely want the Status dropdown and the optional Date field grouped together, because they are related. For example, we can wrap them in a `<div className="flex items-center gap-2">`. Inside that:

    - The `<select id="status">` should remain as is for options (Draft, Publish Immediately, Schedule for Later), but we might style it a bit narrower if needed (it’s currently full width in the form; for inline, adding `w-auto` or a fixed min-width could help it not stretch). It’s disabled when submitting (same logic).
    - The datetime `<Input id="published_at" type="datetime-local">` should appear _inline_ when needed. In the current component, the date input is rendered conditionally as a separate block below status. We will change this so that if `currentStatus === "scheduled"`, we render the date picker in the same row right next to the status select. For example:

      ```tsx
      {
        currentStatus === "scheduled" && (
          <Input
            id="published_at"
            type="datetime-local"
            {...register("published_at" as Path<TFormValues>)}
            disabled={isSubmitting}
            className="border border-input rounded-md px-2 py-1 text-sm w-52 
                     focus:outline-none focus:ring-1 focus:ring-primary"
          />
        );
      }
      ```

      Here we gave it a fixed width (e.g. `w-52` \~ 13rem, to accommodate date and time text) and basic styling. This will appear to the right of the dropdown.

    - Maintain the validation message for published_at if it’s missing (the Zod refine ensures scheduling requires a date). If an error exists, in inline mode we may choose to show it as a tooltip or small text under the date input. Given space constraints, a simple approach: if `errors.published_at` is set, temporarily show a small `<p className="text-xs text-destructive">…</p>` beneath the date picker (it could be absolutely positioned tooltip as an enhancement). For now, it can break the flow slightly; since scheduling is a secondary action, this might be acceptable.

  - **Publish Button:** The publish/save button is not part of `PostFormFields` originally, but it needs to live in the top bar. We will include it to the right side of the status controls. We can either extend `PostFormFields` to accept an `onPublish` prop and render the button, or simply render the button alongside where `PostFormFields` is used. A clean approach is to **not** bake the button into `PostFormFields` (to keep this component focused on form inputs), and instead handle it in the top bar JSX (likely in `EditorLayout` or a small wrapper component for the metadata bar).

    - In practice, in the `EditorLayout`’s metadata bar (or the page component), we will include: `<PostFormFields inline ... />` and then a `<Button>` element for the publish action.
    - The button uses our `Button` UI component. Use the **default** variant (primary style) for prominence. For example: `<Button type="button" onClick={handleSubmit(onSubmit)} variant="default" size="sm">Publish Post</Button>` (or “Save Draft” depending on state). The `Button` variant "default" corresponds to a filled primary button (bg-primary etc.).
    - Dynamic text: continue the logic for `publishButtonText` that the page was using to set the button label (e.g. “Create Draft”, “Save Draft”, or “Publish Post” based on context). We may refine this: if `status === 'scheduled'`, label it “Schedule Post” for clarity. We’ll pass the computed text to the button. Also, disable the button and perhaps show a spinner if `isPublishing` is true (to indicate an ongoing submission). The `Button` component already dims when disabled (`disabled:opacity-50` in styles); we can also change the text to “Publishing…” when loading, or use a loading indicator icon if available.
    - Placement: On desktop, this button can sit at the far right end of the top bar. We can achieve this by wrapping the metadata inputs and button in a container with `justify-between` or by placing the button in its own flex item that pushes to the right. For instance:

      ```tsx
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        {/* Left side: title and maybe status controls on medium screens */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:flex-grow">
          ... Title input ...
          ... Status+Date controls ...
        </div>
        {/* Right side: publish button */}
        <Button ... className="self-start md:self-center"> ... </Button>
      </div>
      ```

      This way on mobile (`md:flex-row` not applied), the button will appear beneath the inputs (since `self-start` it will align to the left in its own line), and on desktop it will be on the same line to the far right.

- **Apply design system spacing:** Use consistent spacing utilities. We used `gap-2` (0.5rem) between elements in the top bar, which aligns with the smaller spacing scale. We use text-sm for inputs and dropdown for consistency (the Input component likely is text-sm by default, check `components/ui/input.tsx`). The title we bumped to possibly text-base or xl for emphasis, but ensure it doesn’t clash with global styles (maybe stick to text-base/semi-bold if text-xl is too large).

- **Remove redundant fields:** If `PostFormFields` had any fields not in the top bar, remove them from this component. (From the code, it currently doesn’t include SEO or content, so nothing extra to remove.) Ensure the component still works with the form. We still rely on `register` from `useForm` for each field. The parent page will still pass `register`, `errors`, `isSubmitting`, and `currentStatus` (we might derive `currentStatus` via `watch("status")` in parent and pass it in as before).

- **Validation messages:** In the top bar, we want to avoid large blocks of error text disrupting layout. We will keep showing the title required error if it’s empty (perhaps as a small red asterisk or line below the input). The status error (“Publish date is required for scheduled posts”) we discussed above. These should be kept minimal (class `text-xs`) and maybe only on one line. The form still prevents submission if these aren’t satisfied, so the main thing is to inform the user.

After refactoring, `PostFormFields` will be flexible: when `inline` is false (or not provided), it can still render the original stacked layout (which might be used in non-editor contexts or if needed elsewhere), and when `inline` true, it produces the compact horizontal layout described. In our editor page, we will use `inline` mode in the metadata bar.

## `src/components/editor/SEOSettingsDrawer.tsx` (New Component)

**Create a collapsible SEO settings sidebar (drawer):** This component will contain SEO-related fields (like SEO title and meta description) and will appear as a panel overlay (or modal) when triggered, rather than always being visible. We’ll implement it as a slide-in drawer from the side using Radix Dialog (since Radix is already used for the mobile sidebar sheet).

**Structure:**

- Create `SEOSettingsDrawer.tsx` as a client component (it will manage its open/close state on the client). It will likely use Radix’s Dialog API:

  ```tsx
  import * as Dialog from "@radix-ui/react-dialog";
  import { X } from "lucide-react"; // for close icon

  export function SEOSettingsDrawer(
    {
      /* perhaps no props, or form context */
    }
  ) {
    const [open, setOpen] = useState(false);
    return (
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <Button variant="ghost" size="sm">
            SEO Settings
          </Button>
          {/* Or an icon button in the top bar to open */}
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content
            side="right"
            className="fixed top-0 right-0 h-full w-96 bg-background border-l border-border p-6 z-50"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">SEO Settings</h2>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Close">
                  <X className="size-5" />
                </Button>
              </Dialog.Close>
            </div>
            {/* SEO Form Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="seo_title" className="text-sm font-medium">
                  SEO Title
                </Label>
                <Input
                  id="seo_title"
                  {...register("seo_title")}
                  maxLength={60} /* etc */
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended 60 characters or less.
                </p>
              </div>
              <div>
                <Label
                  htmlFor="meta_description"
                  className="text-sm font-medium"
                >
                  Meta Description
                </Label>
                <Textarea
                  id="meta_description"
                  {...register("meta_description")}
                  rows={3}
                  maxLength={160}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended 160 characters or less.
                </p>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }
  ```

  (Note: This is a rough outline with Tailwind classes for styling. The `side="right"` prop is conceptual here to indicate sliding from right – Radix’s Dialog doesn’t have a built-in side prop in the stable version, but they use it in their sheet example. In Radix, we might simply apply the fixed right-0 styles ourselves as above.)

- **Trigger:** The drawer will be opened by a button in the top metadata bar. We can label it "SEO" or use an icon (like a settings cog or “graph” icon). For clarity, a text button "SEO Settings" (as ghost style) in the top bar could be used. Perhaps place it near the Publish button or on the left of the publish button (since SEO is secondary, maybe as an icon button). In the code above, we show it as a trigger.

- **Overlay and Content:** We use a semi-transparent overlay over the main editor when the drawer is open. The Content is positioned fixed to the right, full height. We give it a width (e.g. `w-96` \~ 24rem) which should be enough for the fields. It has its own background (`bg-background`) and a left border (`border-border`) to distinguish from the content behind it. The `z-50` ensures it sits above other elements (the global nav is z-40, so 50 is safe).

- **Header and Close:** At the top of the drawer content, include a heading (e.g. "SEO Settings") and a close button. We use Radix’s `<Dialog.Close>` around an icon button (the lucide-react `X` icon) for the close action, as shown.

- **SEO Fields:** Inside the drawer, we have two main fields:

  - _SEO Title_: A text input for the SEO title (meta title). Use the existing `Input` component for styling consistency. We bind it to the form via `register("seo_title")`. We might add a `maxLength={60}` attribute to hint at length (and possibly enforce via validation later).
  - _Meta Description_: A multi-line text area for the meta description. We can use the `Textarea` component from `components/ui/textarea.tsx` for proper styling. Bind with `register("meta_description")`. We can also set a `maxLength={160}`.
  - We include small helper text below each (optional, but helps guide the user about recommended lengths, as shown above).

- **Form integration:** It’s crucial that these fields tie into the same React Hook Form context as the main post form. To achieve this, we have a few options:

  - If the editor page component wraps everything in a `<FormProvider>` (from `react-hook-form`), the `SEOSettingsDrawer` can call `useFormContext()` to get `register` and `errors` without needing props. This might be neat: in the page, after `useForm`, do `<FormProvider value={formMethods}>` around `<EditorLayout>` so that any child can access the form.
  - Alternatively, we can simply pass down the `register` function to `SEOSettingsDrawer` similar to how we do for `PostFormFields`. However, since the drawer might be triggered far from where we create it, using context is cleaner.
  - In this plan, we assume using context: inside `SEOSettingsDrawer`, use `const { register, formState: { errors } } = useFormContext();` to get what we need. Ensure to import `FormProvider` in the page and wrap the return JSX with it.
  - Validation for these fields can be added to the Zod schema for posts (e.g., extend `newPostSchema` with `seo_title: z.string().max(60).optional()`, `meta_description: z.string().max(160).optional()`). Since they’re optional, we mainly care about length limits. This way, when the user submits (publishes), these will be included and validated.

- **No separate save button:** We will not put a "Save" button in the SEO drawer. Changes will auto-bind to form state. When the user publishes or autosaves, these SEO fields will be saved with the rest. The drawer is purely for input. The user can close it with the X or by clicking outside (the overlay) and their inputs remain in form state.

- **Responsive:** The drawer will appear as an overlay on all screen sizes. On mobile, it will cover most of the screen (width 100% if needed, we might adjust to `w-full` on small screens via a media query or simply let Radix Dialog default to fullscreen on small if easier). But a 24rem panel on a small screen is basically fullscreen anyway. This is acceptable since editing SEO on mobile might be rare, but it’s still usable (just a modal with two fields).

- **Trigger placement:** As mentioned, likely in the top bar. For example, we can add a button with an icon (maybe a small “settings” or “tag” icon) labeled "SEO" that opens this. Keep it subtle (ghost variant, since it’s not a primary action).

Implementing this drawer as described ensures SEO and any other secondary fields (like excerpt, tags in the future) don’t clutter the main UI but are still easily accessible.

## `src/components/editor/PostEditor.tsx`

**Update the Lexical editor integration to fit the new layout and include all necessary plugins.** The `PostEditor` component is our Lexical rich text editor instance. We need to ensure it stretches to fill the available space beneath the toolbar, and that all features (plugins) are present (including new ones for lists, images, embeds).

- **Full-height editor area:** Make sure the editor’s container flexes to fill the parent. In the current code, `PostEditor` wraps the editor in a container `className="flex flex-col h-full"`. We should keep that. Now that `EditorLayout` gives the main content area a fixed height (via flex-grow in a flex container), `PostEditor` should take 100% of that height. The outer `<div className="flex flex-col h-full">` in `PostEditor` ensures that if its parent is flex-1 and constrained, the editor will occupy all vertical space. Inside that, Lexical’s `<ContentEditable>` likely has `className="h-full outline-none"` to actually take the full height for content. We should verify this or add it: we want the editing canvas to grow and scroll inside the container.

  - If we encounter issues where a very long post causes the overall page to scroll (instead of just the editor area), we might consider adding `overflow-y-auto` to the contenteditable container. However, since we set the parent (main content) to `overflow-y-auto`, the entire editor including content will scroll in the main region, which is fine. The difference is subtle: either the entire main area scrolls (with toolbar and top bar potentially scrolling out of view if not sticky), or we allow just the text area to scroll under a fixed toolbar. Given our sticky top bar and potentially sticky toolbar, likely the main area’s scroll is what’s happening. We will test to ensure content isn’t cut off. (The agent analysis pointed out that previously the sidebar had its own scroll but main lacked one; our redesign explicitly gives the main content an overflow-y scroll, solving that.)

- **Plugin integration:** Confirm that all Lexical plugins are included within `<LexicalComposer>`:

  - Core plugins like `<HistoryPlugin />`, `<RichTextPlugin />`, `<LinkPlugin />`, `<ListPlugin />` (for bullet/numbered lists) should be added if not already. Check `PostEditor.tsx` for missing plugins. For example, if `<ListPlugin />` from `@lexical/react/LexicalListPlugin` is not present, import and include it so that list formatting works (especially since we plan to add toolbar buttons for lists).
  - Ensure we have any table plugin if needed (the prompt mentioned tables and embeds, so possibly consider Lexical TablePlugin and AutoEmbedPlugin if relevant).
  - Custom plugins: The code already has a `<SlashMenuPlugin />` for slash commands and possibly a `<FloatingLinkEditorPlugin />`. Keep those. We might also have a GIF picker plugin (`showGifPicker` logic is in snippet), keep that integrated.
  - **Image support:** Implement a way to handle image insertion. We might create a custom `InsertImageCommand` and an `ImageNode` similar to how an Excalidraw drawing was handled (the code references `INSERT_EXCALIDRAW_COMMAND` and presumably an ExcalidrawNode). We can follow that pattern:

    - Define an `ImageNode` extending Lexical’s DecoratorNode or similar to render an `<img>`.
    - Provide an `INSERT_IMAGE_COMMAND` that takes an image file or URL, and when executed, uses `editor.update()` to insert an ImageNode into the editor state.
    - Include an `ImagePlugin` or simple listener that, when a file is selected, reads it (upload to storage or get a URL) and dispatches the command.
    - For simplicity in this plan: we’ll add an `<input type="file" accept="image/*">` in the toolbar (hidden) and when the toolbar image button is clicked, trigger `input.click()`. On file change, upload the file via Supabase storage or an API, get the public URL, then call `editor.dispatchCommand(INSERT_IMAGE_COMMAND, { src: imageUrl, altText: file.name })`.
    - Include any necessary Lexical plugin to handle selection or resizing if desired (this can be complex; initial implementation might just insert the image at full width or a default style).
    - **Note:** If time is short, an alternative is to use Lexical’s example `AutoEmbedPlugin` to allow pasting an image URL or using the slash menu to type “/image”. But given the user specifically asked for an image upload button, we’ll implement as above.

  - **Embed support:** For embedding external content (like videos, tweets), we can integrate Lexical’s AutoEmbedPlugin or create a basic mechanism:

    - Possibly add a toolbar button “Embed” that opens a prompt (modal) where the user can paste an embed code or URL. On confirm, insert it as a special node (e.g., an `EmbedNode` that wraps an iframe or embed script).
    - Alternatively, if the slash menu plugin is configured with some embed options, that might suffice.
    - To keep it simple, mention that an embed feature can be implemented, but details may be extensive. For now, ensure the architecture allows adding such a plugin. Perhaps stub an `EmbedNode` that for example can embed a YouTube video by URL.
    - We will plan to use Lexical’s `AutoEmbedPlugin` with some provider configs (Lexical’s playground has an embed example for YouTube, Tweet, etc.). Include `<AutoEmbedPlugin />` if Lexical provides it, configured with supported embed patterns.
    - Since specifics aren’t in code yet, we note that this is a planned extension: the UI should have a button or slash command to insert embedded media.

- **Toolbar location:** Previously, `Toolbar` was rendered inside `PostEditor` at the top of the editor area. In the new layout, we conceptually consider it “below the metadata bar”. We will ensure that when we place `<PostEditor>` in the JSX under the metadata bar, the toolbar (still rendered by PostEditor) will naturally appear directly below the top bar. That satisfies the requirement without needing to remove it from LexicalComposer. We **do not** remove the toolbar from `PostEditor`; instead we might adjust its styling (no position change needed, just confirm sticky behavior as needed).

- **Styling & Scroll:** After the changes, test that:

  - The contenteditable area scrolls within the allotted space. The toolbar’s `sticky top-0` might now stick the toolbar to the top of the content area _which starts right under the metadata bar_. If the metadata bar is also sticky, there is a possibility of overlap. We might need to offset the toolbar’s stickiness. One approach: add a top margin on the editor content equal to the metadata bar height if both are sticky, or simply let the toolbar be non-sticky if the metadata bar itself is sticky (since the metadata bar includes crucial controls).
  - If we find the toolbar sticking underneath the top bar, we can adjust by removing `sticky` from the toolbar (so it scrolls normally under the fixed top bar). Or keep toolbar sticky and metadata bar non-sticky. There are multiple approaches; we should choose one that keeps at least one of them visible. A reasonable compromise: **make the metadata bar sticky (so title & publish are always visible), and let the toolbar scroll normally** (since formatting options can scroll out of view if needed). Alternatively, keep toolbar sticky as well, but add `top-[<height of metadata bar>]` to its class so it sticks below the metadata bar.
  - For simplicity, we can initially have metadata bar not sticky (it will scroll out of view as user scrolls) and keep the toolbar sticky at top of editor content (meaning it will stick to the top of the viewport when the editor content reaches that point, as it did before). This was the previous behavior: the toolbar sticks to window top (below the main nav) when scrolling. If we do this, the toolbar will appear at the very top of screen once you scroll past the title field. That might actually obscure the metadata bar when scrolling. Instead, making the metadata bar sticky might be better.
  - **Plan**: Make both metadata bar and toolbar part of the same stacking context for stickiness. The simplest way: remove `sticky` from the toolbar (so it’s just positioned under the metadata bar), and make the entire metadata+toolbar container sticky as one unit. However, since the toolbar is inside Lexical (and metadata outside), combining them is non-trivial.
  - Thus, we will stick the metadata bar (already `sticky top-0` on the main column) and leave the toolbar as is (which has `sticky top-0` in its own context). This may cause the toolbar to stick to the top of the scrolling container which is the main content (which starts below the metadata bar). If main content is scrolling, the toolbar will stick to top of main content (which effectively is just under the metadata bar). That could work nicely: as you scroll the text, the toolbar will stay right below the fixed metadata bar. We will verify this during testing and adjust if needed (e.g., add `top-[3rem]` to toolbar if it overlaps the metadata bar of equal height).

  In summary, ensure the canvas area is flexible and scrollable, and the toolbar and top bar do not get lost on scroll.

- **Maintain autosave hooks:** `PostEditor` likely calls `onContentChange` (passed in from parent) whenever the editor state changes to update the form’s `content` field. We keep that prop usage. The autosave logic in the page uses `watch` on title/content and timeouts to trigger save. None of the redesign should break that, but we should double-check that by removing the side form, we haven’t removed anything essential for autosave. Actually, autosave was showing status in the old settings sidebar (the Alert). We have moved that alert (see below) but the underlying mechanism (setting `autosaveStatus` state in page, etc.) remains untouched.

## `src/components/editor/Toolbar.tsx`

**Update the formatting toolbar styling and buttons:** The toolbar should appear directly below the metadata bar, and we want it to be usable on smaller screens by scrolling horizontally if needed. We also need to add a few new buttons (lists, image, embed).

- **Ensure correct placement:** Since we are keeping the toolbar inside `PostEditor`, its DOM position relative to the metadata bar is already handled by placing `PostEditor` underneath. We might not need to change much in `Toolbar.tsx` for positioning except possibly remove any top margin that might have existed for spacing (likely none since it was first child).

- **Horizontal scroll on mobile:** Currently, the toolbar container has `className="toolbar sticky top-0 ... flex items-center gap-2..."` with CSS that includes `flex-wrap: wrap;`. Wrapping multiple toolbar rows on a narrow screen can make the UI tall. Instead, we prefer a single-row toolbar that scrolls horizontally. To achieve this:

  - Remove or override the `flex-wrap: wrap` style. The `.toolbar` class in globals.css has `flex-wrap: wrap`. We can override this by adding `flex-nowrap overflow-x-auto` to the container’s className. For example, change the opening `<div>` to:

    ```jsx
    <div className="toolbar flex items-center gap-2 overflow-x-auto whitespace-nowrap bg-background px-2 py-1 border-b">
    ```

    And drop the `sticky top-0` here if we handle stickiness at a higher level (as discussed). If we still want this toolbar itself sticky within editor content, we can keep `sticky top-0` (ensuring not to override by removing the 'toolbar' class entirely). Actually, it might be safer to remove the custom `.toolbar` class usage and just rely on Tailwind classes (since that class applied flex-wrap). We could do:

    ```jsx
    <div className="sticky top-0 z-20 flex items-center gap-2 overflow-x-auto whitespace-nowrap bg-background px-2 py-1 border-b">
    ```

    This explicitly sets no wrap and horizontal scroll. (The `whitespace-nowrap` ensures button labels/icons don’t break line, and `overflow-x-auto` adds a scrollbar if it exceeds width.)
    We should also verify that the dark mode styles (they had `dark:bg-background/80` in the class) are preserved if needed.

  - With these changes, on mobile, the toolbar becomes scrollable left-right. Users can swipe through all formatting options if they don’t fit. This prevents the toolbar from consuming multiple lines.

- **Add new formatting buttons:** Extend the JSX to include buttons for:

  - **Lists:** Both unordered (bullet) and ordered (numbered) list. We need to import the appropriate Lexical commands, e.g. `INSERT_UNORDERED_LIST_COMMAND` and `INSERT_ORDERED_LIST_COMMAND` from `@lexical/list`. The toolbar component can dispatch these on button click. For icon, lucide-react has `List` icon (for bullet list) and maybe `ListOrdered` (if not, we can use `list` and `list-ordered` from Heroicons or just letters "UL"/"OL" as text). Alternatively, lucide has `List` for unordered and we might use `ListOrdered` if exists.

    - Example:

      ```jsx
      <button type="button" onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)} className="toolbar-item spaced">
        <IconBulletList className="size-4" aria-label="Bulleted list" />
      </button>
      <button type="button" onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)} className="toolbar-item spaced">
        <IconNumberedList className="size-4" aria-label="Numbered list" />
      </button>
      ```

      We should also toggle them off if already in a list (Lexical can handle if the command on a list item might outdent or toggle to paragraph).
      Make sure to include `<ListPlugin />` in `PostEditor` as mentioned, otherwise these commands won’t have effect.

  - **Code Block:** It appears a code block option is already in the block type dropdown or as a button (they have a code block option in BLOCK_TYPES and a `Code2` icon import, likely for inline code or code block). If not present, add a button to format as code block:
    For example, if not already, we could use something like:

    ```jsx
    <button
      type="button"
      onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "code")}
      className="toolbar-item spaced"
    >
      <Code2 className="size-4" aria-label="Code block" />
    </button>
    ```

    But given they have the block dropdown, this might duplicate. Check if they already had a Quote and Code Block option (they did in BLOCK_TYPES list).
    Possibly skip if redundant. However, a dedicated inline code toggle is present (they have toggleFormat("code") for inline code).
    So code is covered.

  - **Image Upload:** Add a button with an image icon (lucide has `Image` or `FileImage`). e.g.:

    ```jsx
    import { Image as ImageIcon } from "lucide-react";
    ...
    <button type="button" onClick={handleImageButtonClick} className="toolbar-item spaced">
      <ImageIcon className="size-4" aria-label="Insert image" />
    </button>
    <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={onImageFileSelected} />
    ```

    Here, `handleImageButtonClick` will do `fileInputRef.current?.click()`, and `onImageFileSelected` will read the file and dispatch the insert image logic. We’ll implement those in this component or pass a callback from `PostEditor`. A simpler approach is to handle everything in `Toolbar` since it has access to `editor` via `useLexicalComposerContext()`.
    On file select:

    - We could directly use FileReader to get a data URL and insert that (quick but not optimized), or upload to Supabase storage and get a URL. For now, mention reading the file to a data URL and inserting as an <img> to ensure something appears, with a TODO to integrate a proper upload pipeline.
    - Example insertion:

      ```jsx
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result;
        if (typeof src === "string") {
          editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
            src,
            altText: "Image",
          });
        }
      };
      if (file) reader.readAsDataURL(file);
      ```

      This will embed a base64 image. In real scenario, we’d upload and use a URL, to avoid giant JSON in Lexical state. We’ll note to integrate upload in the actual implementation (e.g., call an API route to upload then insert).

  - **Embed:** Add a button for embed, maybe an icon like `<PlayCircle>` for media or a generic `<Globe>` icon. On click, we might open a small dialog (maybe use a prompt for now) asking for a URL or embed code, then parse it.

    - If a YouTube URL, we could create an embed node for YouTube iframe, etc. This is advanced; for the plan, we say: clicking the embed button could trigger a simple modal (we can reuse Radix Dialog) where the user pastes a URL. Then we detect the type (YouTube, Twitter, etc.) and insert an appropriate node.
    - Lexical’s AutoEmbedPlugin can simplify this by providing an UI. If using that, the slash menu might handle some cases already (depending on how SlashMenuPlugin is set up).
    - We can at least stub: if user enters an iframe snippet or a known embed URL, we insert a special node with that HTML. The node can render dangerously or via an <iframe>.
    - Ensure such nodes are properly handled in serialization (maybe out of scope for now, but note to implement).

  - **Ensure existing buttons remain:** The current toolbar covers bold, italic, underline, strikethrough, inline code, link, align left/center/right, undo/redo, and a gif and excalidraw button. We will retain all those. Adding the above new ones will likely require importing new commands and icons. This will increase the toolbar length, but since we allow horizontal scrolling, that’s fine.

- **Style consistency:** The toolbar uses the `.toolbar-item` class for buttons, which gives them a consistent look (no background, some spacing, pointer cursor). We will continue to use `className="toolbar-item spaced"` for new buttons to match style. The global CSS `toolbar-item.spaced` adds right margin 8px. We might rely on our `gap-2` and remove spaced class usage in favor of gap, but since we left the class in markup, we keep it for now. Just ensure to include the spaced class to separate icons slightly if needed (though gap-2 on parent might already suffice).

  - If we removed `.toolbar` class, we should also remove reliance on `.toolbar-item` classes and instead use Tailwind classes on the buttons. However, to avoid rewriting CSS, we can keep using the existing classes. They make buttons appear as plain icon buttons. We just have to ensure our new icons get the correct size classes (`size-4` etc) to be visually similar to others.
  - The toolbar container already has a bottom border in class (we keep `border-b` for a division line below toolbar, which also aligns with design tokens for subtle separation).

- **Mobile considerations:** After adding potentially many icons (lists, image, etc.), verify that on a narrow screen the toolbar indeed scrolls horizontally. The user should be able to swipe to see the later icons (e.g., the embed button might be off-screen initially). Because we set `overflow-x-auto` and `whitespace-nowrap`, this will work. We should also test that the scroll doesn’t cut off anything or require a scrollbar (maybe add `pr-2` padding to toolbar container so that the last button isn’t partially obscured by scrollbar on some browsers).

- **Event handling:** All new buttons will use the `editor` instance from context to dispatch commands. Ensure to `import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from "@lexical/list"` and similarly define or import `INSERT_IMAGE_COMMAND` and any embed command. If custom commands (like image) are defined in `PostEditor`, import them (e.g., they imported `INSERT_EXCALIDRAW_COMMAND` from PostEditor, we can define `export const INSERT_IMAGE_COMMAND = createCommand()` in PostEditor and import it in Toolbar). That way, Toolbar can dispatch it and the actual node insertion logic can reside in PostEditor (in a useEffect that registers a listener for that command).

  - We might do:

    ```tsx
    // In PostEditor.tsx:
    export const INSERT_IMAGE_COMMAND = createCommand("INSERT_IMAGE");
    ...
    editor.registerCommand(INSERT_IMAGE_COMMAND, payload => {
      const { src, altText } = payload;
      const imageNode = $createImageNode(src, altText);
      $insertNodes([imageNode]);
      return true;
    }, COMMAND_PRIORITY_EDITOR);
    ```

    This ensures when Toolbar dispatches, the node is inserted.
    Implement `$createImageNode` similarly to any other custom node (we’d have to create the node class with how to render an <img>).
    This level of detail can be implemented as needed; for the plan, it suffices to outline that we will add the command and node.

Summarizing changes to `Toolbar.tsx`: disable wrapping (use horizontal scroll), add list/image/embed buttons, and keep everything else the same. The end result is a more feature-complete toolbar that fits in one line and can scroll on small screens.

## Responsive Layout and Mobile Adjustments

**Optimize the layout for different screen sizes:**

- **Sidebar behavior:** On desktop and tablets (md and up), the left file explorer sidebar is visible at a fixed width (64). On mobile (sm and below), it is hidden by default (`hidden md:block` on the `<aside>` in EditorLayout). The existing dashboard top nav (DashboardNav) already provides a hamburger menu for mobile that opens the sidebar as a drawer. We will continue to use that. After our changes, when the user taps the menu on mobile, the `SidebarNav` content that appears will now be the file explorer list of posts. This should just work, as we haven’t removed the `SidebarNav` usage in the mobile sheet. We should test it:

  - When open on a small screen, the drawer (sheet) should show “Personal newsletter” and “Collectives” with posts. The Radix `<Sheet.Content>` has `w-64` which might be narrow on a phone; we could adjust it to a higher width or full width on mobile if needed. Possibly use `max-w-full` to ensure it doesn’t overflow the viewport on small screens.
  - Scrolling: ensure the sheet content scrolls vertically if the list is long (the Radix content in DashboardNav already likely scrolls; it has `h-full overflow-y-auto` implicitly or can be added).
  - Closing: works by tapping outside or the menu button again.

- **Top bar and toolbar stacking:** As specified earlier, we use responsive flex utilities so that on small screens the metadata inputs and publish button stack vertically:

  - In `PostFormFields` inline layout (or the top bar container), we applied `md:flex-row md:items-center md:justify-between`, which means on screens <768px, it will be flex-col with gap-2 (title field on one line, and status + button on next line). This prevents the top bar from overflowing width or feeling cramped. Users can still scroll the main area if the top bar is tall.
  - The formatting toolbar on mobile will be a single horizontal strip that can scroll. Users might need to swipe to access some options, but it avoids wrapping into multiple rows.
  - If needed, ensure the toolbar icons are not too large; they are mostly 16px icons with maybe no text, which is fine for mobile fingers given padding around them is present.

- **Content editor on mobile:** The editor canvas will take the full width of the screen (minus no sidebar). The user can focus the text and type as usual. Ensure the placeholder (“Share your thoughts…”) is visible initially (it should be, as we pass it in PostEditor props). The top bar might push content down a bit, but that’s fine.

- **Publish button and nav overlap:** One area to check is if the global header (DashboardNav) and the publish button both occupy top area on a very small screen. The global nav is 48px tall (h-12), and our top bar will come right below it. There should be no overlap, but the user will have two stacked bars (nav bar and metadata bar). This is expected.

- **Collapsing/expanding**: We might not implement a collapsible sidebar on desktop (since the design doesn’t mention it explicitly). However, if `DashboardSidebar` has collapse functionality via the toggle (chevron button), we need to consider how our file explorer looks in collapsed mode. The collapse essentially shrinks width to 4rem and shows only icons. In our file explorer, showing just icons for posts likely isn’t useful. It might be acceptable to disable collapse on the editor page. Possibly, we can ignore collapsed state or still allow collapse (in collapsed mode our component could hide text and just show maybe folder icons and a plus button).

  - For now, we can leave the collapse functionality but simply note that in collapsed state, the file tree will not be very usable (maybe just an icon placeholder). To avoid confusion, we might programmatically prevent collapse on the editor route (e.g., `sidebarCollapsed` could be forced false). This detail can be addressed in implementation. It wasn’t specified, so we focus on the default expanded view.

In summary, the design will be mobile-friendly: the left nav becomes a swipe-out drawer, and the top controls stack vertically with scrollable formatting options.

## Testing & Validation

After implementing the above changes, thoroughly test the editor page to ensure all functionality remains intact and the new UI is responsive and user-friendly:

- **Layout and Responsiveness:**

  - Load the editor page on a large screen: verify that the left sidebar shows the Personal and Collectives sections with correct post items. Ensure the main editor area is next to it and not overflowing the viewport (no horizontal scrollbar at full width). The top bar should display the title input (placeholder text present), status dropdown, date picker (only if “Scheduled” is selected), and the publish button. The formatting toolbar should appear below the top bar.
  - Shrink to a mobile width: confirm the sidebar disappears and the top bar stacks properly (title input taking full width on one line, and status + button on the next). The toolbar should be horizontally scrollable – try scrolling it, and ensure all icons/buttons are accessible. Tap the hamburger menu in the header: the sidebar drawer should slide in, showing the file explorer. Test that tapping a post in the drawer navigates (it should navigate to that post’s edit page or new post page; ensure the routing works and the editor loads for that content).
  - Try medium size (tablet): the sidebar might still show (md breakpoint \~768px), so similar to desktop; check that nothing overlaps (the top bar should still be one line if there's room).

- **File Explorer Functionality:**

  - Click on a post in the Personal newsletter list. The app should navigate to that post’s edit page (e.g., `/dashboard/posts/123/edit`). The editor should load that post’s content (make sure existing content loads in Lexical – this depends on passing the `initialContentJSON` prop, which the edit page already does). The file explorer should highlight that post as active.
  - Click on a collective’s name to expand its posts (if collapsible implemented). Click on a collective post. It should navigate accordingly and highlight active.
  - Click the “New Post” (if we added such an item or use the plus button). Ensure it navigates to the new post page. The file explorer might highlight nothing or a placeholder in that state.
  - Try the collapse sidebar button (if available on desktop nav) – if collapsed, verify that our file explorer still renders icons or at least doesn’t break. (It may not be very useful in collapsed mode; we can accept that or decide to disable collapse.)

- **Metadata Bar & Form:**

  - Leave the title blank and attempt to publish: the required validation should trigger. You should see a red error message below the title input (e.g., “Title is required” from Zod). The publish action should be prevented. Enter a title and ensure the error goes away.
  - Toggle the status dropdown: try switching to "Published" or "Scheduled". If "Scheduled" is selected, the date/time picker input should appear immediately next to the dropdown. Try not entering a date and clicking Publish: the Zod refine rule should produce an error for published_at (e.g., “Publish date is required for scheduled posts.”). We should surface that error message near the date field. Enter a date/time in the past or future and ensure the error clears.
  - If "Draft" is selected, the date input should hide. Publishing when “Draft” essentially means just saving a draft (our submit handler likely treats draft vs publish differently in the action).
  - Click the publish button in various scenarios:

    - Draft post (new): It should call `onSubmit` which likely creates a new post in the database (via `createPost` action) and then either navigates or updates UI. Check that after clicking, the `isPublishing` state triggers (maybe disable button and show a spinner if we implemented that). After success, it might redirect or show a success (depending on action implementation).
    - Published post: It should publish and possibly redirect to some confirmation or leave you in editor with status updated. Ensure no errors.
    - Scheduled post: After hitting schedule, confirm the post’s status in DB is scheduled with the date set.

  - Autosave: This is a critical feature if present. The code has an `autosaveStatus` and uses a debounce to auto-save content periodically. Test typing in the editor: after a pause, it should set `autosaveStatus` to something like “Saved at 12:34” or show an error if failed. We moved the autosave alert from the side to presumably below the editor. Verify that the `<Alert>` now appears in the new location:

    - We decided to place it below the editor content (or possibly just below the top bar). Wherever we placed it, confirm it’s visible. For example, after typing, you might see a small alert bar with an info icon and text “Draft saved” or similar. We use the same `<Alert>` component with `variant` default or destructive depending on message. Check that its styling (text-xs) fits in unobtrusively. If it’s at the bottom of the editor, scroll down to see it; it might be better to position near top so the user notices save status without scrolling. We could consider moving it just under the toolbar in the DOM for visibility.
    - Force an autosave failure (maybe go offline or trigger an error in save function) and see that the alert shows an error message (in red, since we use variant "destructive" for error keywords).
    - These alerts should disappear or update on next autosave cycle. Ensure multiple messages don’t stack endlessly (the code replaces the status string, so it should be one at a time).

- **SEO Drawer:**

  - Click the SEO Settings trigger in the top bar. The drawer should animate in (Radix handles animation if included, if not it will just appear). The overlay should darken the rest of the screen. Confirm the drawer is the expected width and on the right side.
  - Check that the SEO Title and Meta Description fields are present. Enter text in them. Perhaps leave one empty and one filled, just to test. Close the drawer (using the X or by clicking outside). Reopen it – the text you entered should still be there (since it’s tied to form state, it shouldn’t be lost on close).
  - Submit the post (publish). Then check in the database or in the post detail page that the SEO fields were saved correctly (if the backend and database were extended to accept these fields). If the backend isn’t ready, at least ensure the form values are captured by logging them on submit for now.
  - Also test validation (if we added any, e.g., max length). Try inputting 200 characters in meta description and clicking publish – the Zod schema should reject it if we set max 160, and show a relevant error message in the drawer (maybe under the field). Make sure that error surfaces even if the drawer is closed (this is tricky – ideally, if the drawer is closed and validation fails, we might open it or at least show a toast saying “Meta description too long”). This might be a UX consideration beyond scope; but at minimum, when open, it should show errors under the fields.
  - On mobile, open the SEO drawer – it might cover the whole screen which is fine. Verify you can scroll inside it if content exceeds (not likely with just two fields). The close button should be tappable.

- **Toolbar Buttons:**

  - Bold/Italic/etc: ensure existing ones still work (they should – we didn’t break them, just changed container classes).
  - **List buttons:** Click the bullet list button – the current paragraph should turn into a bullet list. Try typing more lines, pressing Enter, etc., to see that list plugin is functioning (indentation via Tab maybe, not sure if enabled by default). Click the bullet list button again or the numbered list – it should toggle appropriately (list to paragraph or switch type). Check state: the toolbar might highlight active list style if we implemented that (not explicitly, but optionally we could highlight the list button when in a list).
  - **Image button:** Click it, select an image from your file system in the dialog. After a short moment (depending on if we implemented upload or base64 conversion), an image should appear in the editor content. Verify it’s inserted at the correct place (likely at cursor or end). Check that you can backspace to remove it or it’s treated as a block. If using base64, large images will bloat – consider adding resizing or at least warn file size (beyond scope, but note for future).
  - **Embed button:** Click it, if it opens a prompt or modal for a URL, input a YouTube link (e.g., "[https://youtu.be/VIDEOID](https://youtu.be/VIDEOID)"). Confirm that an iframe or preview gets inserted. If we didn’t fully implement, this might be a no-op or just insert the raw URL. In a complete version, we’d see an embed. Ensure it doesn’t crash anything. If using AutoEmbedPlugin, typing a URL might auto-convert – test that if possible (maybe type a YouTube URL directly in editor and see if slash menu or autoembed kicks in).
  - **Other formatting:** Test alignment buttons (they likely are implemented to apply text alignment). Also test the undo/redo buttons still function after our changes (they rely on editor commands, should be fine).
  - **Slash menu:** Ensure the SlashMenuPlugin still appears when typing “/”. It should now appear in context with our new layout without issues (our layout changes shouldn’t affect it, since it uses portal to body by design). Check that inserting via slash menu (e.g., `/h1` or `/image` if that exists) works.

- **Publish/Update flows:**

  - After publishing a post, the UI might route somewhere (depending on how `onSubmit` is coded). For example, maybe it redirects to the published post page or stays in editor but with status updated. If staying in editor, ensure the status dropdown now shows “Published” and perhaps the publish button text changes to “Update Post” or similar on subsequent edits. The plan didn’t explicitly cover that, but logically once a post is published, re-publishing might be an update action. We should ensure our button text logic covers the edit case (the code had `createdPostId ? "Save Draft" : "Create Draft"` logic, so likely for an existing post it uses "Save Draft" if still draft).
  - Test editing an existing published post (go to `/dashboard/posts/[id]/edit`). The form should load with title, content, etc. Perhaps the status dropdown will show “Published”. If we allow editing a published post, we might keep it at Published and the button might say “Update Post” (not implemented, but could be done by checking if post already exists and status is published).
  - Check scheduling: schedule a post 1 minute in the future, see if the UI indicates scheduled (after saving, status might remain scheduled). There’s likely no front-end countdown or anything, but the database entry would have published_at set. The editor should still allow editing until that time.

- **General UX and polish:**

  - Make sure there are no console errors (React key warnings in lists, etc.). For instance, our file explorer should use keys for list items (we will, using post IDs and collective IDs).
  - Ensure all interactive elements have appropriate labels for accessibility (we added aria-label to icon buttons like bold, list, etc., which is good).
  - Check that tab order makes sense (tab from title goes to status, then date if visible, then perhaps to SEO button or toolbar? Possibly the toolbar buttons should be skipped on Tab to not trap keyboard users – not critical but consider if needed).
  - Dark mode: Switch to dark theme if available (the app supports dark via CSS variables). Verify the new elements render correctly (e.g., sidebar bg uses `bg-sidebar` which is defined for dark mode in CSS, so it should be fine. Our new drawer uses `bg-background` which switches in dark mode to dark color, etc.). The border colors and text colors we used are token-based (`border-border`, `text-foreground` etc.) so it should adapt. Just eyeball that nothing has glaring contrast issues in dark mode.
  - Performance: The page should load and render quickly. The additional queries for posts lists (if not cached) might add load time – monitor that, perhaps we can load posts in parallel with the page. Also ensure large image insertion doesn’t freeze the editor (might if using base64 on huge image – an area to optimize later by uploading instead).
  - Collaboration: If multiple users or collective, ensure that if someone without permission tries to edit (should be prevented by auth upstream anyway).

After all these tests, any issues found should be addressed (e.g., layout tweaks, bug fixes in logic). The result will be a robust, user-friendly post editor page matching the intended redesign.
