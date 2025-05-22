Enhance Navigation Accessibility and Performance
Files: src/components/Navbar.tsx, src/app/(public)/layout.tsx (and other layout files as needed)
Action: Improve semantic navigation structure. Refactor the Navbar component to use Next.js <Link> elements for navigation links instead of programmatic router pushes. Currently, the Navbar uses <Button> onClick with router.push for menu items
github.com
, which works but lacks native anchor behavior (no Ctrl+click new tab, no prefetch). Replace those with <Link href="..."> wrapped by the Button (Tailwind styling) using asChild. For example:
jsx
Copy
Edit
<Button variant={pathname === '/discover' ? 'secondary' : 'ghost'} size="sm" asChild>
  <Link href="/discover" aria-current={pathname === '/discover' ? 'page' : undefined}>Discover</Link>
</Button>
Do this for Dashboard, Profile, etc., so that links are true anchor elements. This enables built-in prefetching and better accessibility (screen readers will announce them as links). It also improves performance by hinting Next to preload routes.
Action: Add a “Skip to Content” link for keyboard users. In the public layout, insert a skip link at the very top of the page (before the header). For example, in PublicLayout JSX:
jsx
Copy
Edit
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-accent text-accent-foreground p-2 rounded">
  Skip to main content
</a>
and give the main content container an id="main-content". This allows users using keyboard or screen readers to jump past the navigation directly to content, fulfilling accessibility best practices
github.com
. Do the same in other layouts (dashboard/editor) with appropriate IDs if those have their own main content sections.
Action: Optimize Supabase auth checks in navigation. The dashboard layout already uses a server-side session check to protect routes
github.com
. For the Navbar on public pages, consider using the server session to determine logged-in state to avoid a flicker. For example, fetch the session in a higher layout (or use Next middleware) and pass it to Navbar as a prop so that on first render the Navbar knows if a user is signed in (currently it calls supabase.auth.getUser() on mount). If implementing this is complex, at least maintain the loading placeholder UI (the grey pulse skeleton for the profile menu) as done now
github.com
, but we can try to eliminate the need for client fetch. This change will make the nav more performant by reducing client-side work and any delay in showing user-specific nav items.
Action: Ensure all interactive nav elements have proper ARIA labels and focus styles. The mobile menu button already has aria-label="Open menu"
github.com
 – verify that labels exist for all icon-only buttons (mode toggle, etc.). Also, use Tailwind’s focus ring utilities (already configured with the theme’s ring color) on focusable items if not present. This gives a visible focus indicator (e.g., a slight outline in the accent color) when navigating via keyboard, aligning with accessibility standards.
Intent & Impact: These improvements make the navigation more accessible and faster. Semantic links and skip navigation support allow smoother keyboard and screen reader usage, fulfilling the platform’s accessibility goals
github.com
. Using Next’s Link enhances performance with route prefetching, and leveraging server-side auth data (where possible) will reduce loading states. Overall, users will experience a snappier nav bar that is easy to navigate for everyone, including those with assistive technologies.
