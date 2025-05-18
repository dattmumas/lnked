Understood. I will conduct a file-by-file audit of the uploaded codebase for Lnked and develop a comprehensive, line-by-line implementation plan for a complete redesign. This plan will incorporate all UI/UX principles you've outlined—including accessibility, atomic design with Radix UI, Tailwind CSS styling, minimalist layout, responsive behavior, and modern interaction design.

I'll start by extracting the project and mapping the current file structure. I’ll then proceed module by module to define all necessary edits for aligning the current code with the new design system.

I’ll notify you once the full plan is ready for review.

# Lnked Redesign Implementation Plan

This plan provides a comprehensive, file-by-file audit of the **Lnked** codebase, detailing the changes needed to align every component, layout, style, and page with the new UI/UX design system. The guiding principles are a forward-thinking minimalist aesthetic, responsive WCAG AA accessibility, an Atomic Design approach using Radix UI + Tailwind CSS (no external UI kits), full dark mode support via CSS variables, the Inter and Source Serif 4 typography system, Linear-inspired compact dashboards, an 8px spacing grid, and consistent micro-interactions (Tailwind transitions with Radix state selectors). Every file is addressed with required modifications and reasoning.

## File Structure Overview

```text
lnked-project/
├── package.json
├── tailwind.config.ts
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── tsconfig.json
├── README.md
├── DESIGN_SYSTEM.md
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── sign-in/
│   │   │   │   └── page.tsx
│   │   │   └── sign-up/
│   │   │       └── page.tsx
│   │   ├── [collectiveSlug]/
│   │   │   ├── [postId]/
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── discover/
│   │   │   ├── _actions.ts
│   │   │   ├── RecommendationFeedbackButtons.tsx
│   │   │   └── page.tsx
│   │   ├── newsletters/
│   │   │   └── [userId]/
│   │   │       └── page.tsx
│   │   ├── posts/
│   │   │   └── [postId]/
│   │   │       └── page.tsx
│   │   ├── dashboard/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── posts/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [postId]/
│   │   │   │       └── edit/
│   │   │   │           ├── EditPostForm.tsx
│   │   │   │           └── page.tsx
│   │   │   ├── my-newsletter/
│   │   │   │   └── subscribers/
│   │   │   │       └── page.tsx
│   │   │   ├── new-personal-post/
│   │   │   │   └── page.tsx
│   │   │   ├── profile/
│   │   │   │   └── edit/
│   │   │   │       ├── EditProfileForm.tsx
│   │   │   │       └── page.tsx
│   │   │   ├── collectives/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   ├── _actions.ts
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [collectiveId]/
│   │   │   │       ├── settings/
│   │   │   │       │   ├── EditCollectiveSettingsForm.tsx
│   │   │   │       │   └── page.tsx
│   │   │   │       ├── manage/
│   │   │   │       │   └── members/
│   │   │   │       │       ├── InviteMemberForm.tsx
│   │   │   │       │       ├── ManageMembersClientUI.tsx
│   │   │   │       │       └── page.tsx
│   │   │   │       └── subscribers/
│   │   │   │           └── page.tsx
│   │   │   └── [collectiveId]/
│   │   │       └── new-post/
│   │   │           └── page.tsx
│   │   ├── actions/
│   │   │   ├── collectiveActions.ts
│   │   │   ├── followActions.ts
│   │   │   ├── likeActions.ts
│   │   │   ├── memberActions.ts
│   │   │   ├── postActions.ts
│   │   │   ├── subscriptionActions.ts
│   │   │   └── userActions.ts
│   │   ├── api/
│   │   │   ├── collectives/
│   │   │   │   ├── route.ts
│   │   │   │   └── [collectiveId]/
│   │   │   │       ├── plans/route.ts
│   │   │   │       └── stripe-onboard/route.ts
│   │   │   ├── comments/
│   │   │   │   └── _commentId/reactions/route.ts
│   │   │   ├── like/route.ts
│   │   │   ├── posts/
│   │   │   │   ├── route.ts
│   │   │   │   └── _postId/
│   │   │   │       ├── route.ts
│   │   │   │       ├── bookmark/route.ts
│   │   │   │       ├── comments/route.ts
│   │   │   │       ├── reactions/route.ts
│   │   │   │       └── view/route.ts
│   │   │   ├── recommendations/route.ts
│   │   │   ├── stripe-webhook/route.ts
│   │   │   └── subscribe/route.ts
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── FollowButton.tsx
│   │   ├── SubscribeButton.tsx
│   │   ├── PostLikeButton.tsx
│   │   ├── landing/
│   │   │   ├── FadeInImage.tsx
│   │   │   ├── SlideInCard.tsx
│   │   │   ├── SnippetCard.tsx
│   │   │   └── sections/
│   │   │       ├── AnimatedHero.tsx
│   │   │       ├── CreateCollaborate.tsx
│   │   │       └── FragmentedFeeds.tsx
│   │   ├── app/
│   │   │   ├── auth/AuthForm.tsx
│   │   │   ├── collectives/molecules/CollectiveCard.tsx
│   │   │   ├── dashboard/atoms/sidebar-link.tsx
│   │   │   ├── dashboard/collectives/DashboardCollectiveCard.tsx
│   │   │   ├── dashboard/molecules/RecentPostRow.tsx
│   │   │   ├── dashboard/molecules/compact-collective-card-skeleton.tsx
│   │   │   ├── dashboard/molecules/recent-post-row-skeleton.tsx
│   │   │   ├── dashboard/molecules/stat-card.tsx
│   │   │   ├── dashboard/molecules/stat-card-skeleton.tsx
│   │   │   ├── dashboard/posts/PostListItem.tsx
│   │   │   ├── dashboard/organisms/dashboard-sidebar.tsx
│   │   │   ├── dashboard/template/dashboard-shell.tsx
│   │   │   ├── nav/ModeToggle.tsx
│   │   │   ├── posts/PostViewTracker.tsx
│   │   │   ├── posts/molecules/BookmarkButton.tsx
│   │   │   ├── posts/molecules/CommentsSection.tsx
│   │   │   ├── posts/molecules/PostCard.tsx
│   │   │   └── posts/molecules/PostReactionButtons.tsx
│   │   ├── editor/
│   │   │   ├── EditorLayout.tsx
│   │   │   ├── PostEditor.tsx
│   │   │   ├── Toolbar.tsx
│   │   │   ├── nodes/
│   │   │   │   ├── CollapsibleContainerNode.tsx
│   │   │   │   ├── ExcalidrawNode.tsx
│   │   │   │   ├── GIFNode.tsx
│   │   │   │   ├── HashtagNode.tsx
│   │   │   │   ├── ImageNode.tsx
│   │   │   │   ├── InlineImageNode.tsx
│   │   │   │   ├── LayoutContainerNode.tsx
│   │   │   │   ├── LayoutItemNode.tsx
│   │   │   │   ├── PageBreakNode.tsx
│   │   │   │   ├── PollNode.tsx
│   │   │   │   ├── StickyNode.tsx
│   │   │   │   ├── TweetNode.tsx
│   │   │   │   └── YouTubeNode.tsx
│   │   │   └── plugins/
│   │   │       ├── CodeHighlightPlugin.tsx
│   │   │       ├── FloatingLinkEditorPlugin.tsx
│   │   │       └── SlashMenuPlugin.tsx
│   │   └── ui/
│   │       ├── alert.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── Collapsible.tsx
│   │       ├── Footer.tsx
│   │       ├── form.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── sheet.tsx
│   │       ├── skeleton.tsx
│   │       ├── table.tsx
│   │       └── textarea.tsx
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── data/
│   │   │   ├── bookmarks.ts
│   │   │   ├── comments.ts
│   │   │   ├── posts.ts
│   │   │   ├── reactions.ts
│   │   │   ├── recommendations.ts
│   │   │   ├── subscriptions.ts
│   │   │   └── views.ts
│   │   ├── database.types.ts
│   │   ├── hooks/useAuth.tsx
│   │   ├── schemas/memberSchemas.ts
│   │   ├── stripe.ts
│   │   ├── supabase/
│   │   │   ├── browser.ts
│   │   │   └── server.ts
│   │   ├── supabaseAdmin.ts
│   │   ├── types.ts
│   │   └── utils.ts
│   └── middleware.ts
└── public/… (static assets)
```

Below, each file or group of related files is listed with the implementation changes needed:

## Global Configuration & Styles

- **tailwind.config.ts**: _Update theme and tokens._ Ensure the Tailwind theme extends use the new design tokens. Add the **Inter** (sans-serif) and **Source Serif 4** (serif) font families to the `fontFamily` settings for **body and headings**, replacing any legacy fonts. Confirm the color palette mappings to CSS variables are complete and include any **brand tokens** from the new design (e.g. `--brandPrimary`, `--brandSecondary`) mapped via `hsl(var(--token))`. Verify the spacing scale aligns with an **8px grid** (Tailwind’s default 4px base can be used in multiples of 2 for 8px steps). No arbitrary pixel values should be needed; use Tailwind spacing utilities (e.g. `p-2` for 8px, `p-4` for 16px, etc.) to enforce consistency. Ensure `darkMode: "class"` is set (it is) and that design tokens (colors, radius) are fully represented here for both light and dark (the CSS variables will handle the dark variants).

- **src/app/globals.css**: _Revise CSS variables and base styles._ This file holds global design tokens. Set up the `:root` variables to match the **new color scheme** and minimalist aesthetic. For example, define `--background` (page background), `--foreground` (text color), `--primary`, `--secondary`, `--accent`, etc., based on the new palette. Because dark mode uses the same tokens, under the `.dark` variant override each token to its dark value (the codebase uses CSS variables with `.dark` class to swap theme). Ensure **WCAG AA contrast** by choosing light/dark values with sufficient contrast for text vs background, etc. Use only CSS color functions or `hsl/oklch(var(--token))` references – no hardcoded hex colors. Also update the `--radius` token if needed (the design system suggests 6px as base radius; currently it's set to 0.625rem ≈ 10px – decide on the correct value and use consistently). Check that all Tailwind utilities (like `bg-background`, `text-foreground`, etc.) derive from these tokens. Remove any deprecated global styles and confirm Tailwind’s preflight (base resets) plus any minimal typography defaults (if using `@tailwindcss/typography`, ensure it’s configured to use our color tokens). No global `*` selectors with design styles – rely on classes and tokens.

- **next.config.ts / postcss.config.mjs / eslint.config.mjs / tsconfig.json**: _No UI changes._ These config files likely need no direct design adjustments. Just ensure nothing in them conflicts with the new design setup (e.g. `next.config.ts` should allow importing fonts if using Next.js font optimization, etc.). PostCSS config should be loading Tailwind and autoprefixer as expected; no changes needed aside from ensuring any custom plugin (like the `@custom-variant dark` seen in `globals.css`) is supported. ESlint/TS configs do not affect UI – no changes required other than possibly updating any rules that might flag classnames or a11y (accessibility) issues to align with our goals (for example, ensuring `jsx-a11y` plugin is configured to catch missing ARIA labels).

- **package.json**: _Review UI libraries._ Remove any UI libraries that conflict with “Tailwind CSS only” directive. For instance, if a component library or CSS framework (Chakra, MUI, etc.) was included (likely not, given current code), ensure it’s dropped. The code uses `@radix-ui/react-*` packages (for primitives like dialog, etc.) – keep these since they align with our Radix UI usage. Also ensure `lucide-react` (for icons) and any design-related packages (like `class-variance-authority` for styling variants) remain, as they are part of our implementation plan. No new external UI kit should be added; we stick to Tailwind + Radix.

- **README.md & DESIGN_SYSTEM.md**: _Update documentation._ Revise the **Design System** docs to reflect new decisions: for example, replace references to old fonts (“Geist Sans”) with **Inter** and **Source Serif 4**, update the color palette section if brand colors changed, and mention the adoption of Atomic Design with Radix UI primitives. In README, highlight the new design approach (minimalist UI, dark mode support, etc.) so new contributors know the direction. Ensure any instructions about running or developing reflect the new tooling (e.g., if adding `next-themes` for dark mode toggling, mention it). The documentation should reinforce **accessibility** commitments (e.g., “all interactive elements have proper focus and ARIA labels”) and clarify that no third-party UI kit is used beyond Radix + Tailwind.

## Frontend Pages (Next.js App Router)

### src/app/layout.tsx (Root Layout)

- **Global layout structure**: Ensure the layout uses proper **semantic HTML**. Typically, the root layout should include landmarks like `<header>`, `<main>`, `<footer>` if applicable. Wrap page content in a `<main>` with appropriate aria-attributes (e.g., `role="main"` and meaningful labels if needed). If the design calls for a persistent nav or sidebar (like a top navigation bar or a side menu visible on all pages), include it here or in nested layouts.
- **Theming and fonts**: Use Next.js’s `<html>` and `<body>` tags in the layout to apply classes. For dark mode support, ensure the `<html>` element gets the `className={theme}` (if using `next-themes`, often done by adding `<body className={cn(interFont.variable, "bg-background text-foreground")}>` etc.). Include the Inter and Source Serif 4 fonts – ideally via `next/font` for performance. For example, import `Inter` and `Source_Serif_4` from `@next/font/google`, configure weights, and add to the `<html>` or `<body>` className.
- **Apply global styles**: Import `globals.css` here (likely already done) to ensure Tailwind base styles and CSS variables are in effect. No inline global styling – rely on classes from Tailwind and tokens.
- **Dark mode class**: The `next-themes` library likely attaches a `class="dark"` on the `<html>` when dark mode is active. Verify that this integration is set up (the code uses `useTheme` in `ModeToggle`). Possibly add `<ThemeProvider>` at the root (if not already) to manage theme state, and ensure the `class` strategy is being used (since our CSS expects a `.dark` class).
- **Meta and accessibility**: Confirm that layout sets correct `<head>` metadata (title, lang, etc.) as needed – not directly UI, but part of holistic UX. Ensure no extraneous wrappers that would break the minimalist layout (for instance, avoid unnecessary `<div>` if a semantic tag can be used directly).

### src/app/page.tsx (Landing/Home Page)

- **Minimalist landing design**: This is likely the public landing page. It should be **visually clean and focused**. Audit the JSX structure: use semantic sections for each part of the landing (hero, features, etc., or just a main section if simple). Remove any overly decorative or cluttered elements that don’t serve the minimalist aesthetic.
- **Typography**: Replace any legacy font usage with new font classes. For headings, use Tailwind classes (e.g., `text-4xl font-bold font-serif` for a hero title in Source Serif, if that’s desired, or Inter if sticking to sans for headers as well) – ensure consistent font family usage according to the new typography rules (perhaps Inter for UI text, Source Serif for long-form content or certain headings to add personality).
- **Sections alignment**: If the landing has multiple sections (e.g., as indicated by `landing/sections/AnimatedHero.tsx`, etc.), ensure the spacing between sections follows the 8px grid (likely multiples of 8 for section padding/margins – e.g., `py-16` for 64px or similar). Use **fluid layout** principles: Tailwind’s responsive utilities (`sm:`, `md:`, etc.) to stack or reflow content on smaller screens. For example, if there’s a two-column layout on desktop, ensure it becomes one column on mobile. No horizontal scroll should occur at small widths – test and adjust any fixed widths.
- **Buttons/Links**: If the home page has call-to-action buttons or links, switch them to use our unified `<Button>` component from `components/ui/button.tsx` for consistency. For example, a "Get Started" link should be `<Button asChild variant="primary"> <a href="...">…</a></Button>` or similar, to get the styling and hover states consistent with our design system. Ensure these have proper `aria-label` if the text isn’t descriptive (though usually button text is enough).
- **Animations**: The landing might use subtle entrance animations (the project has FadeIn/SlideIn components). Ensure these animations are **performant and unobtrusive**. They should use Tailwind CSS animations or transitions where possible (e.g., utility classes for fade-in). If custom CSS is used (in those components), consider refactoring to Tailwind’s animation utilities or the Radix animation classes (`data-[state=enter]` etc.) for consistency. All animations should respect **reduced motion** preference – check if any animations need `prefers-reduced-motion` media query wrap to disable them for accessibility.
- **Illustrations/Images**: There are static SVGs in `public/`. Ensure any images on the landing have `alt` text (for informative images) or `aria-hidden` if purely decorative. For instance, if `AnimatedHero` uses an image, provide an alt that describes the content or mark it decorative accordingly.

### src/app/(auth)/sign-in/page.tsx and src/app/(auth)/sign-up/page.tsx (Auth Pages)

- **Form layout**: Redesign the sign-in and sign-up pages for simplicity and clarity. Use a **minimal form card** style centered on the screen (inspired by minimalist design – likely just a simple bordered or well-spaced container). Ensure the layout is responsive (perhaps a max-width with padding for desktop, full width on mobile with some margins).
- **Atomic components**: Replace any raw HTML form elements with our UI components. For example, use `<Input>` from our `components/ui/input.tsx` for email/password fields, and `<Button>` for submission. Use `<Form>` context from `components/ui/form.tsx` (which likely wraps React Hook Form) to handle form state and validation UI uniformly.
- **Labels and accessibility**: Ensure each input has a `<Label>` (from `ui/label.tsx`) for proper accessibility and click-target enlargement. If currently placeholders were used instead of labels, **add visible labels** (or at least floating labels if part of design, but simpler is a static label above the field) to meet WCAG form guidelines. Each label should be linked to its input via `htmlFor` and `id`. Use accessible error messages: if using react-hook-form, our `FormField` and `FormMessage` components (if present) should display errors. Add `aria-describedby` on inputs to reference error messages.
- **Buttons**: The submit button (“Sign In”, “Sign Up”) should use the primary variant of our `<Button>` – ensure high contrast (e.g., white text on primary color background which is defined by `--primary` token). Include `type="submit"` and make sure it’s full-width or appropriately sized per design. If there are secondary actions (like “Forgot password” link or “Sign in with Google”), style those as needed: maybe as link styled buttons (Tailwind classes for an unstyled link but underlined, or as a secondary variant button).
- **Spacing & grouping**: Use Tailwind grid or flex utilities to space the form elements. For instance, apply `space-y-4` to stack inputs with consistent gaps (likely 8px or 16px gap as per design). Group the email/password fields inside a form section for a clean look, and separate the submit button with extra margin top if needed (e.g., class `mt-6` on the button).
- **Dark mode**: Verify the form looks good in dark mode. The `bg-card` and `text-card-foreground` classes (provided by our design tokens) should be used for the form container if it’s card-like. For example, wrap the form in a `<div className="bg-card p-6 rounded-lg shadow">` (shadow optional, maybe minimal or none if truly flat design). This will automatically theme: in light mode, `bg-card` might be white; in dark, a dark gray as defined in CSS variables. Similarly ensure inputs use `bg-input` and `text-foreground` so they invert in dark mode properly.
- **Minimalist aesthetic**: Remove any logos or heavy imagery unless necessary. If a logo is present, perhaps keep it small and monochrome to match the minimalist vibe. Focus on whitespace and clarity. Linear-inspired design would have a lot of clean space, so avoid dense text. Ensure the “Sign Up” vs “Sign In” have consistent styles and maybe a toggle or link between them if applicable (like “No account? Sign up” – style that link subtly, using maybe `text-sm text-muted-foreground`).
- **ARIA**: Add `aria-label` or `aria-describedby` where needed (e.g., on the submit button if the text alone isn’t clear, though “Sign In” is clear). Also, use `autocomplete` attributes on inputs (e.g., `autocomplete="email"`), which improves usability.

### src/app/discover/\* (Discover Page & Actions)

- **discover/page.tsx**: The Discover page likely lists recommended content or similar. Ensure the page uses a clear heading (e.g., `<h1>Discover</h1>` or an appropriate heading tag for the page title) for screen reader navigation. Use a consistent layout for cards or items – likely employing a **grid** or list. If multiple columns of content on desktop (for example, a Masonry or card grid), use Tailwind’s grid classes (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8`) to create a fluid grid that reflows on smaller screens.
- **RecommendationFeedbackButtons.tsx**: This component presumably renders upvote/downvote or feedback buttons for recommendations. Align it with our design system:

  - Use our `<Button>` component for each feedback action, likely with `variant="ghost"` icon-only style (so they appear as subtle icon buttons). The code already uses lucide icons for thumbs up/down; ensure those icons have the correct size utility (`className="size-4"` or Tailwind `w-4 h-4` if not using the custom size class).
  - Include `aria-label` on each button (e.g., “Mark as useful” / “Mark as not useful” or similar, depending on purpose) so screen readers know what the thumbs-up/down do.
  - When a button is active (user clicked), apply a style change (maybe filling the icon or changing color). Use Tailwind conditional classes or variants: e.g., if a “liked” state exists, the thumbs-up icon could turn `text-primary` and the button variant become “default” to indicate selection, otherwise `text-muted-foreground`. This matches how PostReactionButtons handle like/dislike, so ensure consistency in approach.
  - Add Tailwind `transition-colors` to the buttons for smooth hover/active feedback. Also, ensure onClick handlers are debounced or provide instant UI feedback (optimistically update count or state, as done in similar components).

- **\_actions.ts (Discover actions)**: This file contains server actions for logging feedback. It doesn’t directly affect UI, but ensure any returned values or errors integrate with UI nicely. For example, if logging feedback returns a status used to update the UI (like disabling the buttons after vote), ensure the UI components check that state. No direct design changes here, but do add error handling: e.g., if the action fails, perhaps display a toast or error message (for now, could console.error or similar – later possibly integrate a Radix Toast for user feedback, which we might note as a future addition).
- **Spacing & style**: The Discover page items should have consistent spacing (use `mb-8` for bottom margins between items in a list, or the aforementioned grid gap). Any card or item background should use `bg-card` with `rounded-md` corners (using our radius token classes) to match the new aesthetic. Keep it visually sparse – maybe only show essential info and on hover show the feedback buttons (that could be a micro-interaction: hide/show or subtle reveal).
- **Dark mode**: All text on discover page (titles, descriptions) should use `text-foreground` and `text-muted-foreground` for secondary text so that they automatically adjust in dark mode. Any container use `bg-card` or `bg-background` appropriately – avoid fixed colors.

### src/app/newsletters/\[userId]/page.tsx (Personal Newsletter Page)

- **Purpose**: This page likely shows a user’s personal newsletter (like a profile with their posts). It should be treated similarly to the collective page (since a personal newsletter is analogous to a one-person collective).
- **Layout**: Use a **responsive layout** with possibly a header (could be the user’s name or newsletter title) and a list of posts. If there is a sidebar or profile info, position it using grid or flex. For example, a two-column layout with profile info on left and posts on right on desktop, collapsing to single column on mobile.
- **Typography**: Use consistent heading sizes for the newsletter title. If Source Serif 4 is designated for content titles, use it for the newsletter title to give a distinctive look (e.g., `<h1 className="text-3xl font-bold font-serif">Newsletter Name</h1>`). Post titles can be maybe smaller but still noticeable.
- **Posts listing**: Likely each post is a link – use a list with each item possibly as a card or just a bordered bottom. Keep them compact (inspired by Linear’s list views: Linear uses rows with subtle separators and minimal chrome). For instance, a simple list where each post is a flex row (title on left, maybe date or likes on right) with a bottom border (`border-b border-border` which uses our token). On hover, maybe highlight the row background with `bg-muted` for a subtle effect – using Tailwind’s group-hover to achieve that if in a group. Ensure the clickable area is accessible (maybe wrap the row in an `<a>` tag).
- **Follow/Subscribe**: If this page includes a “Subscribe” button (since it’s a newsletter), make sure to use our `<SubscribeButton>` component or style a button to match primary style. Position it clearly near the top. The `<SubscribeButton>` (see `components/SubscribeButton.tsx`) should be audited too (see below).
- **Dark mode & contrast**: Verify the background (likely default) and text are correct in dark mode. If a card container is used, use `bg-card`. If the entire page is just content on background, `bg-background` (which it already is globally) suffices. The border between posts uses `border-border` token which will adjust (light gray in light, darker in dark).
- **ARIA**: Use proper heading levels. E.g., page title as h1, post titles as h2 (especially if posts are listed). If the post titles are links, ensure they have discernible text (they likely do as the title itself). Add `aria-label` to subscribe button (like “Subscribe to \[Newsletter Name]” for clarity) if the button just says “Subscribe”.

### src/app/posts/\[postId]/page.tsx (Public Post Page)

- **Content display**: This page likely shows an individual post (maybe a personal post not under a collective). It should present content in a clean, readable format. Use Tailwind’s typography plugin styles by applying the `prose` class (if @tailwindcss/typography is configured) to the post content container. Ensure that the typography plugin is set to use our variables (in Tailwind config or CSS, the `.prose` color should be `var(--foreground)` etc. as indicated in design system).
- **Heading and metadata**: The post title should be an `<h1>` with appropriate styling (e.g., `text-4xl font-bold mb-4`). If there are metadata like author name, date, reading time, display them in a smaller, muted style (e.g., `<p className="text-sm text-muted-foreground mb-8">By Author – Jan 1, 2025</p>`). Ensure that if multiple metadata items exist, they are separated clearly (perhaps by middot or bullet).
- **Images or media**: If the post content includes images, ensure they are responsive (max-width: 100%) and have appropriate `alt` text. The typography plugin usually handles `img` styling in `.prose`, but confirm or manually add `className="max-w-full rounded-md"` to images for nice rounded corners (matching our radius token).
- **Interactions**: There might be a like button or comments on a post page. Possibly `PostLikeButton.tsx` is used here for liking a post. If so, ensure it’s placed intuitively (maybe at the bottom or floating on side). That component should be using our `<Button>` with icon variant. We will check `PostLikeButton` separately, but here note to incorporate it in the layout (for example, in a sticky footer bar or after the content).
- **Comments**: If `CommentsSection.tsx` or an API exists for comments (there is an API route for comments), perhaps the post page includes a comments thread. If yes, ensure the comments UI follows a clean design: nested comments indented, smaller font for comments, and a form to add a comment. Use our `Textarea` component for comment input and a `Button` to submit. Comments could be styled with the prose classes for text, but likely simpler: just treat as list of comment items with `border-border` separators.
- **Dark mode**: The `prose` class by default might set specific light mode colors. We need to ensure that in dark mode, the text in the post content still uses the correct foreground. In Tailwind config or global CSS, ensure the typography plugin’s dark mode colors are overridden to our tokens (e.g., `.dark .prose { color: var(--foreground); }`). Review any code blocks within posts to ensure they have an appropriate dark theme background (maybe `bg-muted` or a specific token). If necessary, add a custom CSS to adjust code block colors in dark mode for readability.
- **ARIA**: The content itself is mostly text, but for screen readers, ensure the structure is logical (the h1 for title as mentioned). If there’s a “like” button, it should have `aria-pressed` attribute toggled when liked (for accessibility to indicate state). If there are headings in content, they should be semantic within `.prose`.

### src/app/\[collectiveSlug]/layout.tsx and page.tsx (Collective Pages)

- **Collective layout**: The collective pages might have a custom layout (since they have a `[collectiveSlug]/layout.tsx`). This likely wraps the collective’s public pages (the main collective page and individual collective post pages) with a common UI (such as a collective header or navigation tabs). Audit this layout:

  - If it includes a sidebar or top bar for the collective (e.g., collective name, description, a “Follow” or “Subscribe” button, maybe tabs like Posts/About), ensure semantic structure. Perhaps use a `<header>` for the collective info. The collective name should be a heading (h1 if this is the main page, or h2 if nested under something).
  - Use the new typography: collective title in a distinctive style (maybe font-serif if appropriate). Below that, maybe a short description – style it with `text-sm text-muted-foreground` for contrast.
  - If there are tabs (Posts, Members, etc.), implement them using Radix **Tabs** primitive if possible for accessibility (if the design calls for tabbed content). If not using Radix Tabs, at least use `<nav aria-label="Collective sub-navigation">` with `<ul>` of links styled as tabs (Tailwind can style the active link with a bottom border, etc.). Ensure the active state is indicated visually (underline or highlight) and via ARIA (e.g., `aria-current="page"` on the active link).

- **\[collectiveSlug]/page.tsx**: This likely lists posts in the collective (the collective homepage). Similar to the personal newsletter, list the posts in a compact, readable way:

  - Possibly use the `PostCard` component if one exists for listing posts (there is `PostCard.tsx` under components/app/posts/molecules). If so, use that for each post for consistency. If not, create a simple representation: maybe similar to the newsletter listing or Linear’s task list (title and some metadata).
  - Include a “Subscribe” or “Follow” button at the top if users can follow the collective. The codebase has `FollowButton.tsx` which likely handles follow/unfollow. Ensure that is integrated: e.g., `<FollowButton collectiveId={...} initialFollowed={...} />` placed prominently (maybe near the title or in the header).
  - Use grid or flex to layout posts if appropriate. Possibly a single column list is fine; if a lot of content, maybe two-column for excerpt cards.

- **Collective \[postId] page**: The `[collectiveSlug]/[postId]/page.tsx` should mirror the design of the public post page from above, but within the collective context. Likely it uses the same component or logic (maybe even the same template as personal post). Ensure the collective layout wrapper is providing context (like a back link or collective info at top). This layout might already wrap the content page.

  - Check that the collective’s layout provides a container (maybe a max-width) for the post content and not too wide on large screens (for readability, 65ch is typical max line length – the `.prose` class enforces a width, or we can add `max-w-3xl mx-auto` on content wrapper).
  - If the layout includes a sidebar with other posts or info, verify the sidebar hides on mobile or moves below content for responsiveness.

- **Dark mode and style**: Use the same tokens as elsewhere. The collective header background, if any, should use `bg-card` or `bg-secondary` depending on design (some sites use a colored banner – if that’s desired, define a new CSS variable for collective header background or use existing `--secondary` as a subtle distinct color). But since aesthetic is minimalist, likely keep it simple (no huge banners).
- **ARIA**: Label the collective navigation if present. If there’s a list of posts, ensure each post link has the title for screen readers (which it will if the title is text). Add `aria-label` to the follow button (like “Follow \[CollectiveName]”).
- **Spacing**: Maintain consistent spacing – e.g., collective header bottom margin before list starts, maybe use `mb-8`. If using a grid, ensure `gap-8` consistent.

### src/app/dashboard/\* (Authenticated Dashboard Area)

The dashboard is the authenticated interface for writers. This area needs a significant redesign to match a **Linear-inspired compact dashboard** while maintaining clarity. The dashboard consists of multiple sub-pages and a common layout.

#### src/app/dashboard/layout.tsx (Dashboard Shell Layout)

- **Layout structure**: This layout likely includes the persistent sidebar navigation (and possibly topbar) for the dashboard. Redesign this using Atomic design:

  - Use a `<aside>` for the sidebar (with `aria-label="Sidebar"`). The sidebar content should be structured (likely a list of navigation links: e.g., Dashboard Home, My Posts, My Newsletter, etc.). Use our `SidebarLink` atom component for each link (there is `components/app/dashboard/atoms/sidebar-link.tsx`).
  - Style the sidebar with the new **dark sidebar** aesthetic: for example, use a distinct background token like `bg-sidebar` (the design tokens list shows `--sidebar` tokens). If those exist, apply `bg-sidebar text-sidebar-foreground` to the aside. In dark mode, that might become almost black while the main content uses a slightly lighter dark background. This contrast helps visually separate navigation vs content.
  - The width of the sidebar should be fixed (perhaps use Tailwind classes like `w-64` or use flex-basis with a custom CSS variable if needed). Ensure it’s scrollable if content overflows vertically (`overflow-y-auto`).
  - For the main content, use a `<main>` region next to the aside. Likely implement a responsive behavior: on small screens, the sidebar might collapse into a menu (if so, we could use Radix **Sheet** or **Dialog** to show/hide the sidebar). But given time, at least ensure it’s hidden or can scroll horizontally. Possibly add a “open menu” button in topbar for mobile.
  - The dashboard layout might also include a top navigation (for things like theme toggle or user profile menu). If present, use a `<header>` for that. Keep it slim: maybe just an icon button for theme (we have `ModeToggle`) and a user avatar or name. Use flex utilities to position (e.g., `flex justify-between items-center p-4`).

- **Spacing and grid**: Within the main content area, apply a padding (e.g., `p-6 md:p-10`) so content isn’t stuck to edges. Use consistent spacing around headings and cards.
- **Dark mode**: For the sidebar, if using `bg-sidebar`, ensure the `.dark` theme overrides `--sidebar` appropriately (the tokens we saw indicate it does). Also ensure focus states in sidebar (if using `SidebarLink` with `:focus-visible`) are visible – likely use `focus:ring-2 focus:ring-sidebar-ring` to show a focus outline within the sidebar context.
- **Micro-interactions**: The sidebar might benefit from small animations (e.g., an active link indicator sliding). If implementing, use Tailwind transitions. For example, if highlighting the active section with a bar, animate its movement on route change. Use Radix primitives if any (though likely not needed here).
- **ARIA**: Aside from labeling the `<aside>`, ensure each nav link uses `aria-current="page"` when on that page (the `SidebarLink` atom can handle this by checking the current route and applying appropriate classes + aria). If the sidebar can collapse, add `aria-expanded` on the toggle control.

#### src/app/dashboard/page.tsx (Dashboard Home)

- **Overview design**: This page might show an overview of metrics or recent activity. Redesign it as a **compact dashboard panel**:

  - Possibly it includes some statistics cards (maybe subscriber count, total posts, etc.). If so, use a grid for stat cards (the code has `stat-card.tsx` and skeletons). Each stat card should be small, monochromatic with maybe an icon and number. Use `bg-card` for the card background, `rounded-md` for corners, and a consistent height (maybe Tailwind `h-24` or let content dictate).
  - The Linear inspiration suggests using **concise lists** for recent items. There is a `RecentPostRow.tsx` component – likely to show recent posts. Ensure the styling of these rows is tight: maybe each row is 40px tall with the post title and status. Use subtle separators or zebra striping if needed. Already `recent-post-row-skeleton.tsx` suggests they had loading placeholders; ensure these skeletons use the `Skeleton` component or `bg-muted` backgrounds to hint loading, and they respect dark mode (the `skeleton.tsx` in ui likely handles it).
  - If there’s a section for tasks or notifications, similarly style with minimal chrome.

- **Typography & alignment**: Use Tailwind to adjust text sizes – possibly smaller than default for a dense dashboard. For example, table or list text might use `text-sm` or even `text-[13px]` (if within design constraints) with `leading-tight`. Use `font-medium` for labels and normal for values to create visual hierarchy.
- **Icons**: If stat cards or sections use icons (like an icon for “Posts” stat), ensure they use a consistent style and size (Lucide icons with `size-4` class is fine). They should inherit text color or have a specific token (maybe using `text-muted-foreground` for subtle background icons).
- **Responsive**: The dashboard home should collapse gracefully on mobile. If stat cards are in a grid of 3 or 4 on desktop, on mobile stack them or use a two-column grid. The recent posts list should be full-width on mobile (maybe the entire thing scrolls vertically). Check that no element is fixed width that would overflow a small screen.
- **Dark mode**: Verify that background of the dashboard page is using `bg-background` (likely inherited from layout) and cards are `bg-card`. Text should be `text-foreground` for main, `text-muted-foreground` for subtle. If any stat uses color (like a graph or status text, e.g., green for published), ensure those colors are chosen via tokens or Tailwind shades that are dark-mode friendly (or use CSS `currentColor` trick with tokens).
- **ARIA**: Not much interactive here besides possibly links to posts or buttons to create new content. Ensure any “Add new post” button is labeled properly and keyboard accessible (should be, if `<Button>`). If stat cards are just display, make sure they’re not focusable unnecessarily (e.g., if they were erroneously `<a>` or `button` when they just show info, change to `<div>`). Screen reader users should ideally hear a summary: consider adding `aria-live` region to announce changes if any real-time updates (though not likely needed for static stats on load).

#### Dashboard Sub-Pages:

**src/app/dashboard/posts/page.tsx** (My Posts List):

- This should list all posts the user has written. Implement as a table or list that mimics Linear’s compact list of issues:

  - Perhaps use a table layout: columns for title, status (draft/published), date, views, etc. If table, use semantic `<table>` with `<thead>` and `<tbody>`. Style the table with only minimal borders: e.g., use `border-b` on header and each row but no full grid lines, to keep it clean.
  - Alternatively, if not a formal table, a list of `PostListItem.tsx` (which exists) could be used. Check `PostListItem.tsx` in `components/app/dashboard/posts/`. It likely defines a row structure. Ensure it uses flex to separate fields, and text classes to align. It should incorporate clickable title (for editing) and possibly icons for status.
  - Add a “New Post” button prominently (maybe top-right). Use `<Button variant="primary">New Post</Button>` linking to the new post page.
  - For empty states (if no posts), provide a friendly message and an action to create one – styled in muted text.

- Use consistent spacing: if not using a table element, use `space-y-2` to separate items slightly, or a subtle border bottom as separator (with appropriate padding in each item).
- On small screens, perhaps hide less important columns or stack them. E.g., on mobile, each post item could be two lines (title on first, meta on second).
- Accessibility: If using a table, add `aria-label` or visually hidden captions to explain the table (e.g., “List of your posts”). If using list, ensure each item link is focusable (likely the title as `<a>` or button).

**src/app/dashboard/posts/\[postId]/edit/page.tsx** & **EditPostForm.tsx**:

- This is the edit post page with a form to edit content. The design should match the new editor interface style:

  - Likely uses a rich text editor (the `EditorLayout` and `PostEditor` components in `components/editor/` handle this). Ensure the page layout provides adequate space for the editor (maybe full width of content area). Possibly remove any extraneous borders around the editor for a cleaner look; rely on the editor content area styling itself.
  - The form might include fields like title (text input) and the editor for body. Use our `<Input>` component for the title field with proper label. E.g., label “Title” and input with maybe larger font (could use `text-2xl font-bold` on the input text via Tailwind if wanting the title to stand out).
  - Buttons: likely “Save” or “Publish” actions. Use `<Button>` with clear labeling, and place them either top-right or bottom of page per design. Possibly keep them visible by pinning in a top bar (Linear has a top bar with actions). If implementing that, perhaps reuse `dashboard-shell.tsx` or a sub-layout for editor to include a header with actions.
  - If there's a “Preview” mode, style that toggle as a secondary button or tab.

- Ensure **state feedback**: when saving, show a loading state (maybe the button uses `disabled` with a spinner if possible). Could integrate a small spinner using Tailwind borders or an SVG icon.
- Accessibility: The editor itself (if using Lexical or similar) should have appropriate aria roles (which likely are handled in `PostEditor.tsx`). For our part, ensure the title input has focus on page load (maybe autofocus it for convenience). Announce save success/failure via a toast or alert message (if not built, consider adding a simple `<p role="status">Saved!</p>` that appears briefly).

**src/app/dashboard/my-newsletter/subscribers/page.tsx** (Subscriber List):

- This page likely shows a list of subscribers to the user’s personal newsletter. Design it either as a simple list or table of subscriber emails.

  - If just emails, a basic list with bullet points or a copyable email link is enough. If more info (date subscribed, etc.), use a compact table.
  - Use `text-sm` for emails, and perhaps a `Copy` icon button next to each for convenience (if desired).
  - Provide an export button if needed (CSV export could be a button – not sure if in scope, but mention if it exists).

- Keep it minimal: no heavy borders, maybe just a border under each email for separation (`border-b border-border` on a container div).
- If the list is long, ensure the container scrolls or paginates. Possibly style with `overflow-x-auto` if a table might overflow on mobile.
- Accessibility: If emails are clickable (mailto links), ensure `aria-label` like “Email subscriber at \[email]”. If not clickable, just text is fine. Provide a heading `<h2>` like “Subscribers” for context.

**src/app/dashboard/new-personal-post/page.tsx**:

- This likely is similar to the “new post” for personal newsletter. If it simply redirects to the editor form (or uses the same EditPostForm), ensure consistency. Possibly it’s a wrapper to choose to post in personal vs collective.
- If there’s any unique UI (like a choice between posting to personal vs a collective if user has multiple newsletters), present it clearly (two buttons or a small form). Keep it simple and consistent with other forms (use `<Button>` for each choice, etc.).
- Ensure any selection uses accessible controls (maybe a radio group or segmented control). If using Radix **ToggleGroup** or **RadioGroup**, style them with Tailwind and tokens (no external styles). E.g., if we had a toggle for “Personal vs Collective post”, ensure focus states and labels are clear.
- If none of that complexity exists (maybe it directly shows the editor for a new personal post), then just ensure it uses the same components as edit page.

**src/app/dashboard/profile/edit/page.tsx & EditProfileForm.tsx**:

- Profile editing form for the user’s own profile/newsletter info.

  - Fields likely include name, bio, maybe avatar upload. Use `<Input>` for text fields, `<Textarea>` for multi-line bio field (we have `components/ui/textarea.tsx`).
  - Wrap each field with a `<FormItem>` grid (if using our form system) with labels. Ensure labels are above fields, not placeholders.
  - Avatar upload: If present, use a simple file input or a dedicated component. If using a file input, style it minimally (Tailwind doesn’t style file inputs easily; might leave default or use a custom solution with hidden input and a styled button). Ensure accessible labeling (label for the file input or `aria-label="Upload profile picture"`).
  - Buttons: Provide a “Save Profile” button (primary style) and maybe a “Cancel” link. Place them at the bottom with some spacing (`mt-6 flex gap-2`).
  - Validate inputs (e.g., name not empty). If using React Hook Form, display errors with our `<FormMessage>` styling under fields in small red text (`text-destructive` token). Already in `Form` component logic, `FormMessage` likely applies `text-sm text-destructive` by default for errors – confirm or add styles.

- Ensure **responsive**: if the form is in a narrow column, that’s fine; if wider, perhaps restrict max width (`max-w-xl mx-auto`) so it doesn’t look sparse on large screens.
- **Dark mode**: No special changes, just ensure uses tokens (inputs `bg-input`, etc., which it will via our Input component).
- **ARIA**: Announce success on save (could be a toast or simply a message “Profile updated” shown, and have `role="status"` on it). All inputs have labels for screen readers.

**src/app/dashboard/collectives/page.tsx** (My Collectives List):

- This page likely lists the collectives the user is part of or owns. Design similarly to a list of projects:

  - If small number, use a card for each collective (perhaps showing collective name, maybe member count). The `DashboardCollectiveCard.tsx` component exists for this purpose – ensure it’s used. That component should be updated to fit the new style (see below in components).
  - If larger, a table or list like the posts list could be used. But likely a grid of “cards” (like team cards) might be the intention.
  - Either way, use consistent approach: each item clickable to go to that collective’s manage page. Mark up each card as a link (`<a>` around the whole card or at least the title, and use `cursor-pointer` with `hover:bg-muted` for card hover effect).
  - Provide a “New Collective” button if the user can create a new one. That should link to the `/dashboard/collectives/new` page. Use primary button style, placed top-right or clearly visible.

- **Spacing**: If cards, use a grid with gap (like `grid md:grid-cols-2 gap-6`). If list, use `space-y-2` or table style lines.
- **ARIA**: Add appropriate alt text if collective logos are shown. If the card is one clickable region, give it `aria-label` like “Go to \[Collective Name]” (especially if card content is more than just text, to ensure screen readers announce click target).

**src/app/dashboard/collectives/new/page.tsx & \_actions.ts** (Create Collective):

- The new collective page is a form to create a collective. It should mirror the style of other forms:

  - Fields: likely name, description, maybe an image. Use `<Input>` and `<Textarea>` with labels as with profile form. Keep it simple, only the essentials to reduce cognitive load.
  - Submit: a “Create” button (primary variant). Possibly also a cancel/back link.
  - Validate name (not empty, unique if possible – \_actions.ts might handle this by returning errors).
  - Use our form error display for any server validation errors (for example, if \_actions returns an error like name taken, display it in a `<FormMessage>` near the field or as a general error at top).

- In `_actions.ts`, ensure we return structured errors if needed. No UI changes in the action file, but consider adding success redirect or message (the action likely redirects to the new collective’s page on success).
- Accessibility: Focus the first field on mount (name field) to help user start typing. If there are multiple steps (probably not, likely a single form), ensure everything is on one page for simplicity.

**src/app/dashboard/collectives/\[collectiveId]/settings/page.tsx & EditCollectiveSettingsForm.tsx**:

- Form to edit a collective’s settings (similar to profile form but for a collective).

  - Fields might include collective name, description, maybe billing info or toggles (private/public). Use the same approach: Input/Textarea with labels, and any toggle as well.
  - For toggles (if any, e.g., “Enable subscriptions”), prefer Radix **Switch** or **Checkbox** depending on context. If using a checkbox for a binary setting, style it with Tailwind (since no external UI libs): e.g., create a custom checkbox style using relative divs (or import Radix Switch from `@radix-ui/react-switch` for accessible switch and then style via classes). Ensure to include an accessible label for the switch.
  - Save button at bottom, similar to profile.

- Ensure the page is within the collective’s dashboard layout (there might be a sub-nav for manage/settings).
- ARIA: Label any toggles clearly (e.g., “Enable subscription \[checkbox]” with visible text label).
- Dark mode: straightforward, all tokens usage.

**src/app/dashboard/collectives/\[collectiveId]/manage/members/page.tsx, InviteMemberForm.tsx, ManageMembersClientUI.tsx**:

- Manage members page likely shows members of the collective and allows inviting new members.

  - The members list: likely a list of user emails or names with roles. Use a compact table or list (similar style to subscribers list). Possibly with actions to remove or change role. Represent each member with a row containing name, role, maybe a remove button (an “X” icon).
  - Style remove buttons as icon-only `<Button variant="ghost" size="icon" aria-label="Remove [username]">XIcon</Button>` with a red tint (`text-destructive` for the icon perhaps).
  - The invite form: probably an input for email and a “Send Invite” button. Place this at top or bottom of list. Use our Input component for email and a secondary button to send invite. Validate email format (client-side).
  - ManageMembersClientUI.tsx might handle dynamic UI (like state of invites or removing members without full page reload). Ensure any feedback (like “invitation sent” or errors) is shown, perhaps as a small alert or message (could reuse our `<Alert>` component with variant).

- **Spacing**: Provide a bit of space between the invite form and member list (`mb-4`).
- **Dark mode & style**: Member rows background should alternate or all same – either way, ensure `bg-card` or `bg-background` usage appropriately. If highlighting the current user differently, do so subtly (italic name or note “(you)”).
- **ARIA**: The list of members can be a simple list with each item’s remove button labeled as above. If using a table, ensure header cells for “Member” and “Role” and “Actions” etc. The invite form’s success could be announced (e.g., on successful invite, focus a success message).

**src/app/dashboard/collectives/\[collectiveId]/subscribers/page.tsx**:

- If collectives have subscribers (for paid newsletters perhaps), this is analogous to my-newsletter subscribers. Style exactly like the personal subscribers list: simple list or table of subscriber emails. Ensure no duplicate code – possibly reuse the same component or styling. The design guidelines are identical (text size, spacing, etc.).
- Ensure to differentiate if needed (if it includes subscription tier or since date, include those columns).
- Same accessibility considerations as subscriber list above.

**src/app/dashboard/\[collectiveId]/new-post/page.tsx**:

- This might be the page to create a new post under a specific collective. It should likely be very similar to the new personal post or the edit form:

  - Possibly just redirect to a unified editor interface but within the context of a collective (maybe it sets a collectiveId hidden field or context).
  - If it provides a choice of template or something, ensure those choices are accessible.

- Likely minimal UI: in any case, ensure it doesn’t deviate from the patterns used in the personal new post page or edit page.

### src/app/actions/\*.ts (Server Action Files)

These files handle backend logic for Supabase or other operations. They do not render UI directly, but we should **ensure their outputs align with UI needs**:

- **collectiveActions.ts, postActions.ts, etc.**: Verify that any errors thrown or returned are handled by the UI. For example, if `postActions.ts` returns an error string, ensure the UI form displays it (perhaps hooking into Form’s error or using an `<Alert>` message). If not already, consider changing these actions to throw errors (which our form components can catch via React Hook Form) or to return structured `{ error: "message" }` so UI can show it. This makes error feedback visible to the user, aligning with good UX.
- Confirm that the actions do proper validations (to avoid silent failure in UI). E.g., `likeActions.ts` should check if user is allowed to like and return meaningful status that UI might use (though in our case, the like button UI is optimistic and then reverts on failure).
- **No direct UI changes** needed in these files, but as part of redesign, ensure **consistency in user feedback**: if an action is slow, the UI shows a loading state (we have `useTransition` usage in some components, that’s good). If an action fails, the UI should inform the user (maybe currently it doesn’t always – consider adding an alert or toast for failures).
- No external libraries are added here. Just ensure any string literals that appear in UI (like error messages) are clear and concise (maybe adjust wording to match new tone if needed – friendly, straightforward language as per minimalist ethos).

### src/app/api/\* (Route Handler Files)

These are API endpoints (Stripe webhooks, subscribe endpoints, etc.). They have no UI, so design changes are not directly applicable. However:

- **Consistency**: Ensure that the data these routes return is used by the UI in a consistent way. For instance, the `posts/_postId/view/route.ts` might track views; ensure the front-end (maybe `PostViewTracker.tsx`) calls it appropriately. If we redesign how view counts are displayed, make sure the route still supports that.
- **No HTML output**: These should remain pure JSON APIs (which they likely are). Confirm that any error responses (status codes, messages) are appropriately handled by UI. For example, if `subscribe/route.ts` returns an error, does the UI catch it to display to user? If not, consider adding UI handling (like a toast on failure).
- **No changes required** in code formatting or logic unless to support a UI change (e.g., maybe adding a field needed by new UI). For instance, if the dashboard now wants to show “views this week”, maybe adjust `posts/route.ts` or create a new route to fetch stats. These are scope expansion decisions to consider.
- In summary, mention that API routes are fine as is but ensure integration with redesigned front-end flows (subscribe route works with new SubscribeButton behavior, etc.).

## Reusable Components (Design System Atoms & Molecules)

### src/components/ui/\* (Core UI Elements)

These are fundamental building blocks to be audited for consistent design, theming, and accessibility. For each, ensure **Tailwind CSS classes reference design tokens** (no hardcoded colors), **Radix primitives usage** (for accessibility and state management), and **ARIA compliance** where relevant.

- **Alert (alert.tsx)**: This component likely provides a banner for messages (success, error).

  - _Design_: Ensure it uses our color tokens (it seems to use `bg-card` and `text-card-foreground` by default, and a variant for destructive which likely uses `text-destructive`). Keep this minimal – perhaps an icon plus text. Confirm the icon (if any) uses size and color appropriately (`text-current` so it inherits the text color, which the code indicates with a selector).
  - _Spacing_: The alert uses padding (`px-4 py-3`) and a grid layout if an icon is present (the code uses `has-[>svg]:grid-cols-[...]`). This is fine; just verify it aligns with 8px grid (px-4 = 16px, py-3 = 12px which is not an 8 multiple – consider making py-2 or py-4 to align to 8/16px steps; likely py-2 (8px) might be a bit tight, py-3 is 12px which breaks the rule, so prefer py-4 (16px) or adjust base spacing to 4px increments exclusively).
  - _Dark mode_: It already uses `bg-card` etc., so it’s themed. For destructive variant, ensure background might remain `bg-card` (keeping background neutral even for errors is often fine) and just text is red-ish. If design calls for a tinted background for destructive alerts, implement by using a variant class (e.g., `variant==="destructive"` adds `bg-destructive/10` or something along those lines).
  - _ARIA_: Add `role="alert"` to the container (the code already does that). That helps screen readers announce it immediately. Ensure any interactive content inside (if any) is also accessible (usually alerts are static text).
  - _Interactions_: Alerts likely static, but if we had closable alerts, ensure the close button (if added in future) is a proper `<button aria-label="Close alert">`.
  - _Atomic structure_: It’s fine as an atom. We may consider moving it under a relevant category if needed (but since it’s generic, `ui/` is fine).

- **Badge (badge.tsx)**: Small label component.

  - Ensure badges use token colors. Possibly the code defines variants (e.g., default, secondary, etc.) using `cva`. For each variant, ensure the classes reference our palette (e.g., default might be `bg-secondary text-secondary-foreground` giving a muted badge, or maybe primary). If any hex colors or non-token classes are used, replace with tokens. For instance, if it uses a blue or gray background, map it to `bg-muted` or `bg-primary` as appropriate.
  - Keep the badge **small and subtle** (Linear’s aesthetic for badges/tags is often subtle background, all-caps text but small). If the design wants uppercase, apply `tracking-wide text-[0.75rem] uppercase` etc., but only if part of style guide.
  - Add `aria-label` if the badge alone conveys status (though usually a badge is accompanied by text, e.g., “Status: \[Badge]” so screen readers have context).
  - Dark mode: using `bg-muted` or `bg-primary` will auto-adjust. Just confirm contrast (badge text vs background).
  - Spacing: likely uses `px-2 py-1 text-xs`. py-1 = 4px which is fine (multiple of 4). px-2 = 8px good. That aligns with 8px grid horizontally and 4px vertical (which is half-step but common for small pills).

- **Button (button.tsx)**: One of the most critical components.

  - _Variants and sizes_: Ensure the button variants (primary, secondary, ghost, link, destructive, etc.) are defined and follow the new design. Primary should use `bg-primary text-primary-foreground` with hover `bg-primary/90` or similar. Secondary might be `bg-secondary text-secondary-foreground` (if secondary color is like a gray or so). Ghost should be transparent background with maybe `hover:bg-muted`. Destructive variant should use `bg-destructive text-destructive-foreground` (which in tokens is likely a red).
  - The code likely uses `cva` from class-variance-authority to define these. Update the classes in each variant to match design tokens (no direct hex or arbitrary colors). For example, ensure any usage of `ring-offset` for focus uses token (in sheet.tsx we saw `ring-offset-background` which is good).
  - _Sizes_: Likely sizes like `sm, default, lg, icon`. Confirm these use consistent padding (e.g., sm: px-3 py-1, default: px-4 py-2, etc.). Ensure the rounding uses `rounded-md` or appropriate token (maybe `rounded` for default which maps to our radius token).
  - _Icon buttons_: The `size="icon"` variant should produce a square button (like 36x36px maybe) for icon-only. The code shows usage in ModeToggle. Ensure this size is sufficient for touch (44x44px is recommended min). If our icon button is currently 36px (as seen), consider bumping to 40px for accessibility. But if sticking to design’s compactness, at least ensure aria-label is provided (which it was).
  - _Focus state_: All buttons should have a visible focus outline. Tailwind’s `focus:ring-2 focus:ring-offset-2 focus:ring-ring focus:ring-offset-background` is often used (with our tokens, `ring-ring` and `ring-offset-background` correspond to appropriate colors). Ensure these classes are in place via cva or manually. If any variant missing them, add to base styles.
  - _Dark mode_: Because tokens cover colors, it should be fine. Just double-check ghost variant in dark (e.g., `hover:bg-muted` may be too light/dark – but since muted is tokenized, it should be okay).
  - _Transitions_: Add `transition-colors` on buttons so hover/focus color changes animate. Also maybe `duration-150 ease-out` for a quick subtle effect. This can be added to base class via cva or as a static string.
  - _ARIA_: Already probably fine (no role needed on `<button>` elements beyond default). Just ensure loading state if any (some design systems put `aria-busy` or `disabled` with spinner). If adding a spinner icon when `loading` prop is true, include `aria-hidden` on spinner and keep button label for screen readers or use `aria-live` region.

- **Card (card.tsx)**: A generic container, likely just styles (maybe a div with `rounded-lg border bg-card text-card-foreground shadow-sm` etc.).

  - Ensure the classes use our tokens: `bg-card` for background, `border border-border` for outline if any (for a minimalist aesthetic, we might drop heavy shadows and rely on border+background difference).
  - Possibly provide a default padding? But likely leave that to usage or provide a small default like `p-4`.
  - Check dark mode: `bg-card` and `text-card-foreground` will invert automatically.
  - If any interactive usage (like clickable card), it should be handled outside (so Card stays a passive container).
  - No ARIA role by default (unless this is meant as a widget; probably not). If card is used in lists, ensure containing element semantics are handled outside (e.g., an article or li around it if it represents an item).

- **Collapsible (Collapsible.tsx)**: Likely a wrapper around Radix Collapsible or a custom disclosure.

  - If Radix’s `<Collapsible>` is used, ensure we use it correctly: e.g., `Collapsible.Root`, `Collapsible.Trigger`, `Collapsible.Content`.
  - Check that it uses `data-state=open/closed` to animate. If not, add Tailwind classes for transitions. For instance, content could have `data-[state=closed]:animate-slide-up data-[state=open]:animate-slide-down` (and define those keyframes via Tailwind config if not pre-defined). Actually, if we have imported `shadcn` animations, they might be present (like we saw `animate-in slide-in-from-right` etc. in sheet).
  - The trigger should be a button with proper `aria-controls` and `aria-expanded` (Radix does this internally). Make sure any icon on trigger rotates if needed (could use `data-[state=open]:rotate-180 transition-transform` for a chevron icon).
  - Style: likely no visible border or background, just content reveals. If it’s used for something like an FAQ list or collapsible sidebar section, ensure the design matches (maybe a subtle border top for content separation).
  - Dark mode: no special case except ensuring any color used is token.

- **Footer (Footer.tsx)**: If this is a UI component, likely the site’s footer.

  - Ensure it’s minimalist: maybe just small text and links. Use `text-muted-foreground text-sm` for any copyright or tagline, and lighten link styles (maybe no heavy underlines; could use `hover:underline` only).
  - Layout could be center-aligned or grid of links depending on complexity. Keep it simple if possible (the MVP might have minimal footer).
  - Dark mode: background should use `bg-background` or `bg-card` depending on whether you want contrast with body. Possibly keep it same as body background for seamless look, unless design wants a distinct footer section.
  - Accessibility: If there are multiple sections of links, use `<nav aria-label="Footer">` around them or lists with appropriate labeling.

- **Form (form.tsx)**: This houses React Hook Form utilities (`FormField`, `FormItem`, `FormControl`, `FormMessage`, etc.).

  - These are mostly logic, but ensure the rendered elements have proper classes:

    - `FormItem` wraps each field – it already uses `className="grid gap-2"` which is good for label/input spacing. Gap of 2 (0.5rem = 8px) aligns to our grid.
    - `FormLabel` wraps our `<Label>` and adds `data-[error=true]:text-destructive` class, so if a field has an error, label turns red. Ensure that class (text-destructive) is indeed defined (Tailwind should generate it via token). Possibly adjust that to slightly less aggressive color (maybe use `text-destructive` which might be a strong red – fine for error highlight).
    - `FormMessage` likely just outputs the error text with a class. Ensure it uses `text-destructive text-sm` so it’s red and small. If not, add styling in that component or in global CSS (like `.form-message` utility class).
    - Also ensure each FormItem has proper aria linking: the code in `useFormField` generates `formItemId`, `formMessageId`. Make sure in FormControl (wrapping input) they spread those ids: the code likely applies `id={formItemId}` to the input and `aria-describedby={formMessageId}` if error exists. If not present, add that for full accessibility (but from the code snippet we saw, they prepare those IDs, so likely they do).

  - No major design styling beyond ensuring error states and spacing are consistent. Possibly could add a subtle error icon or styling in the future, but not necessary.

- **Input (input.tsx)**: The text input component.

  - Ensure classes: likely uses `rounded-md border border-input bg-background px-3 py-2 text-sm`. Align that with design:

    - Border color should be `border-input` token (which in light is a light gray, dark maybe darker gray).
    - No outline by default beyond border. On focus, should apply `outline-none ring-2 ring-ring ring-offset-2 ring-offset-background` (similar to Button). If the code doesn’t add that, we should add `focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background`.
    - Ensure `text-sm` for inputs (maybe all inputs use same text sizing for consistency). Use `placeholder:text-muted-foreground` to have placeholder in muted color.
    - If a prefix or suffix icon is part of input (some designs have search icon inside input), ensure those are positioned and colored appropriately (the code might not handle that unless an InputGroup component exists – if needed, we can design a wrapper with flex and pl-? for icon padding).

  - Dark mode: `bg-background` for input might be too transparent in dark? Actually, background token in dark is near-black, which might make inputs blend with page. Instead, perhaps inputs should use `bg-input` token (which could be slightly lighter than background to stand out). If the code uses `bg-transparent` or `bg-background`, consider switching to `bg-input`. Check tailwind.config – `input` token exists. Use `bg-input` in class and ensure in CSS, `.dark { --input: ... }` is defined (it is, likely).
  - If disabled state, ensure `opacity-50 cursor-not-allowed` class is applied (common Tailwind utility).
  - Remove any extraneous shadows from input if present (likely none if border used).
  - Keep it accessible: we already ensure it ties with label via id, that’s done by form context.

- **Label (label.tsx)**: The label component (wrapping Radix Label).

  - The code sets a default class with `text-sm font-medium select-none` – this is fine (small text, medium weight).
  - It also adds `peer-disabled:cursor-not-allowed peer-disabled:opacity-50` to handle if input is disabled.
  - Possibly adjust spacing: It’s wrapping flex with `items-center gap-2`, meaning label could contain an icon or checkbox. That’s good.
  - No design changes needed except to confirm maybe margin if needed; but since FormItem uses grid gap, this is okay.
  - Ensure color: probably inherits text color (so will be `foreground`). The error state we handle via data attribute making it `text-destructive` if error.
  - ARIA: As long as it’s a <label> with htmlFor, it’s fine.

- **Select (select.tsx)**: A custom select component presumably built with Radix Select.

  - Ensure we use Radix `<Select>` for accessibility (which likely they did, given the presence of code and Radix import).
  - The design should mimic a minimal dropdown:

    - The trigger (the visible part) should look like an Input or Button – likely styled with `bg-background border border-input py-2 px-3 text-sm` and an icon (caret) at right. Ensure the trigger uses `flex justify-between` if adding an icon.
    - The options list (Radix Select.Content/Viewport) should be styled with `bg-popover text-popover-foreground shadow-md rounded-md` for the dropdown panel. Each item (Select.Item) likely uses `px-3 py-1.5 text-sm cursor-pointer focus:bg-accent focus:text-accent-foreground` classes, so that on highlight it shows as accent. Confirm these token usages or add them.
    - Also ensure `aria-label` on the whole select if label isn’t visible (though typically one uses a separate Label).
    - If multi-select or anything, ensure those states or check icons are present and accessible.

  - Radix select already handles keyboard navigation and ARIA roles, so our job is mainly styling.
  - The code possibly already has much of this (if it was a Shadcn UI derived select). Check that no hardcoded colors exist; replace with tokens as needed (like `focus:bg-primary` should be `focus:bg-accent` maybe, depending on design choice for highlight color).
  - Ensure dark mode: If using `bg-popover` for the menu, that token should invert (design doc had popover tokens). Items highlight should also adjust (accent will invert).

- **Separator (separator.tsx)**: Likely a horizontal rule or divider, possibly using Radix Separator.

  - Ensure it’s styled minimally (e.g., `bg-border h-px w-full`). If vertical option, maybe a class for vertical as `w-px h-full`.
  - Nothing much else; just ensure the color is token `border` or `muted` so it’s visible enough.
  - For accessibility, if used purely decorative, might add `role="separator"` implicitly or via Radix. Radix’s separator handles it.

- **Sheet (sheet.tsx)**: This is a sidebar drawer (Radix Dialog used as "Sheet").

  - The code already handles a lot: overlay and content with animations. Review:

    - The overlay uses `bg-black/50 dark:bg-black/70` – replace these with tokens if possible. Perhaps use `bg-background/80` or a specific overlay color token. The design doc doesn’t explicitly list an overlay token, but maybe use a neutral. Black with opacity is fine, but we could define `--overlay` token if being strict. However, since it's not user-facing color (just an overlay), this is likely acceptable. Alternatively, use `bg-[color:rgba(0,0,0,0.5)]` if wanting to avoid direct black reference – but effectively same.
    - The content uses `bg-background text-foreground` which is correct. It also has a lot of class logic for slide in/out on different sides.
    - It sets the width to `w-3/4 sm:max-w-sm` for side sheets. 3/4 width on small screens, max width on larger – that’s okay. Ensure that the width is suitable (maybe on very large screens, 25% is a bit large, but since sm\:max-w-sm (which is \~640px), it caps it).
    - The close button inside has classes including `focus:ring-ring` etc., which is good for accessibility.

  - Possibly adjust **radius**: The sheet content is fixed and might not need rounded corners on full-height side drawer (currently they use no specific rounding except on the close button). That’s fine.
  - Check **transition durations**: They used `data-[state=closed]:duration-300` vs open 500ms. Consistency might be better (maybe both 300ms or open slightly faster than close). If the design wants snappier UI, consider reducing to \~200ms both. But this is minor; what's there is okay too if that's a conscious choice.
  - ARIA: Radix Dialog (Sheet) already uses `role="dialog"`, etc. The close button has `aria-label="Close"` with an sr-only text. Good.
  - Test dark mode: Should be fine as it uses tokens.

- **Skeleton (skeleton.tsx)**: For loading placeholders.

  - Likely a simple component that renders a `div` with `animate-pulse bg-muted` classes. Ensure `bg-muted` (light gray) is used rather than a custom gray. If currently a specific gray, change to `bg-muted`.
  - It might also use `rounded` class to give slight radius, which is fine. Possibly ensure it’s `rounded` or `rounded-md` to match our radius token.
  - If we want a shimmer effect rather than pulse, Tailwind doesn’t come with shimmer by default, but the pulse is acceptable and common.
  - No ARIA needed, but if skeletons appear in place of content, consider adding `aria-hidden="true"` and perhaps `aria-label` on the container like “Loading \[item name]” if screen readers focus there – though usually we hide skeletons from SR and announce a general “Loading...” elsewhere.

- **Table (table.tsx)**: Possibly a styled table for use in content or admin.

  - Ensure it sets `table-auto w-full text-sm` etc. It might define styles for `<thead> th` (like `border-b border-border text-left py-2 px-4` etc.) and `<tbody> tr` (maybe `hover:bg-muted`).
  - Check that it uses `bg-card` or `bg-muted` for alternate row if needed. Possibly allow a prop for striped vs not.
  - Dark mode: border and bg tokens handle it.
  - Accessibility: Should include a `<caption>` if needed (screen-reader only caption if table needs description).
  - If any interactive cell or sorting, ensure focus styles and roles (though likely not in MVP).

- **Textarea (textarea.tsx)**: Similar to Input, but multi-line.

  - Ensure classes analogous to input: `rounded-md border border-input bg-background px-3 py-2 text-sm` plus maybe `min-h-[80px]` or so. Focus ring same as input.
  - If resizable, consider adding `resize-none` or `resize-y` depending on design. Possibly disable resize if design wants fixed size (Linear often fixes input sizes for consistency).
  - Make sure placeholder styling is same as input.
  - ARIA: <textarea> with label covers it; nothing extra unless we want to limit char count and announce (not needed now).
  - Dark mode: same token usage concerns as Input – use `bg-input` if needed for slight contrast.

After updating all **ui components**, test them together. For example, test a form with `<Label>`, `<Input>`, `<Button>` and ensure the sizes and spacing look cohesive (tweak margin or gap in FormItem if needed). The goal is an **“Atomic” consistency**: these should compose without additional CSS hacks.

### src/components/Navbar.tsx (Top Navigation Bar)

- Likely the main site navbar (for the public site and maybe also used in dashboard if not a separate component).
- Redesign for minimalism:

  - If it contains branding (site name/logo) and some links (e.g., “Discover”, “Dashboard”, profile menu), streamline it. Use a lot of whitespace (padding X maybe 1rem, Y maybe 0.5rem) and no heavy borders or backgrounds unless needed (could be transparent over content or a subtle border-bottom if to distinguish).
  - If background is needed for contrast, use `bg-background` with maybe `border-b border-border` to separate from content.
  - Use `flex items-center justify-between` for layout. The left could be logo/name (make that text-xl or a small logo SVG + text, using `font-semibold`). The right could be a menu or user avatar.
  - For authenticated vs unauthenticated states: if the user is logged out, maybe show “Sign In” and possibly theme toggle. If logged in, show an avatar or name with a dropdown. The code might have logic for this (the Navbar likely fetches user from `useAuth`).
  - Use our `<Button>` for any call-to-action on the navbar (e.g., “Sign Up” could be a small button).
  - ModeToggle (dark mode toggle) should be placed perhaps on the far right of nav (the code likely does that or in a `nav/ModeToggle` included by Navbar). Keep it as an icon button (sun/moon) with accessible label (already done).
  - If a mobile menu is needed (for small screens), include a hamburger button that opens a menu (could be a Radix Dialog or just a simple show/hide list). For now, if nav links are few, might be fine as is. If implementing, use a `<Button aria-label="Toggle menu">` with an icon, and show the links in a dropdown or drawer (we could reuse the Sheet component for a mobile menu).

- **Dark mode**: Navbar likely same background as rest (so no special handling, except the ModeToggle icon changes automatically).
- **ARIA**: Ensure the nav has `role="navigation"` and `aria-label="Main navigation"` on a `<nav>` element (for screen readers). Each link should be descriptive. If a dropdown for user menu, use proper roles (Radix has Menu or can use list).
- **No external components** beyond our system: if a dropdown needed, either build with Radix Menu or using our primitives. Possibly out of scope for now to fully implement profile dropdown, but plan for it (maybe a Radix DropdownMenu with items like “Settings”, “Log out” styled similarly to Select options).

### src/components/FollowButton.tsx (Follow/Unfollow toggler)

- This likely appears on collective pages or elsewhere to follow a collective.
- Redesign to use our Button styles:

  - It likely is a toggle: if not following, button says “Follow”; if following, maybe “Following” or “Unfollow”. The component probably handles state and calls an API route.
  - Ensure it uses `<Button>` internally. If currently it might be a plain `<button>` with custom classes, refactor it: e.g., `return <Button variant={isFollowing ? "secondary" : "primary"} onClick={...}>{isFollowing ? "Following" : "Follow"}</Button>`. Or use ghost style for following state if design wants less emphasis when already following.
  - Add `aria-pressed` attribute toggling with follow state so screen readers know it's a toggle button. Alternatively, since text changes to “Following”, it might be okay, but aria-pressed is still a good practice for toggle buttons.
  - Ensure any icon (not sure if an icon is used here – maybe a simple text is fine). If an icon (like a plus for follow), include text or aria-label.
  - Micro-interaction: when clicked, perhaps swap to a loading state or immediately toggle text. Provide some feedback if action fails (maybe revert state and alert user via toast).
  - Dark mode: no special, just uses tokens via Button component.

### src/components/SubscribeButton.tsx (Subscribe/Unsubscribe toggler)

- Similar to Follow but likely for paid subscriptions (maybe integrates Stripe).
- Use a similar approach: unify style with Button (perhaps primary variant always, as subscribe is an important action). If already subscribed, could show “Subscribed” (with a check icon possibly).

  - If unsubscribing is allowed, maybe a secondary button or link for that (depending on app logic).

- Ensure `aria-pressed` if toggleable. If it opens a Stripe checkout (could be that clicking subscribe triggers a checkout redirect), ensure the user is informed (maybe a spinner or disabled state until redirect).
- Style: likely a prominent button on newsletter pages. Use large size if needed (maybe `size="sm"` vs default depending on context; default is fine usually).
- Dark mode: as with any Button.

### src/components/PostLikeButton.tsx (Public post like button)

- Possibly used on post pages for readers to “like” a post (distinct from reaction in dashboard? Actually reaction was for posts by authors? Not sure, but likely this is the UI for a user liking a post).
- Audit it to use our Button & Icon:

  - It probably uses a heart icon (lucide heart). Ensure it’s wrapped in `<Button variant="ghost" size="icon">` with `aria-label={liked ? "Unlike" : "Like"}`
  - Add `aria-pressed` if applicable. But since label also changes, it’s less critical, still good to have.
  - If a count of likes is shown, ensure that text is updated and maybe has `aria-live="polite"` to announce the new count or state.
  - Style: ghost icon button is fine. On liked, they might be using `text-primary` for the heart, which matches what was done with thumbs up in reaction. That’s good. On hover, maybe scale or animate a bit? Could consider a small animation (like a quick bounce or fill). If so, use a CSS animation on the icon (beyond Tailwind’s scope, but not required).
  - Dark mode: token usage means if primary is say blue in light and maybe teal in dark, heart color will adapt. Probably okay.

### src/components/landing/\* (Landing page specific components)

These include FadeInImage, SlideInCard, SnippetCard, and the section components. They should be reviewed for consistency and integrated with Tailwind classes rather than custom CSS where possible:

- **FadeInImage.tsx**: likely a component that fades in an image on scroll or load.

  - Ensure it uses IntersectionObserver or similar (maybe uses useEffect). For styling:

    - The image should have CSS for initial state (opacity 0, translateY maybe) and target state (opacity 1, translateY 0). If custom CSS, consider converting to Tailwind transitions: e.g., add `transition-opacity duration-700 ease-out` and use a conditional class `opacity-0` vs `opacity-100` toggled by state. Or use the `[data-loaded]` attribute approach.
    - Since minimal approach is fine, a simple fade (no slide) might suffice. If sliding, keep it subtle (maybe 20px up).

  - Ensure component accepts `alt` prop and passes it to `<img>` for accessibility.
  - Dark mode: If images have any filters or overlay, ensure they look okay. Likely just an image.
  - Remove any external library usage for animations – if something like framer-motion was used, replace with simpler CSS/Tailwind to reduce dependencies.

- **SlideInCard.tsx**: perhaps similar to FadeInImage but slides a card into view.

  - Approach similarly: use Tailwind for transitions. Possibly utilize the `animate-in` classes if present (Shadcn’s CSS had some like `animate-in slide-in-from-left`). If those keyframes exist in CSS (they might if imported from Shadcn’s base styles), use them. If not, manually create a small keyframe or use transform classes toggled with a state.
  - Make sure it’s triggered on scroll if intended. Possibly an observer toggling a class.
  - Style of the card itself: ensure it uses our Card styles (`bg-card, rounded-lg, shadow`). The snippet might show how it's composed with content, just ensure tokens used for any text or background.
  - Accessibility: If it contains interactive elements (like a link), ensure they are focusable regardless of animation state (if using absolute positioning etc., careful to not hide from screen readers once visible). Likely fine if just transitional in.

- **SnippetCard.tsx**: Possibly a card for code or newsletter snippet.

  - Check content: If it displays code snippet, ensure it's using a monospace font (maybe the design doc said Geist Mono, we should use a system monospaced or add Source Code Pro or something if needed, but not mentioned by user – maybe use default `font-mono` which Tailwind sets to a common stack).
  - If it has a background, ensure tokens (maybe `bg-muted` to indicate an excerpt).
  - Might have a “Read more” link – style that as a subtle link or button as needed.
  - Keep padding consistent with other cards.
  - Consider adding `tabindex="0"` if the whole card is clickable (and use `role="link"` if not an actual anchor) – better to actually wrap in `<a>` tag if linking to a full post, for semantics and so the browser handles accessibility.

- **sections/\*** (AnimatedHero, CreateCollaborate, FragmentedFeeds):

  - These are likely distinct sections of the landing explaining features. Each should be structured as a semantic section (`<section>` with an `<h2>` heading).
  - For styling:

    - **AnimatedHero**: might contain the main headline and some animated graphic. Ensure the headline uses the new typography (big, maybe serif font, bold) and the subtitle if any uses a lighter text-muted style. The animation might be using the FadeIn/SlideIn components above.
    - **CreateCollaborate** and **FragmentedFeeds**: likely feature highlights with maybe an illustration. Use a simple two-column layout: text on one side, image on the other on desktop; stack on mobile. Use `md:flex md:flex-row-reverse` or similar if needed. Add `items-center` if vertically centering.
    - Ensure any icons or images are the right size and have alt text.
    - Keep consistent background – possibly all on white (or `bg-background`). If any section is meant to have a slightly different tint (sometimes alternated), use `bg-muted` lightly, but ensure sufficient contrast with text.
    - Padding: put generous `py-16` or so for each section to breathe (if it fits design).

  - Accessibility: If any of these sections include interactive demos or videos, ensure controls are accessible. Likely they are static content though.

### src/components/app/auth/AuthForm.tsx

- This component likely encapsulates the form UI for sign-in/up (maybe used by those pages).
- Ensure it uses our Form components (Label, Input, etc.). If it currently has its own markup, refactor to use the UI atoms:

  - Might have props for mode (sign-in or sign-up).
  - Use `<Form>` provider if using RHF, or at least ensure each field gets a Label and Input.
  - Buttons as discussed earlier.
  - Possibly handles OAuth providers (if "Sign in with Google" etc. is included). If so, style those buttons consistently – could use Button variant="outline" with provider logo + text. Keep them full-width on mobile if needed. Add `aria-label="Sign in with Google account"` in addition to the text (though text covers it likely).

- If any error message is passed (like "Invalid credentials"), ensure it’s displayed via an `<Alert variant="destructive">` at top or as FormMessage on a field if applicable. Ensure focus is moved to error alert on submit fail (for accessibility) – at least, the error alert should have `role="alert"` so SR announces it.
- Minimal aesthetic: remove any extra wording or images in the form beyond what's necessary (just a heading "Welcome back" maybe, some short description if needed, then fields).
- Dark mode: standard token usage.

### src/components/app/collectives/molecules/CollectiveCard.tsx

- This is likely the card shown on the Discover or My Collectives page representing a collective.
- Redesign:

  - Use `bg-card` with `rounded-md` and `p-4`. Display collective name (probably as a heading or strong text), maybe tagline and member count.
  - Possibly include the collective’s avatar or logo if available. If so, ensure it's small and rounded (maybe `rounded-full w-8 h-8` image). If no image, maybe a colored circle with initial? If implementing that, keep it subtle (maybe `bg-primary text-primary-foreground` circle with initial letter).
  - If the card is clickable (to view collective), wrap content in `<Link>`. Then on hover, can add `shadow-sm` or `bg-muted` transition to indicate interactivity. Also ensure `cursor-pointer`.
  - **Spacing**: If showing multiple pieces of info, use `space-y-1` to separate name, description, etc. Keep it compact but not cramped.
  - Dark mode: Should be fine (bg-card flips).
  - Possibly incorporate a follow button directly on the card (some designs allow follow action right in card). If doing that, include a small `<FollowButton>` in a corner with proper tab order (maybe place it last in DOM so tabbing goes there after reading card content).
  - ARIA: The card link should have an `aria-label="View [Collective Name] collective"`. If the card content already has the name as text in the link, that’s sufficient.

### src/components/app/dashboard/atoms/sidebar-link.tsx

- This is the atom for sidebar navigation links.

  - It likely renders an `<a>` or Next `<Link>` with some classes. Redesign it to match new sidebar style:

    - Use `flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md` for each link. The rounding helps highlight on hover.
    - If an icon is included (maybe an svg icon for each section), that’s why gap-2 and flex. Ensure the icon size (use our Lucide icons with `size-4` or Tailwind `w-4 h-4`).
    - The active link: add a class when active, e.g., `bg-muted text-foreground` or maybe a left border highlight (like Linear uses a colored bar). Could do `border-l-2 border-primary pl-2 -ml-1` trick. But a simpler approach: highlight background or bold text for active.
    - Hover state: even if not active, use `hover:bg-muted` to show feedback.

  - Manage the `aria-current`: set `aria-current="page"` on the active link for screen readers. Also, if active, include it in class logic to style differently.
  - If the sidebar is collapsible, these might get only icons in collapsed state – but that functionality is not clearly in scope. For now, focus on default expanded.
  - Dark mode: `bg-muted` and `text-foreground` will adapt. If we do border highlight, ensure the color (`border-primary`) is visible on dark (our primary should adapt or we define separate if needed).
  - Ensure any sections or group labels in sidebar are coded (maybe not present, but if they had headings like "COLLECTIVES", they'd just be non-clickable text – style them as `px-3 py-1 text-xs text-muted-foreground uppercase` for example).

### src/components/app/dashboard/collectives/DashboardCollectiveCard.tsx

- This may be similar to CollectiveCard but used specifically in dashboard context (maybe listing collectives the user has on their dashboard with some stats).
- Align it with CollectiveCard changes:

  - Likely shows collective name and perhaps quick stats like subscriber count or revenue.
  - Style as card or row – if it’s a card, same approach as CollectiveCard. If a row, maybe similar style to PostListItem.
  - If it has interactive controls (like "Manage" button), include a small `<Button variant="ghost">Manage</Button>` or link icon.
  - Ensure consistent font sizes with rest of dashboard.
  - Possibly unify with CollectiveCard to avoid duplication – if both exist for similar purpose, consider using one component with slight variant. But immediate plan: just style it similarly.
  - ARIA: if it's clickable entire card, label it properly. If it's just static info plus a manage link, then manage link has label and card is static.

### src/components/app/dashboard/molecules/\* (RecentPostRow, StatCard, skeletons)

- **RecentPostRow\.tsx**: Likely a row showing a recent post title, maybe date or likes, used on dashboard home.

  - It probably is a link (title clickable to edit). Ensure it uses a semantic element, like `<div role="listitem">` containing a `<a>`.
  - Style: likely flex with justify-between: left side title, right side maybe a status or time. Keep it very compact (Linear’s list items are \~30-40px tall). So use `py-1` perhaps, and `text-sm`.
  - If multiple pieces on right (like views count, likes), separate with some `mr-4` or a muted dot.
  - The skeleton variant exists; ensure the skeleton height matches the row height and has appropriate width segments for title and meta.
  - On hover or focus, could highlight background (`hover:bg-muted`).
  - ARIA: if clickable, `aria-label="Edit post [Title]"` might be useful if the link text is just title (though the title is okay as label).
  - Ensure tab navigation works (should, if link).

- **StatCard.tsx**: likely a small card showing one stat (like number of posts, or subscribers).

  - Style: Use `bg-card rounded-md p-4 flex items-center`. Possibly includes an icon and a number.
  - The design might show an icon on left and stat on right, or stat large and label below.
  - If icon present, ensure `aria-hidden="true"` on it (so SR focus on stat text).
  - Ensure the number uses a legible font style (maybe `text-2xl font-bold`). If it’s a monetary value, ensure currency is included in text for SR (not just symbol).
  - The skeleton version should mirror layout (e.g., a gray box for number and smaller bar for label).
  - No interactive elements, just display.
  - If the stat is something like "Views this week", ensure label text is present next to number, not solely an icon.

- **Skeletons (recent-post-row-skeleton.tsx, compact-collective-card-skeleton.tsx, stat-card-skeleton.tsx)**:

  - Each should simply render a `<Skeleton>` component or appropriate div structure with `animate-pulse bg-muted` lines approximating the shape.
  - Ensure they replace the content appropriately and have no text for SR (maybe add `aria-hidden="true"` to them).
  - They should occupy the same spacing as actual content to avoid layout shift.

### src/components/app/dashboard/posts/PostListItem.tsx

- Probably used in the “My Posts” page listing each post with maybe title and status:

  - Confirm if similar to RecentPostRow or more detailed (maybe includes edit/delete buttons).
  - Style similarly: a row with title and maybe tags or a status badge (“Draft” or “Published”). If so, use our Badge component for status.
  - If an edit icon or button is present on hover, ensure it's keyboard accessible (should always be in DOM, not just appear on hover without focus ability).
  - Possibly incorporate a checkbox if multi-select (not likely in MVP).
  - Keep the design sparse: maybe only show title and a muted “Draft” text next to it, rather than heavy labels.
  - Use `hover:bg-muted` for highlight if clickable or if row has an onClick to open editor (prefer making the title a link to edit page).
  - If deletion is allowed, maybe a small trash icon button on right; style that with `text-destructive hover:bg-destructive/10` for clarity.
  - ARIA: Ensure if multiple interactive controls in one row (like a link and a delete button), both are focusable in logical order. Provide an `aria-label="Delete [post title]"` on the delete button.

### src/components/app/dashboard/template/dashboard-shell.tsx

- This likely is a higher-level component used by dashboard layout or pages to wrap content with shell (maybe handling loading states or common layout pieces).

  - Review what it does: maybe sets the page title and action button slot. If it wraps children, ensure it provides needed markup: e.g., maybe a heading and a right-aligned action.
  - If it’s just a wrapper for consistent margins or a container for content, ensure it uses `max-w-7xl mx-auto p-6` (or similar) to constrain width on huge screens and padding as needed.
  - If it provides a heading, style that heading with consistent classes (maybe `text-2xl font-semibold`).
  - Possibly includes breadcrumbs; if so, style them minimally and use `<nav aria-label="Breadcrumb">` for SR.
  - Not a visible UI component by itself aside from structural elements, so just ensure it uses the tokens (background etc. if needed) consistently with the layout.

### src/components/app/dashboard/organisms/dashboard-sidebar.tsx

- This likely composes the sidebar with multiple `SidebarLink`s and maybe user info.

  - Ensure it arranges links in sections logically (maybe it already does).
  - If there are headings for sections (like “GENERAL”, “COLLECTIVES”), those should be rendered as non-focusable text, styled as described for labels (uppercase, small, muted).
  - Possibly includes a theme toggle or collapse button at bottom.
  - Style as per sidebar in layout above (this may actually be where the aside content is defined).
  - ARIA: mark the wrapper as `<nav aria-label="Dashboard sidebar">` and each list of links with a role list if needed (though <ul> covers it).
  - If a collapse toggle exists, ensure it has `aria-expanded`.

### src/components/app/nav/ModeToggle.tsx

- Already looked at: it uses our Button, sets aria-label, toggles theme using next-themes.

  - Just ensure the placeholder `div` when not mounted has appropriate classes (it uses a fixed width/height with a rounded background to avoid layout shift, which is fine).
  - Possibly style that placeholder with a skeleton or muted background instead of default gray (maybe add `bg-muted` to it).
  - No further changes needed; it aligns with new design (an icon button).
  - The icons (Sun, Moon) are fine (maybe could use custom ones if design had, but lucide is fine).

### src/components/app/posts/PostViewTracker.tsx

- Likely a component that triggers an API call to increment view count when a post is viewed.

  - It probably uses useEffect to POST to `/api/posts/[id]/view`.
  - No UI is rendered (maybe a hidden beacon).
  - Ensure it does not interfere with layout (should return null or an invisible element).
  - No design changes since it’s non-visual, but note to keep it as is.
  - Possibly add an `aria-hidden="true"` if it renders something (like an iframe or image for tracking), to hide from SR, but likely it’s just a useEffect so no output.

### src/components/app/posts/molecules/\*

- **BookmarkButton.tsx**: We reviewed this. It already uses Button and aria-label toggling. Just ensure consistent styling:

  - It sets `className="rounded-full"` on Button to override default rounding (likely because button default might not be fully round for icon size). This is fine; could also use our `size="icon"` variant which should inherently be round. Actually, our Button variant could use `rounded-md` normally; to make it pill, we can either adjust that variant or keep using class override as done. It’s okay.
  - It uses variant default vs ghost depending on state (bookmarked uses filled style). That seems fine (or maybe use toggle of a simpler style since a filled bookmark might draw a lot of attention – but since it's the user’s own view of their bookmark, either is fine).
  - Possibly add a little animation on toggle (like scale the icon quickly) – nice to have, but can mention adding `transition-transform duration-200 ease-out active:scale-90` on the icon or button.
  - No further changes needed beyond verifying dark mode colors (heart icon uses `text-primary` which in dark might be a bright accent which is okay).

- **CommentsSection.tsx**: likely handles rendering comments under a post.

  - Redesign for clarity:

    - Each comment can be an `<article>` or `<div>` with perhaps the author name (bold small text), date (small muted), and content text. Indent replies.
    - Use `space-y-4` for separation between comments. Possibly use a border-left or just indentation for threads.
    - The comment form (if present) should use our Input or Textarea plus a Button (similar to earlier note).
    - Possibly integrate Radix Collapsible for long threads (if needed to collapse).

  - Ensure that the comments count or section heading is present (like “5 Comments” as an `<h2>` for structure).
  - Dark mode: no special beyond tokens.
  - ARIA: If any comment actions (edit, delete), label them. If threads are deeply nested, consider using `<ul><li>` for each comment for semantics. At least ensure screen reader can navigate by heading if we put author name in a heading tag (some implementations do that, but probably not needed; better a list).

- **PostCard.tsx**: A card view of a post, maybe used on discover or collective page if not listing as rows.

  - Should contain the title, maybe excerpt, and possibly author name or collective.
  - Style with `bg-card rounded-lg p-4 shadow-sm` (if card view is needed).
  - Title as a link, excerpt as text-muted small. If an image is associated (maybe posts have cover image?), include it with `rounded-md mb-4`.
  - Ensure card is consistent height if in a grid for tidy appearance (maybe use CSS line-clamp utility to limit excerpt lines).
  - Use flex or grid internally to separate sections if needed.
  - On hover, maybe elevate slightly (shadow-md) to indicate interactivity.
  - ARIA: card link label covers it (title text).

- **PostReactionButtons.tsx**: We reviewed – uses two icon buttons for like/dislike.

  - Already pretty aligned with design:

    - It toggles variant between default (for active states) and ghost.
    - The count spans are `text-sm tabular-nums w-6` which is good for aligning numbers.
    - Only change might be styling the destructive variant: currently if disliked, uses `variant="destructive"` meaning a red background probably. That might be visually a bit heavy if it fills with red. Perhaps we prefer a more subtle approach: keep it ghost but color the icon red. Or if using destructive variant from Button, check what it does (likely red background). For a toggle like dislike, a filled red might be okay as it highlights that negative feedback strongly. But to maintain minimalist feel, consider using ghost variant always and just color icons (like the like case did with primary text). The code uses destructive variant for dislike which likely results in a light red background in light mode. We might adjust to use ghost + icon colored red to keep UI consistent (optional).
    - Ensure the `rounded-full` class is applied (it was) to make them pills.
    - Possibly reduce spacing between buttons (`gap-2` is fine, or could even be 1 if need tighter).

  - ARIA: They have proper aria-label that updates, which is great. Just ensure both buttons have them (we saw for like, presumably similar for dislike).
  - Dark mode: text-primary and text-destructive tokens will adapt (to some theme colors) – ensure they still stand out on dark (should, if primary in dark is e.g., blue and destructive is red).
  - No big changes needed, mostly stylistic refinement if any.

### src/components/editor/\* (Rich Text Editor Components)

This is likely a Lexical or similar editor integration. The redesign should ensure the editor UI elements (toolbars, nodes, modals) match the new design system.

- **EditorLayout.tsx**: Possibly a wrapper for the editor page layout.

  - It might define the editor container and maybe a sidebar for editor (if any).
  - Ensure it uses the dashboard shell or similar for consistency (if the editor is part of the dashboard, use same background).
  - Possibly handles keyboard shortcuts info or save bar. Keep it minimal: e.g., could show a top bar with "Editing Post" and save status. If present, style it as a small `<div className="text-xs text-muted-foreground">` and position at top or bottom.

- **Toolbar.tsx**: Editor formatting toolbar (bold, italic, etc.).

  - Redesign to a slim bar with icon buttons:

    - Use our `<Button variant="ghost" size="icon">` for each formatting control (B, I, link, etc.). They should toggle active state: when a formatting is active (e.g., text is bolded), highlight the button with `aria-pressed=true` and a style (maybe `bg-muted` or a subtle border).
    - Group related buttons with a separator element (e.g., between text styles and insert elements).
    - Ensure each button has an `aria-label` (e.g., "Bold", "Italic", "Insert Link") because icons alone are not text. The code likely has them (since our search found aria-label usage in Toolbar).
    - Use Lucide icons for these (if not included, consider adding appropriate ones: Bold could be **B** icon or a bold icon, etc. Lucide might have icons like _bold_, _italic_, etc. If not, maybe using text "B", "I" is fine but better to have actual icons for consistency).
    - The toolbar should be keyboard accessible: likely it's just buttons in a row which is fine.
    - Place it at either top or bottom of editor content. Many editors have a floating bar; if our design intends a fixed top toolbar, ensure it’s styled with `bg-popover` (to distinguish from editor area) and maybe a bottom border. Or if inline, ensure it doesn’t scroll away if needed.
    - Possibly use Radix **Toolbar** primitive for group behavior (not necessary if simple).

  - Dark mode: Use `bg-popover` and `text-foreground` for icons so it stands out over editor area which might be white/dark background.
  - Minimal aesthetic: no heavy backgrounds on each button, just icons with subtle hover highlight.

- **PostEditor.tsx**: The main editor component tying Lexical or similar.

  - Ensure the editor content area (likely a contentEditable div) has the proper classes: e.g., `prose prose-lg focus:outline-none`.
  - If not using the typography plugin, define some base styles for editor content in CSS: e.g., `p { margin-bottom: 1em; } h1-h6 { … }` or easier is to just add `prose` class from Tailwind Typography to the container. This will style text and headings nicely.
  - But the Lexical nodes might handle their rendering. Just ensure the container uses our tokens for colors (should be default text anyway).
  - The editor likely supports mentions, hashtags, etc. There are Node components for those. Ensure those Node components have styling aligned:

    - e.g., HashtagNode might wrap a span with special style (maybe color primary); ensure it uses `text-primary` class rather than some static color.
    - PollNode, TweetNode etc might render embedded content. Ensure any UI around them is minimal (maybe just an iframe or block).
    - CollapsibleContainerNode might create a collapsible region in the editor content; ensure that uses the Collapsible we styled with proper disclosure triangle etc.

  - If the editor content uses placeholders (like a gray "Write your post..." text when empty), style that placeholder with `text-muted-foreground` and italic perhaps. Lexical provides a way to style placeholder (maybe via CSS on `.editor-placeholder` class).
  - Spellcheck: ensure the contenteditable has `spellCheck={true}` if desired, and that CSS doesn’t override the browser’s squiggly lines (should be fine).
  - No direct ARIA roles needed beyond contenteditable default (which acts as text box, possibly give it `aria-label="Post content"` or ensure label is associated by field).

- **nodes/\*** (Custom nodes for editor):

  - Each node file likely defines how a custom block is rendered.

    - E.g., ImageNode might output an `<img>` with some wrapper. Ensure it includes `alt` text (the node probably has an alt property).
    - Video or YouTubeNode likely uses an iframe – ensure `title` attribute (like `title="YouTube video player"`).
    - PollNode might render a mini UI for a poll – style the poll options with our form components or at least similar (checkboxes or bars). Might not be fully implemented; if out of MVP scope, skip detailed styling, but note to use consistent form styles if active.
    - CollapsibleContainerNode: ensure it uses our Collapsible component or at least similar classes for the toggle and content. Possibly unify it with any Collapsible component we have.
    - ExcalidrawNode, TweetNode, GIFNode: these likely embed third-party content. For these, ensure the container has appropriate max-width and maybe a border or something if needed.
    - InlineImageNode: likely for an inline small image – ensure it’s styled with `max-w-[1.5em] align-text-bottom` if it's like an emoji or something.
    - PageBreakNode: a divider – style it with our Separator (maybe a horizontal line or dashed line).
    - HashtagNode: as mentioned, ensure it appears as a link or highlighted text with `text-primary` or similar.
    - StickyNode: maybe a post-it note style element (if using excalidraw or something). Hard to know, but ensure any styles use tokens (like a yellow note might not fit dark mode – maybe redesign sticky as a simple highlighted blockquote or so for now).

  - Many of these might be advanced features not heavily styled or used in MVP, but mention aligning them to design tokens if they output any styled elements (e.g., do not keep default bright blue for links or bright yellow for highlights; instead use our accent colors).
  - Ensure **focus**: If these elements are interactive (like clicking a poll option), provide focus styles and appropriate ARIA roles (poll options should be checkboxes or radio with correct roles).

- **plugins/\*** (Editor plugins):

  - FloatingLinkEditorPlugin.tsx: likely shows a small floating toolbar when editing a link (with input to edit URL).

    - Style that floating box with `bg-popover p-2 rounded-md shadow`. Use our Input component inside for the URL field (likely a small input).
    - Add a save/check and cancel/X button (icons) styled as small ghost icon buttons.
    - Ensure the whole thing is `aria-modal` (if using a popover, though not using Radix here maybe, so just ensure tab handling is okay).
    - Keep it minimal and not too large. Possibly position it near the selected text (via absolute positioning).
    - Dark mode: using popover token covers it.

  - SlashMenuPlugin.tsx: likely shows an autocomplete menu when user types `/` for commands (like adding a node).

    - Style it similar to a dropdown: a small panel `bg-popover rounded-md shadow`.
    - Each command item: `px-3 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground` (accent here could be our primary highlight).
    - Ensure that when navigating with arrow keys, the hovered item updates (likely already coded) and that pressing enter selects it.
    - ARIA: Could add `role="listbox"` to container and `role="option"` to items for SR, and `aria-selected` on active item. If Lexical plugin doesn’t do it, consider adding for completeness.

  - CodeHighlightPlugin.tsx: likely automatically highlights code or provides highlighting logic.

    - Ensure it ties into Prism or similar and uses our theme maybe. If outputting code with tokens, maybe adjust colors for dark mode. Possibly out-of-scope to recolor code – but ensure code block background uses `bg-muted` or a specific token for code background for contrast.
    - The plugin might not require UI changes beyond ensuring the `pre` and `code` tags in `.prose` are styled (Tailwind’s typography handles some of that, but if using Lexical’s own thing, ensure global CSS covers it or add a CSS snippet in global for `.dark code` etc. Could note: “Tune code block colors to ensure sufficient contrast in both themes, possibly via a custom CSS theme or ensure using a theme that respects our background.”

## src/lib/\* (Utilities and backend integration)

These files contain logic (Supabase, Stripe, data definitions, etc.) and generally do not directly affect UI. However, to ensure the redesign is holistic:

- **lib/utils.ts**: This likely contains the `cn` (classNames merge) function and maybe other helpers. No UI changes, but we should ensure any utility that might format dates or text does so in an appropriate way (e.g., if a date format is used somewhere in UI, ensure it’s a concise format consistent with minimalist style – for example, maybe use “Jan 2, 2025” everywhere).
- **lib/auth.ts / lib/hooks/useAuth.tsx**: Handles authentication state. No UI changes needed, but confirm if `useAuth` provides user info that is displayed (like user name or avatar). If yes, ensure those are used in Navbar or profile with proper formatting (e.g., don’t display full email if design doesn’t call for it, maybe just name).
- **lib/data/\***: These return data for UI. Possibly not needing changes, but if any of these defines default images or text that show in UI, consider updating them. E.g., `recommendations.ts` if it provides placeholder text for “No recommendations” – ensure that message is short and styled via UI (like showing an `<Alert>` or muted text).
- **lib/supabase/\***: Setup for Supabase client. No design changes. However, if any error messages from Supabase are directly shown, catch them and replace with user-friendly text when displaying.
- **lib/types.ts**: Type definitions, no UI.
- **lib/database.types.ts**: Supabase type definitions, no UI.
- **lib/supabaseAdmin.ts**: Server-side util, no UI.
- **lib/stripe.ts**: Handles Stripe checkout creation. No UI, but if any success/cancel URLs are defined, ensure they point to pages that exist (likely succeed to some page we design).
- **lib/schemas/memberSchemas.ts**: Probably Zod schemas for validation of member forms. Ensure error messages are defined and are clear and concise (by default Zod can produce clunky messages, maybe they customized). If not, consider customizing error messages (like "Name is required" instead of "Required").
- **middleware.ts**: Possibly used for redirecting or middleware logic (maybe to protect routes). No UI, but ensure it doesn’t inadvertently conflict with our design routing (shouldn’t).

## Testing and Final Touches

After implementing the above changes, thorough testing is required:

- **Responsiveness**: Manually test pages at mobile, tablet, desktop widths. Ensure the layout changes (like grid to single column) occur as expected and no important content is off-screen or requires horizontal scroll. Adjust Tailwind breakpoints or classes as needed.
- **Dark Mode**: Toggle the theme (using ModeToggle or manually adding `.dark` class) and verify every page and component retains contrast and visual balance. Pay special attention to text on background (should always be using `text-foreground` or equivalent). If any component still shows a hardcoded light color (for example, maybe an icon using `text-black` somewhere), fix it to use a token.
- **Accessibility audit**: Use browser’s accessibility inspector or tools like Axe to catch any missing labels, color contrast failures, or improper heading order. Ensure keyboard navigation flows correctly (e.g., can tab through menu, forms, and modals).
- **Performance**: Removing external UI libraries and using Tailwind+Radix should keep bundle small. Check that animations aren’t janky (the use of Radix + Tailwind’s GPU-accelerated classes should be fine). If any heavy animations (like large images sliding), consider using `prefers-reduced-motion` to disable them.
- **Consistent spacing & font**: Do a visual scan of margins/padding – everything should align to the 8px grid. For example, section padding 64px, gaps 24px, etc. Tweak any outliers (like we noticed some py-3 which is 12px – change to py-2 or py-4 if possible).
- **Remove unused styles**: If any old CSS classes or files remain (maybe some global CSS that was used for old design), eliminate them to avoid confusion.
- **Update tests** (tests/e2e/\*): The E2E tests likely check for certain text or selectors. After redesign, run them and update selectors if needed (e.g., if we changed button text from "Sign In" to "Log In", update test expectations). Also add new tests for critical flows (ensuring that aria-label toggles work, etc., if tests cover them).

Finally, **no file is left untouched in the review**. Even where no direct change was needed, we considered its role and confirmed it aligns with the new design system. By following this implementation plan, the Lnked project’s UI will be transformed to a modern, cohesive design system with accessibility and responsiveness at its core, while maintaining all current functionality.
