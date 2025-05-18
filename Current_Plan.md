Lnked Dashboard Redesign Implementation Plan
Below is a file-by-file audit of the Lnked dashboard section with detailed steps to implement the new Linear-inspired layout. Each file section includes: (1) current role/structure, (2) precise edits for the redesign, (3) any components to delete, extract, or rename, and (4) new components to create (atoms, molecules, organisms) if needed. All changes adhere to the Tailwind + Radix UI design system, prioritize a compact/clear interface, and use existing backend data (no new endpoints). Dark mode is supported by using design tokens (e.g. bg-background, text-foreground) so the UI adapts automatically.
src/app/dashboard/layout.tsx
Current Role & Structure: This is the Next.js layout for the dashboard routes. It currently wraps all dashboard pages inside a <DashboardShell> component and sets page metadata
github.com
. It doesn’t render any UI itself aside from delegating to DashboardShell.
Required Edits for Linear-style Layout: We will keep this file as the wrapper but enhance its responsibilities:
Pass Collective Data: Fetch the list of collectives the logged-in user is a member of (and/or owns) on the server side here, and pass it into <DashboardShell> as a prop. Use the existing Supabase client (as seen in MyCollectivesPage and MyPostsPage) to query collective_members and collectives for the user’s membership. For example, combine owned and joined collectives (IDs, names, slugs) similar to how MyPostsPage builds publishingCollectives
github.com
github.com
. This ensures the sidebar and new dropdown have the data they need without new endpoints.
Integrate New Headbar: No direct UI is rendered here, but we will ensure that the new persistent headbar (DashboardNav) is included via DashboardShell. After our changes in DashboardShell, this layout will automatically include the headbar above all dashboard pages.
(Optional) Container Adjustment: To allow a full-width sidebar flush with the viewport, consider removing or overriding the parent container class for dashboard pages. Currently the RootLayout wraps children in a centered container which can introduce side margins
github.com
. We might accept a slightly centered layout for simplicity, or apply a CSS override (e.g. a special class on <body> for dashboard pages) to make the dashboard layout full-bleed. This would align the sidebar to the very left like Linear. If a full-bleed layout is desired, implement a solution such as adding a .dashboard-page class to the <body> in this layout (using a <body className="... dashboard-page"> in RootLayout via some prop or context) and in global CSS define .dashboard-page .container { max-width: 100%; padding: 0 } to override the centering on dashboard routes.
Components to Delete/Extract/Rename: No components are deleted in this file. Just ensure it now passes the necessary data down. If we introduce a prop for collectives into DashboardShell, adjust the DashboardShell definition accordingly. Also, no rename needed here – it remains the dashboard layout.
New Components or Refactors Needed: Not directly in this file. It will make use of new components like the DashboardNav (headbar) and the CollectiveSelectorDropdown via DashboardShell, but those will be implemented in other files. Ensure the data fetched here is in a serializable format (plain objects) so it can be passed to those client components.
src/components/app/dashboard/template/dashboard-shell.tsx
Current Role & Structure: DashboardShell is the container for dashboard pages, currently implementing a two-column layout. It renders a sidebar (<DashboardSidebar>) on the left and the main content area on the right
github.com
. The JSX is a flex container with min-h-screen and h-full, where the sidebar is hidden on mobile (hidden md:flex) and a scrollable <main> holds page children inside a centered max-width container
github.com
.
Required Edits for Linear-style Layout: We will significantly restructure this component to include the new persistent top headbar and refine the flex layout:
Introduce a Top Headbar: Wrap the content in a vertical flex container so we can place a headbar at the top. For example:
tsx
Copy
Edit
return (

  <div className="flex flex-col min-h-screen h-full bg-background text-foreground">
    <DashboardNav ... />   {/* New top navigation bar for dashboard */}
    <div className="flex flex-1 min-h-0">
      <DashboardSidebar ... />   {/* Persistent sidebar */}
      <main ...> {children} </main>
    </div>
  </div>
);
Here, <DashboardNav> is our new small headbar component (see DashboardNav below). The wrapper flex-1 min-h-0 ensures the main content area is scrollable without expanding beyond the viewport. The main area (<main>) should not include the top padding that RootLayout had; we’ll rely on internal padding for content. Include a bottom border on the headbar (border-b border-border) for a clear separation, since we’re removing the old large header.
Sidebar Integration: Keep the sidebar as a flex child in the row. The sidebar remains full-height of the viewport minus the headbar. Because we’ve placed the sidebar in a flex container with flex-1 min-h-0, it will naturally stretch to fill the available height. We should remove the hidden md:flex class from DashboardSidebar here – instead, we’ll handle responsive visibility in the DashboardSidebar itself or via CSS. (We likely want the sidebar always visible on desktop, and hidden on mobile in favor of the mobile menu sheet trigger in the headbar.)
Responsive Behavior: On mobile, with this new structure, the headbar will still show (with a menu button to open the sidebar as a drawer), and the sidebar component can be entirely hidden (hidden sm:!flex etc. as before). Ensure that on small screens the <DashboardSidebar> is not rendered or positioned out of view to avoid overlaying content (we might keep hidden md:flex to continue hiding the sidebar on small devices, and rely on the headbar’s menu for nav).
Content Area Styling: We can maintain the padded container for content, but adjust it for a denser look. The current code uses p-4 md:p-6 on main and wraps children in container mx-auto max-w-5xl
github.com
. To increase information density like Linear, we can widen this to max-w-6xl or max-w-7xl (allowing more content width on large screens) and use slightly tighter padding (maybe p-3 md:p-4). The idea is to fill more horizontal space with content on big monitors while not looking sparse. For instance:
jsx
Copy
Edit
<main className="flex-1 overflow-y-auto p-3 md:p-5">
  <div className="mx-auto max-w-6xl">{children}</div>
</main>
This gives a bit more room for tables or feeds. Use overflow-y-auto on main to enable inner scrolling for the feed content, keeping the headbar and sidebar fixed.
Dark/Light Mode: Continue using bg-background text-foreground on the outer wrapper (as already in code
github.com
) so that dark mode is automatically handled via CSS variables. The headbar and sidebar will also use token classes for backgrounds/borders.
Sidebar Collapse Support: We will plan for a collapsible sidebar (Linear-style) even if not immediately implemented. To do this, we’ll introduce state and context in DashboardShell. Convert DashboardShell to a client component ("use client"; at the top) so we can use useState. Add a state like const [sidebarCollapsed, setSidebarCollapsed] = useState(false). Pass this state down to <DashboardSidebar> (e.g. <DashboardSidebar collapsed={sidebarCollapsed} />) and similarly to <DashboardNav> if needed (or at least a toggle handler). This way, the headbar’s menu button can trigger setSidebarCollapsed(!sidebarCollapsed). Collapsing behavior specifics will be handled in the Sidebar component, but the state lives here to tie the toggle button and the sidebar display together.
Data Propagation: Accept the collectives data prop we passed from the layout. Update the DashboardShell props interface (e.g. interface DashboardShellProps { children: ReactNode; userCollectives: CollectiveSummary[] }). Then render DashboardSidebar with those collectives (<DashboardSidebar collapsed={...} collectives={userCollectives} />) and DashboardNav with them as well if needed for the collective dropdown (<DashboardNav onToggleSidebar={...} collectives={userCollectives} />). This ensures both components have access to the same list of collectives without extra fetches.
Components to Delete/Extract/Rename: No deletion needed here – we’re augmenting it. Ensure to remove the use of the old global <Navbar> within the dashboard context. After our changes, the RootLayout’s header/nav will be hidden (we’ll handle that in Navbar or RootLayout), so DashboardShell fully manages its own nav. Thus, DashboardShell is effectively a new “template” that replaces the functionality of the site’s header for dashboard pages. We might rename DashboardShell to something like DashboardLayoutTemplate for clarity, but that’s optional – it’s already appropriately named for its role. Just update its signature to accept new props as mentioned.
New Components or Refactors Needed: DashboardShell will utilize new components (DashboardNav, CollectiveSelectorDropdown, etc.) rather than define new ones itself. The main refactor is converting it to a client component to handle interactive state (sidebar collapse). This refactor is necessary to support the collapsible sidebar and any dynamic headbar interactions. If performance is a concern (loading a lot of dashboard content as client), consider isolating state handling in a context or using Radix primitives that manage state internally (like <Collapsible> for the sidebar, see below). However, making DashboardShell client-side is acceptable since it mostly contains layout (the heavy data fetching for content still happens in child pages which remain server-rendered).
src/app/layout.tsx
Current Role & Structure: This is the global RootLayout for the Next.js app. It defines the HTML <head> metadata, loads fonts and global CSS, wraps the app in <ThemeProvider> for dark mode, and renders a top <header> with the Lnked brand and the <Navbar /> on the right, followed by a <main> container for pages and a <Footer />
github.com
github.com
. The header is sticky and has a bottom border
github.com
.
Required Edits for Linear-style Layout: With the redesign, the dashboard section will have its own headbar and sidebar, so the RootLayout should be adjusted so it doesn’t interfere or duplicate navigation on those pages:
Slimmer Header Globally: Replace the current header’s styling with a more compact “headbar” style for the public pages. For example, reduce the padding from py-4 to py-2 (halving its height) and possibly the font size of the brand from text-3xl to text-xl or text-2xl for a more minimal look. The header should remain sticky top-0 z-50 for persistent visibility, and keep bg-background border-b border-border so it blends with our design tokens. Essentially, we want the public site nav to also feel lighter (similar to Linear’s top bar) – a subtle height reduction and smaller text will achieve this.
Conditional Rendering on Dashboard Pages: We need to avoid showing the global header/navbar on dashboard pages (since we’ll have a separate headbar there). There are a few approaches:
Navbar Logic: The simplest is to update <Navbar /> to return null when on dashboard routes (similar to how it already returns null on sign-in/up pages
github.com
). We can leverage the isDashboardPath constant it already computes
github.com
. If isDashboardPath is true, have Navbar render nothing (or only minimally relevant items). Additionally, since the brand is hardcoded in the RootLayout header, we might also hide that when on dashboard pages. We can do this by adding a CSS utility: for example, give the <header> a class of "dashboard-hidden" when on dashboard pages and add a global style to hide it. However, injecting dynamic classes into RootLayout is non-trivial because RootLayout is a server component without easy access to route info. Therefore, modifying Navbar might be the more straightforward path.
Alternate Layout: Another approach is to create a separate Root layout for dashboard (using Next 13 route groups) that omits the header/footer. This is more involved (would require moving dashboard routes under a group folder with its own layout). If feasible, it’s cleaner: the dashboard’s group layout could simply not include the <header> and <Footer />, relying on DashboardShell for nav. This approach aligns with atomic design (separating app shell for internal pages vs marketing site shell). If time allows, consider implementing a route group like (dashboard)/layout.tsx that wraps the dashboard pages and excludes the global header/footer.
Interim Solution: As an immediate fix, adjust the existing layout: In <Navbar>, if on a dashboard path, do not render the “Discover” or “Dashboard” buttons at all (no nav links). That leaves only the ModeToggle and maybe sign out. We can even skip rendering ModeToggle and sign-out here since DashboardNav will handle them. If Navbar returns null for dashboard, the RootLayout’s header will output just the brand on the left. To avoid showing duplicate branding (since our sidebar also shows "Lnked"), we could hide the brand text via CSS when Navbar is absent. For example, add an id to the brand span (id="site-logo") and in global CSS: .dashboard-page #site-logo { display: none; }. This uses the approach of adding a class on the <html> or <body> in dashboard context as described above. We will have set that class in dashboard/layout if possible (or use a data attribute in context).
Main Container Adjustment: The RootLayout’s <main> currently has container mx-auto px-4 md:px-6 py-8
github.com
 which centers content and adds padding. For dashboard pages, we likely want the content area to stretch under the new sidebar/headbar layout. After hiding the global header for /dashboard, the main.container is still wrapping the DashboardShell. We can override its effect by making DashboardShell full width as needed (see above). Alternatively, if using a separate layout for dashboard, that separate layout’s main would not be wrapped in a container at all. In summary, ensure that for dashboard content, the container doesn’t constrain our layout. This might mean removing container mx-auto on the main element conditionally. Since conditional logic in RootLayout is tricky, a CSS override approach is again simplest: e.g., .dashboard-page main.container { max-width: 100%; padding: 0; }.
Footer Handling: Similar to header, consider not rendering the <Footer> on dashboard pages (the dashboard is an application interface that usually doesn’t show site footer links on every screen). If using the Navbar approach, we can also short-circuit rendering <Footer /> in RootLayout when on a dashboard path. You might achieve this by checking pathname.startsWith('/dashboard') via a client-side context or by not including Footer in the dashboard-specific layout if you implement route grouping. Removing the footer on internal pages will give more vertical space for content and a cleaner app feel. (We will detail Footer changes below as well.)
Components to Delete/Extract/Rename: No outright deletions, but adjust the usage of <Navbar> and <Footer> as described. Rename consideration: If we keep one RootLayout, we don’t rename it. But since Navbar’s role is now primarily for the public site, you might conceptually rename Navbar.tsx to SiteNavbar.tsx for clarity (not required, but could prevent confusion with the new DashboardNav). In code, it’s fine to leave as “Navbar” and just ensure it’s hidden on dashboard pages.
New Components or Refactors Needed: Not a new component per se, but implementing a conditional layout mechanism is key. This might involve refactoring how we determine the current route in RootLayout. For example, we might create a small client component that uses usePathname() and conditionally renders children or adds a class to the body. One idea: Wrap the <header> and <Footer> in a <ClientOnly> component that checks if the path starts with /dashboard and returns null if so. This client component can live in app/layout.tsx for simplicity:
tsx
Copy
Edit
<ClientRenderIf notDashboard>
  <header> ...brand + <Navbar/>... </header>
  <Footer/>
</ClientRenderIf>
{isDashboard && children} {/* If on dashboard, perhaps render children differently */}
However, mixing client logic in a server layout must be done carefully. If route grouping is too much, a utility like this can solve it. This refactor ensures our new DashboardShell isn’t doubled up by the old nav. In summary, the RootLayout will be refactored to either not render header/footer for dashboard pages or apply CSS to hide them.
src/components/Navbar.tsx
Current Role & Structure: This component implements the main site’s navigation bar (right side of the header). It fetches the current user (using Supabase auth) and conditionally shows navigation and auth buttons
github.com
github.com
. On desktop, it shows “Discover”, “Dashboard”, and “Sign Out” for logged-in users, or “Sign In/Sign Up” for guests
github.com
github.com
. It also includes the theme <ModeToggle /> on the far right
github.com
. On mobile, it uses a Radix <Sheet> (sidebar drawer) to show a collapsible menu with the same nav items and a sign-out button
github.com
github.com
.
Required Edits for Linear-style Layout: With the new design, the Navbar will no longer be shown on dashboard pages, and its styling should be simplified for public pages:
Hide on Dashboard: Implement a check so that if the current pathname starts with /dashboard, this component returns null (empty). The code already computes isDashboardPath
github.com
; we can use that. For example:
tsx
Copy
Edit
if (isDashboardPath) return null;
This ensures that when the user is in the dashboard section, the global Navbar doesn’t render (the new DashboardNav will handle nav in that context). Note: after doing this, the RootLayout header will only contain the Lnked logo and nothing on the right for dashboard pages. We will hide that logo via CSS or not render header entirely as discussed, so the user effectively won’t see the old nav bar at all in the app.
Desktop Nav Simplification: For non-dashboard pages (e.g. the marketing site, discover page, etc.), we keep using this Navbar but simplify its content for compactness:
Use smaller buttons and spacing: currently it uses size="sm" which is fine, and some gap classes. We can maintain those but ensure the overall header (RootLayout) padding is reduced (done above) to make the nav feel lighter.
Remove the redundant “Dashboard” link when the user is already on dashboard pages (we’ve hidden the whole component on dashboard, so that covers it). On public pages, the “Dashboard” button is still useful for logged-in users to enter the app, so we keep it in those contexts.
Ensure the ARIA labels and roles remain correct (the <nav role="navigation" aria-label="Main navigation"> wrapper is already in place
github.com
).
We might remove the explicit “Discover” link in the headbar if design calls for minimalism and perhaps surface it elsewhere. However, since “Discover” (the explore collectives page) is a primary action, we’ll keep it for now on the site nav.
Mobile Menu: The mobile sheet currently duplicates the sidebar links when isDashboardPath is true
github.com
. If we hide Navbar entirely on dashboard, we won’t be using this sheet on those pages. Instead, we’ll implement a separate mobile menu (perhaps via the DashboardNav including a hamburger that triggers the sidebar). On public pages, the sheet is still useful for the “Discover/Sign In/Sign Up” links. We can keep the sheet for public pages, but simplify its contents:
If user is logged out (public landing pages), the sheet should show links like “Sign In”, “Sign Up” (which it already does in the else branch
github.com
).
If user is logged in (e.g. on Discover page), it shows “Discover” and “Dashboard” and “Sign Out” (already handled in code
github.com
).
We might want to style the sheet to a compact list style (currently it uses Buttons with justify-start h-9 px-2 which is fine).
No major design changes needed here, aside from ensuring consistency with our new sidebar: e.g., icons already included (Newspaper, LayoutDashboard, LogOut icons are used in the sheet
github.com
github.com
). That’s good for visual consistency. We should consider updating the sheet to use the new SidebarNav component if possible (to avoid duplicate nav definitions). One approach: extract the nav items array (Overview, My Posts, etc.) and reuse it. However, given that on small screens we might simply keep using this sheet as is (since it works), we can refactor later. The key for now is that the mobile menu for dashboard items will be handled by the headbar’s menu button (which might reuse this sheet or implement a separate one).
Sign Out Logic: Keep the handleSignOut as is
github.com
, but note that on dashboard pages we will move the sign-out control to the DashboardNav’s user menu. We can leave this function here for the site nav (so users can sign out from the landing/discover pages as well). There’s no conflict in having sign-out in two places – the DashboardNav can also sign out via its own Supabase call or by reusing this logic (maybe we can factor it out to a common utility).
Theming: Keep the <ModeToggle /> in the Navbar for public pages. It will continue to appear at the far right of the header on desktop and at the bottom of the mobile sheet
github.com
. For the dashboard, we will also include a mode toggle (so the user can switch theme within the app). That will be done in DashboardNav. So effectively we’ll have two ModeToggle instances: one in site nav, one in dashboard nav. This is fine. Just ensure to import and use the existing ModeToggle (no need to create a new one).
Visual Style: Simplify any heavy styling. The current Navbar is already minimal (no background of its own, inherits header background). We should double-check spacing: it uses gap-2 md:gap-4 for the container
github.com
. That’s fine. If anything, we might right-align or center it differently now that brand is on left in header. Currently, the header container in RootLayout uses justify-between
github.com
 to space brand left and Navbar right. That remains fine.
Components to Delete/Extract/Rename: The Navbar component itself remains for public pages. We remove its use on internal pages (via the conditional null return). We don’t need to extract new components from it, but we will likely remove the hard-coded dashboard links from here (since the dashboard has its own nav now). For instance, the dashboardNavItems array and mapping might become unused on desktop since we won’t show them in the top bar anymore. We can keep it for mobile drawer usage, or trim it:
The dashboardNavItems array (Overview, My Posts, My Collectives, Edit Profile)
github.com
github.com
 might be moved to a central config so both Navbar’s mobile sheet and the SidebarNav use the same definitions. If not, at least update it if we rename any labels (for example, if we decide to rename “Overview” to “Feed” or remove “My Collectives” as a link, reflect that here too).
Renaming: As mentioned, you may rename Navbar to SiteNavbar in the codebase to differentiate it from the new DashboardNav. This is optional; the functional difference will be clear by context (one is used in RootLayout, one in DashboardShell). If keeping the name, just be careful when discussing “navbar” vs “dashboard nav” in code.
New Components or Refactors Needed: Not a new component, but ensure integration with new ones:
If we make a common structure for nav items (e.g. a shared config or a shared SidebarNav component), consider having Navbar’s mobile drawer import and use <SidebarNav> (in a mode that renders links as needed for mobile). This would prevent duplication of nav item definitions. This refactor might be done later; for now it’s acceptable to leave the mobile sheet as is, since it’s isolated to the old Navbar.
Refactor the conditional logic so Navbar’s JSX is simpler: With the dashboard items removed from desktop, the logged-in view on desktop is basically “Discover” and “Sign Out” with ModeToggle. We could simplify the JSX to not map dashboardNavItems at all on desktop, and just explicitly render the two buttons. On mobile within the sheet, we’ll still map items if isDashboardPath is false? Actually, if we are on a non-dashboard page, isDashboardPath is false, so the sheet currently goes to the else branch showing Discover and Dashboard. That’s fine. If on a dashboard page, Navbar returns null and thus we won’t even mount the sheet. So that logic holds.
In summary, the Navbar will primarily serve the marketing pages. Focus on making it clean and ensuring it gracefully disappears in the app context.
src/components/ui/Footer.tsx
Current Role & Structure: This is the site’s footer, shown at the bottom of every page via RootLayout. It displays the copyright notice and a set of footer links (“Terms”, “Privacy”) and social links (“Twitter”, “GitHub”)
github.com
github.com
. It’s wrapped in a <footer role="contentinfo"> with padding and a top border
github.com
.
Required Edits for Linear-style Layout: For the dashboard redesign, the presence of a footer on application pages is generally unwanted, as it takes up space and doesn’t serve an in-app function. We will:
Hide on Dashboard Pages: As with the header, we should omit or hide the footer when the user is in the dashboard. If implementing a dashboard-specific layout, simply do not include <Footer /> in that layout. If sticking with one RootLayout, apply a similar conditional: e.g., do not render <Footer> if pathname.startsWith('/dashboard'). This can be done via a check using a client-side hook or context (similar to Navbar logic). Another quick fix is a CSS approach: add a class to the body for dashboard pages and set display: none on the footer in that case.
Style Tweaks: For non-dashboard pages (where the footer will still appear, e.g. marketing pages), we can leave the footer mostly as is. It’s already relatively compact and uses design tokens (border-border, text-muted-foreground). To align with the slightly reduced spacing of the new design, you could reduce the padding from py-8 to py-6 or py-4 if desired, though this is minor. The current footer is fine in terms of clarity and compactness.
Dark Mode: The footer should already support dark mode because it uses the token classes (e.g., text-muted-foreground which will dim appropriately). Just verify that the background is bg-background (it inherits body background, which is fine). If needed, explicitly add bg-background to the footer container to ensure it matches the rest of the page in dark mode.
Atomic Consideration: The footer is a UI component mostly for the public site. We won’t show it in the app, so we don’t need to refactor it for the new design system beyond ensuring it doesn’t clash. (Its links will still be reachable on public pages and that’s acceptable.)
Components to Delete/Extract/Rename: No deletions; we keep Footer for the site. Just exclude it from the dashboard. We also don’t need to extract anything from it for reuse in the app. (If the app needed a smaller footer or info panel, we’d design a separate component, but there’s no indication of that here.)
New Components or Refactors Needed: None specifically for Footer. Just coordinate its rendering with the rest of the layout. If using a route grouping approach, effectively we’ll have “Footer” in the public layout and no footer in the dashboard layout. No new component is needed; just the conditional logic or layout separation.
src/components/app/dashboard/template/sidebar.tsx
Current Role & Structure: (Assumption): This file likely was an earlier or placeholder component for the dashboard sidebar. It might have contained layout for a sidebar. However, in the current codebase, the active sidebar implementation is in organisms/dashboard-sidebar.tsx (which we’ll address next). If template/sidebar.tsx exists, it’s probably redundant or an older abstraction of the sidebar UI.
Required Edits for Linear-style Layout: If this file is not currently used, the redesign likely renders it obsolete:
Confirm whether template/sidebar.tsx is imported anywhere. If not, we can safely remove it to avoid confusion. The new design will rely on DashboardSidebar (possibly refactored) for the sidebar.
If it does contain some structure we want to keep (for example, perhaps it defined a generic <aside> container or some styling), we should merge those parts into DashboardSidebar. For instance, if it had a simple layout with a slot for nav links, that can be integrated into the main Sidebar component.
In summary, replace any usage of this file with the new DashboardSidebar + SidebarNav structure.
Components to Delete/Extract/Rename: Most likely delete this file if it’s not actively used. We already have DashboardSidebar providing the sidebar UI, and we will be creating SidebarNav for the nav list portion. A duplicate template/sidebar.tsx is unnecessary. Remove it from the codebase to prevent confusion, or repurpose it if it contains anything useful (though given the current structure, it seems superseded).
New Components or Refactors Needed: None specifically – the new sidebar components will live in DashboardSidebar and potentially SidebarNav. So template/sidebar.tsx itself doesn’t get a new component; it will be eliminated or ignored in favor of those.
src/components/app/dashboard/nav/DashboardNav.tsx
Current Role & Structure: This is intended to be the new Dashboard Headbar component. If it exists currently, it might be a stub or not fully implemented yet. Essentially, this component will replace the top Navbar within the dashboard section, providing a persistent, smaller header bar inside the application.
Required Edits for Linear-style Layout: We need to implement this component to realize the new headbar design:
Layout & Styling: DashboardNav will be a thin horizontal bar at the top of the dashboard interface. Use a <header> or <div> with role="navigation" aria-label="Dashboard top navigation" for semantics. Apply classes like flex items-center justify-between w-full bg-background border-b border-border px-4 (and h-12 or appropriate height if we want to explicitly size it, or use py-2 for padding to make it roughly ~48px tall). This ensures it spans the full width of the app content and has a bottom border similar to the global header. The background should use bg-background and text text-foreground for theming.
Left Side – Sidebar Toggle: On the left side of the headbar, include a button to toggle the sidebar’s collapse state. This can be a simple <Button variant="ghost" size="icon"> with an icon (for example, a “Menu” icon (three bar hamburger) or a double arrow icon from Lucide like ChevronLeft/ChevronRight depending on state). This button’s onClick will call the prop (passed from DashboardShell) to collapse or expand the sidebar. It should have aria-label="Toggle sidebar" and use a conditional icon: if sidebarCollapsed is false (sidebar expanded), show an icon indicating you can collapse (e.g., ChevronLeft); if collapsed, show ChevronRight or the hamburger. This matches Linear’s behavior where you can collapse the side nav.
Center – Feed Type Toggle & Collective Selector: The middle area of the headbar will focus on the two main feed types:
Implement a feed toggle control for “Personal vs Collective” feeds. This can be done as two toggle buttons or a segmented control:
One approach: use Radix ToggleGroup with two items, or simply two <Button> components styled as a toggle. For instance, <Button size="sm" variant={feedType === 'personal' ? 'secondary' : 'ghost'}>Personal</Button> and similarly for Collective, to indicate the active feed (using secondary or filled style for active, and ghost for inactive). Clicking one sets the state (you can manage a feedType state in a parent or context; since feed content likely lives in the page component, we might handle the toggle there or lift it to DashboardNav via props).
If implementing within DashboardNav, use useState to manage feedType (this makes DashboardNav a client component, which is fine – it likely already is if it has interactive elements). However, coordinating this with the actual feed content might require lifting the state up to the page or using routing.
Simpler: treat each feed type as a navigation: The “Personal” feed could link to, say, /dashboard (the overview page which we will repurpose as personal feed), and the “Collective” feed could link to a new page or the same page with a query param. Alternatively, handle it fully client-side: when toggled, dynamically load different content (via Supabase query or context).
For now, plan it as an interactive toggle that triggers a state change or navigation. We want instantaneous feel (Linear-like), so a client-side toggle is ideal. We can fetch all necessary posts data on page load (or use React state to fetch on toggle).
Labeling: Use clear labels or even icons if appropriate (text “Personal” and “Collectives” should be fine). Ensure each toggle is accessible (if using ToggleGroup, Radix will handle roles; if using buttons, add aria-pressed={feedType==='personal'} for example to convey state).
Implement the Collective selector dropdown for the collective feed context. This should only be enabled or visible when the “Collective” feed is selected (since for personal feed it’s not applicable). When collective feed is active:
Show a dropdown next to the toggle, allowing the user to select which collective to view or “All Collectives”. For example, a <CollectiveSelectorDropdown current={currentCollective} onChange={...} options={userCollectives} />.
If currentCollective is null or an “All” option, that means the feed will show posts from all collectives the user is in (aggregate feed). The dropdown’s default selected value could be “All Collectives” (which is not literally in userCollectives list, but we can inject an option for it at the top).
The dropdown should list each collective by name (using the list passed in from DashboardShell). We’ll implement this with Radix Select or DropdownMenu:
Radix Select: Suitable for a dropdown with a list of options. We can use @radix-ui/react-select to build it. The CollectiveSelectorDropdown component can encapsulate this logic. It will show a trigger button that displays the currently selected collective (or “All Collectives”), and a list of options when expanded. Style the options list to match our theme (likely using Radix with our tailwind classes for item styles).
Ensure the dropdown has aria-label="Select collective" and each option is labeled by collective name. Use the collective’s name as the visible label, possibly with an icon (maybe a group icon for collectives or the collective’s own icon if we had one – not in scope now).
On selection change: trigger whatever is needed to update the feed content. This could be done via routing (navigate to a collective-specific page) or via lifting state. For instance, if we handle feed logic in a React state, selecting a collective could filter the already-fetched posts or trigger a new fetch for that collective’s posts. We can pass an onSelectCollective prop from the parent page into DashboardNav to handle it. Or DashboardNav itself can use Next’s router to navigate: e.g., router.push('/dashboard?collective=' + collectiveId) if using query param approach, or even router.push('/dashboard/collectives/' + slug + '/feed') if we have such a route.
Initially, if the user is on collective feed and hasn’t chosen one, “All Collectives” is selected. If they choose a specific collective, the feed could narrow to that collective’s posts (and possibly we could navigate them to that collective’s dashboard page if it exists, but since we want the focus on feed reading, filtering in place is smoother).
If “Personal” feed is selected, the dropdown can either disappear or be disabled. Simpler UX might be to hide it unless “Collective” is active, to avoid confusion.
Right Side – User Controls: On the right end of the DashboardNav, we’ll provide the user-related actions and toggles:
Show the theme ModeToggle icon button here, so the user can toggle dark/light in the dashboard. We can import and reuse the existing <ModeToggle /> component (it’s a client component that uses next-themes). Place it as an icon button with appropriate margin (maybe class mr-2 if something follows).
Provide a User menu / Profile dropdown. Instead of a plain “Sign Out” button on the bar (which would take space and be less modern), use the user’s avatar or name as a clickable element that opens a Radix DropdownMenu. We can create a small component (e.g. <UserMenu />) or inline the logic here:
Use DropdownMenu from Radix with a trigger button. The trigger could display the user’s profile avatar (if available via Supabase user object) or a generic user icon (Lucide’s User icon) or initials. Given we have the user from Supabase in Navbar (we can fetch similarly here by calling supabase.auth.getUser() in a useEffect, or even better, pass the user from a higher context to avoid extra fetch – perhaps the RootLayout or a context already provides the user? If not, do a quick client fetch).
The dropdown menu should contain items: “Profile/Settings” (which links to /dashboard/profile/edit or some profile page), and “Sign Out”. Possibly also “My Posts” or “My Collectives” shortcuts if those make sense – but since those are in the sidebar, no need to duplicate them here. Keep it simple: Profile and Sign Out.
Style the menu items using our design system: Radix DropdownMenu + Tailwind. We likely have some existing menu item styles or can mimic the Select styles. Use text-sm text-foreground for items, with hover:bg-muted etc. Ensure to include DropdownMenu.Item with onSelect handlers: one calling Supabase signOut (for “Sign Out”), and one router.push('/dashboard/profile/edit') for “Profile”.
If using an avatar image, style it small (maybe 24x24) and ensure it’s clickable. If not, a user icon is fine with proper label on the menu.
Give the trigger an aria-label="User menu" for accessibility if it’s just an icon.
The sign-out functionality can leverage Supabase as in Navbar (we might even import the same handleSignOut or simply call supabase.auth.signOut() directly in the onSelect).
With ModeToggle and UserMenu on the right, we should space them slightly. Perhaps group them aligned right. For example:
jsx
Copy
Edit
<div className="flex items-center gap-2">
  <ModeToggle />
  <DropdownMenu>…</DropdownMenu>
</div>
This keeps a consistent gap.
Behavior: The DashboardNav should be sticky (fixed) within the dashboard so it remains visible when scrolling through posts. Since we structured DashboardShell with the headbar outside the scrollable <main>, it already stays put. If needed, one could also add sticky top-0 z-40 to DashboardNav as a safeguard (z-40 or above to appear above any content, but below modals which might be z-50+).
Responsiveness: On small screens, the DashboardNav also needs to accommodate navigation because the sidebar is hidden. Therefore:
The left side toggle button (which we used for collapsing on desktop) can double as a mobile menu trigger. Instead of (or in addition to) collapsing the sidebar (which is anyway not visible on mobile), clicking it on mobile should open the navigation drawer. We can reuse the Radix Sheet from Navbar or convert the sidebar into a drawer. Simplest approach: when on mobile, make this button open the same <Sheet> that Navbar’s hamburger did. We could lift the Sheet logic from Navbar into a separate component or into DashboardNav. For consistency, we might implement a separate mobile drawer in DashboardNav that shows the sidebar navigation links:
Use Radix <Sheet> or <Dialog> for a slide-over. Radix Sheet is already integrated (we have code in Navbar). We can create a <SidebarNavSheet> component that wraps <SidebarNav> inside a Sheet for mobile. Trigger it with the left button (hamburger icon) on mobile breakpoints.
The sheet content can essentially reuse <SidebarNav> listing all sections (Overview, My Posts, Collectives, Settings links). Actually, we can directly render <DashboardSidebar> inside the Sheet for a full-feature nav on mobile. Because DashboardSidebar already has all sections, perhaps we can reuse it (just need to ensure styling in sheet – might add className="p-4 w-[250px]" etc like the Navbar sheet did).
This approach avoids duplicating nav definitions yet again. So, implement: in DashboardNav JSX, include a <Sheet> that is only rendered on mobile (or rendered always but only opened on mobile). The trigger is the same toggle button, but on mobile screens, instead of toggling collapse (which doesn’t apply on mobile), we call openSheet(). In practice, we can detect screen width via CSS: e.g. show a different icon or use the same hamburger for both collapse and mobile menu. Actually, we can simplify: use the hamburger icon always for this button. On desktop, clicking hamburger toggles collapse; on mobile, it opens the sheet (we can detect viewport via tailwind classes or simply always open sheet and simultaneously toggle collapse – collapse has no effect on mobile since sidebar is hidden by CSS).
In summary, incorporate the mobile sheet by rendering:
jsx
Copy
Edit
<Sheet>
  <SheetTrigger asChild>
    <Button variant="ghost" size="icon" className="md:hidden"> <MenuIcon/> </Button>
  </SheetTrigger>
  <SheetContent side="left" className="p-4 w-64 sm:w-80"> 
    {/* inside here, render nav links, maybe reuse SidebarNav or DashboardSidebar */}
    <SidebarNav onSelect={() => sheet.close()} collectives={userCollectives} /> 
  </SheetContent>
</Sheet>
This would mimic the Navbar’s sheet but using our new SidebarNav. Ensure to include an appropriate <SheetTitle> if needed (maybe the logo or “Navigation”). We can include a small brand label at the top of the sheet (like Navbar does with the Lnked text
github.com
).
This ensures mobile users can navigate the dashboard sections.
Note: We’ll likely remove the now redundant mobile logic from Navbar for dashboard items, since DashboardNav covers it.
The feed toggle and collective dropdown might be tricky to fit on very small screens. On mobile, perhaps these controls stack or use icons:
A possibility: hide the feed toggle on extra-small screens and default to showing one feed (or rely on separate routes). However, ideally we want the functionality available. If space is constrained, the feed toggle could be implemented as a Radix Tabs component that scrolls, or simply smaller buttons.
We can let them wrap to next line if needed (the headbar can grow in height if two lines, though not ideal). Another approach: use icons for the toggle (like individual icon vs collective icon) to save text space, with tooltips for meaning.
As a first iteration, keep the text buttons; if they overflow on mobile, they will simply wrap or overflow horizontally (we can allow horizontal scroll on that section). In Tailwind, overflow-x-auto on a flex row of buttons could allow swiping if necessary. This is a minor detail to consider.
Dark Mode: Use the same token classes. The border and background tokens ensure it looks correct in dark theme. The DropdownMenu and Select from Radix will also need to be styled with our classes so that in dark mode the menu background is bg-popover (assuming our design tokens define these) and text is text-foreground. Likely we have utilities or can apply classes on the Radix portaled elements.
Lucide Icons: We will use Lucide icons for hamburger (likely Menu which is already imported in Navbar), chevrons, sun/moon (ModeToggle uses them internally), user icon, etc. Ensure to use consistent sizing (e.g. use Tailwind class h-5 w-5 or use the size-4 class as in other places which presumably sets 1em=16px*4=64px? Actually size-4 in their setup likely means 1rem (16px) * 1? Need to check lucide-react usage: they often set icons with class like className="size-4" where CSS defines .size-4 { height: 1rem; width: 1rem; } or similar. It appears in Navbar they use size-4 on icons inside buttons
github.com
 which likely yields a 1em=4 (maybe 1em=4px? Unlikely, more probable they define .size-4 as 1rem or 1.25rem).
In any case, ensure the icons in headbar (toggle, user menu trigger) look appropriately sized (around 20px). Use similar classes or define explicit h-5 w-5.
Components to Delete/Extract/Rename: DashboardNav is new, so nothing to delete. We will however extract some UI pieces into smaller components for cleanliness:
CollectiveSelectorDropdown component: Implement this as a molecule. It can live in components/app/dashboard/nav or perhaps components/app/dashboard/molecules. However, since the question explicitly names it, we’ll treat it as its own component (discussed in a later section). DashboardNav will use this component.
Possibly extract FeedToggle as its own small component (but this might be overkill if it’s just two buttons). It’s fine to keep the toggle logic inside DashboardNav for now.
UserMenu (Profile dropdown): We might implement it inline, but better to make a small component for clarity and reuse. For instance, an atoms/UserAvatarButton (for the trigger) and a molecules/UserDropdownMenu. Given we might reuse a similar menu in the Navbar in the future, a standalone could be useful. For this plan, we can just describe it inline as part of DashboardNav’s implementation.
No renaming needed; DashboardNav is aptly named.
New Components or Refactors Needed:
CollectiveSelectorDropdown: (Detailed below in new components section, but summarizing) – a dropdown built with Radix Select for choosing collectives. It’s a new molecule that DashboardNav will incorporate when collective feed is active.
UserMenu Dropdown: as mentioned, likely a new molecule using Radix DropdownMenu for profile/sign-out. Could name it UserMenu.
SidebarNavSheet (for mobile): If we implement the mobile sheet inside DashboardNav, we might not need a separate component – we can inline the Radix Sheet usage. However, if preferred, we can wrap that logic in a new component to keep DashboardNav cleaner. That component could be called MobileSidebarDrawer and reside in the nav folder. It would manage the Radix Sheet and simply render <SidebarNav> inside. This is an optional refactor.
FeedToggle: optionally a small component if needed.
Overall, DashboardNav becomes an organism in atomic design terms – it orchestrates several smaller components (buttons, dropdowns, toggles). We should implement it carefully to keep concerns separated (for example, the state management for feed type might live in the page, but it’s okay to handle in this component and call out via props or context).
We will ensure that all new interactive elements (toggle, dropdown, menu) are accessible: proper aria-labels, keyboard navigation (Radix covers a lot of it), and visible focus styles (Tailwind’s default focus outline or ring can be used or ensure our Button component handles it).
src/components/app/dashboard/nav/SidebarNav.tsx
Current Role & Structure: This is intended to represent the navigation list/sections within the sidebar. If it exists in code, it might be a skeleton to separate nav items from the rest of the sidebar. Right now, the sidebar links are rendered in DashboardSidebar directly
github.com
github.com
. We will refactor that into this component.
Required Edits for Linear-style Layout: We will implement SidebarNav to handle the grouped navigation links (Overview, Posts, Collectives, Settings, etc.) in a structured way:
Props: Give SidebarNav a prop for the user’s collectives list (an array of {id, name, slug}) so it can render those dynamically. Also, if we decide to allow collapsing of sections, SidebarNav might need to manage internal state or accept props for which sections are collapsed (though optional).
Layout: In SidebarNav’s JSX, structure the links into sections:
jsx
Copy
Edit
<nav aria-label="Sidebar Navigation" className="flex flex-col gap-6">
  {/* Main section */}
  <div>
    <nav className="flex flex-col gap-1" aria-label="Main">
      ...render SidebarLink for Overview and My Posts...
    </nav>
  </div>
  {/* Collectives section */}
  <div>
    <div className="px-3 py-2 flex items-center justify-between">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Collectives
      </h2>
      <div className="flex gap-1">
        {/* Filter and New icons */}
        <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Filter collectives">
          <ListFilterIcon className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" asChild className="h-6 w-6" aria-label="New Collective">
          <Link href="/dashboard/collectives/new"><PlusCircleIcon className="h-4 w-4" /></Link>
        </Button>
      </div>
    </div>
    <nav className="flex flex-col gap-1" aria-label="Collectives">
      ...render a SidebarLink for each collective in props.collectives...
    </nav>
  </div>
  {/* Settings section */}
  <div>
    <div className="px-3 py-2">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Settings</h2>
    </div>
    <nav className="flex flex-col gap-1" aria-label="Settings">
      ...SidebarLink for Edit Profile, Newsletter...
    </nav>
  </div>
</nav>
This is analogous to the current structure in DashboardSidebar
github.com
github.com
. We are just moving it into its own component and using the passed collectives data for the Collectives section. The ListFilter and PlusCircle icons remain for filtering and adding collectives. (They are small and fit the compact style; their tooltip/aria-labels are already in code
github.com
github.com
.)
SidebarLink usage: Use the existing <SidebarLink> atom for each link. This component likely renders an anchor with the icon and label, and handles active state highlighting. Ensure to pass the correct props:
For Overview link: href="/dashboard" label="Overview" icon={LayoutDashboard} and exact={true} (the current code sets exact when href === "/dashboard"
github.com
).
My Posts: href="/dashboard/posts" with icon={FileText}.
Each collective: For now, we could link to the collective’s management or feed. A safe option is linking to the collective’s public page (e.g. href={"/" + collective.slug}) as in the DashboardCollectiveCard component
github.com
. However, within the app, maybe it’s better to link to a dashboard route like /dashboard/collectives/[id]. We have some routes like /dashboard/collectives/${id}/manage/members and settings (as seen in the collective card actions
github.com
github.com
). Perhaps we should link the collective name to a general collective dashboard page (not implemented yet). If none exists, linking to the public page is an interim solution for viewing posts. Alternatively, if we implement the feed filtering via headbar, clicking a collective in the sidebar might trigger the same filter. But sidebar links typically navigate. For now, use a placeholder route or the slug as link:
If we choose to have an internal feed page for collective posts, we could define /dashboard/collectives/[collectiveId]/posts to show that collective’s posts. If not existing, we might link to /dashboard/collectives (the list page) or simply not make each collective a link and rely on the dropdown in the headbar for feed filtering.
However, from a navigation perspective, listing collectives in the sidebar implies each is navigable. Perhaps clicking a collective could navigate to a collective-specific dashboard (with members, settings, etc). We see that owners have “Members” and “Settings” pages per collective. So maybe a base route like /dashboard/collectives/[id] could show a collective overview. If that’s planned, then link to /dashboard/collectives/${collective.id} or use slug if preferred.
We should decide: Action – We will link each collective in the sidebar to /dashboard/collectives/[id] (and then that page can show posts or overview of that collective). Even if not implemented yet, it’s a logical place.
So in code: <SidebarLink href={/dashboard/collectives/${collective.id}} icon={Users2} label={collective.name} />. (We use the same Users2 icon for all collective entries, or if we had unique icons per collective, we could use a generic group icon for all).
This means “My Collectives” aggregate page link becomes less necessary. We likely will remove the standalone "My Collectives" link (as it’s replaced by the list). Indeed, in our new SidebarNav, we do not list a “My Collectives” item in main or collective sections; we directly list collectives.
Settings links: “Edit Profile” (UserSquare icon) and “Newsletter” (Newspaper icon) remain as in settingsNavItems
github.com
.
Collapsible Sections: To emulate Linear’s collapsible nested sections, consider adding the ability to collapse “Collectives” and “Settings” groups:
This can be done by turning each section into a Radix Accordion item or a simple useState toggle. Radix Accordion (with type="multiple") could wrap the collectives nav and settings nav:
The header <h2> could serve as the Accordion trigger (wrap it in AccordionTrigger and style to look the same, plus maybe a small chevron icon indicating state).
The list of links (<nav aria-label="Collectives">...</nav>) becomes the AccordionContent.
Initially, we’d keep them expanded for desktop UX. But a user could click the “Collectives” heading to collapse that list if desired.
This is an enhancement: If the number of collectives grows large, a collapse could be useful. It’s a nice-to-have that matches Linear (Linear allows collapsing entire sections like teams/projects via a small arrow).
We can implement this if time permits: using Radix Accordion will manage state and accessibility. Just ensure to import the Radix components and apply Tailwind classes (the trigger can have flex justify-between items-center cursor-pointer and we can position a chevron icon that rotates on collapse).
If implementing manually: add a local state e.g. const [collectivesOpen, setCollectivesOpen] = useState(true) and toggle on heading click, conditionally render the nav list. Radix is more accessible though, so leaning towards Radix.
For MVP, we could skip collapsible and always show them expanded (which is simpler and likely fine, as Linear also by default shows all).
We will include at least the thought: we’ll keep the sections expanded by default and possibly add collapse icons for future extensibility. The design spec did mention collapsible, so implementing it would fulfill that.
Sidebar Collapse (icon-only mode): When the whole sidebar is collapsed (via the DashboardNav toggle):
We will pass a prop collapsed from DashboardSidebar to SidebarNav indicating this state. SidebarNav should adjust rendering accordingly:
If collapsed=true, each SidebarLink should render in a compact icon-only form. We can achieve this by adding a prop to SidebarLink (e.g., collapsed) that, when true, hides the label text and perhaps centers the icon.
Alternatively, use CSS: when the parent aside has a collapsed class (say .collapsed), apply hidden or opacity-0 w-0 to the label spans. Since SidebarLink is likely a custom component, it might be easier to control via props.
So plan: Extend <SidebarLink> so that if a collapsed prop is true, it either doesn’t render the label text at all (just outputs the icon inside a container sized for icon) or adds a CSS class to hide text. A simple approach:
jsx
Copy
Edit
{collapsed ? (
   <Link ... className="sidebar-link-collapsed"> <Icon className="mx-auto" /> </Link>
) : (
   <Link ... className="sidebar-link"> <Icon /> <span>{label}</span> </Link>
)}
We might also use a tooltip on hover to show the full label when collapsed (like Linear does). Using Radix Tooltip for each SidebarLink would be a nice touch. For instance, wrap the icon in a Tooltip trigger that shows label on hover when collapsed. This can be done by conditionally including Tooltip in SidebarLink when collapsed.
Ensure the nav section headings (like “Collectives”) are hidden entirely when collapsed, since we just see icons for each item. We won’t have space for section headers in collapsed mode (Linear collapses just shows a single icon column; section labels vanish). To handle this, we can simply not render the <h2> headers when collapsed is true. Or we could collapse them to a narrow strip – but better to hide.
The filter and add buttons next to “Collectives” heading would also be hidden in collapsed mode.
Essentially in collapsed state, we present a single list of icons (maybe grouped visually but without text).
We should still keep the bottom “Create Post” button visible though – maybe just the icon (plus tooltip “Create Post”).
Implementation: We can have CSS classes applied to the aside (e.g., w-16 for collapsed vs w-64 for expanded). In SidebarNav, check a collapsed prop: if true, do not render the section header divs at all, and maybe render just one nav containing all top-level links:
Actually, an idea: when collapsed, instead of separated sections, possibly show a single vertical list of icons in logical order:
e.g., Overview, My Posts, maybe a separator, then each collective as an icon (no heading), separator, then profile, newsletter icons.
This is how Linear shows a single column of icons and uses tooltips for labels.
We can implement that:
If collapsed, output:
jsx
Copy
Edit
<nav aria-label="Collapsed sidebar navigation" className="flex flex-col items-center gap-2 py-2">
  <SidebarLink collapsed icon=LayoutDashboard ... /> 
  <SidebarLink collapsed icon=FileText ... />
  <div className="border-t my-2 w-8 border-sidebar-border"></div>
  {collectives.map(... icons ...)}
  <div className="border-t my-2 w-8 border-sidebar-border"></div>
  <SidebarLink collapsed icon=UserSquare ... />
  <SidebarLink collapsed icon=Newspaper ... />
</nav>
This would ignore headings and just show dividers. You might also include the create post button at bottom as another icon (PlusCircle).
However, implementing two different markup structures in one component based on collapsed is a bit complex but doable.
Alternatively, we keep one structure but hide text via CSS – that way section headers are hidden but still a gap remains. Linear typically collapses and still shows separated groups via small dividers only.
It might be cleaner to explicitly render a simplified structure when collapsed (as above).
For simplicity in this plan: mention that SidebarNav will hide section titles and only show icons when collapsed. We’ll utilize tooltips to ensure usability.
Ensure all icons have aria-label or screen reader text when labels are hidden. Possibly our SidebarLink could always include the label in an aria-label on the link if collapsed, or render it as visually hidden text.
We should also maintain focusability (tab navigation) for collapsed links – they’ll still receive focus, and maybe the browser will announce their aria-label, which is good.
Theming: Use text-muted-foreground for section headers as in current code
github.com
. The SidebarLink component likely already uses styles for active vs inactive (maybe altering background or text color for the active route). Ensure those classes still apply. In a compact design, maybe the active link could have a subtle highlight (e.g., a slightly darker background or a left border accent). If not already, consider adding a Tailwind class for active state, e.g., aria-current="page" on the active link and style using that (the SidebarLink might already do something like variant secondary for active).
Scroll if overflow: The sidebar container is overflow-y-auto
github.com
 which we keep, meaning if there are many collectives, the sidebar can scroll independently. That’s fine. Keep SidebarNav height flexible inside that.
Icons: The icons (LayoutDashboard, FileText, Users2, UserSquare, Newspaper, etc.) are from lucide-react as imported in DashboardSidebar
github.com
. We can continue to use them. They are sized via CSS class “size-3” or “size-4” in current code
github.com
. Ensure consistency: in text links, icons had class className="size-4 mr-2". In collapsed mode, icons might be centered so perhaps just size-4 without margin.
Filter Button (ListFilter): This could eventually open a filter panel for collectives (not specified, but presumably to filter the list if it’s long). We can leave it as a non-functional placeholder or implement a basic toggle for future. For now, it’s mostly UI decoration. It’s small (h-6 w-6 ghost button) so that’s okay.
Components to Delete/Extract/Rename:
We are essentially extracting the nav list from DashboardSidebar into this new SidebarNav. After this, DashboardSidebar will primarily contain the wrapper <aside> and possibly the brand/logo and the bottom “Create Post” button, delegating the link list to <SidebarNav>. We should remove the duplicate code from DashboardSidebar to avoid redundancy.
No deletion of functionality; just relocation.
No renaming needed; SidebarNav is a clear name for this component.
One note: the SidebarLink atom remains as is (we’ll modify it to support collapsed mode, but that’s not a full rename or extraction, just an enhancement).
After extracting, DashboardSidebar might be simplified enough that we consider merging it and SidebarNav. But it’s okay to keep separate: DashboardSidebar (organism) will include the brand, then <SidebarNav>, then bottom section.
New Components or Refactors Needed:
SidebarLink changes: As mentioned, update the SidebarLink component (in dashboard/atoms/sidebar-link.tsx) to handle collapsed displays. This likely involves:
Accepting a collapsed?: boolean prop.
If collapsed, render only the icon (with proper accessible label).
Possibly integrate Radix Tooltip: We can create a simple Tooltip atom (if not already in components/ui). ShadCN UI (the base this project uses for components) often includes a Tooltip component. If not, Radix has one we can set up. Implementing a tooltip for each link’s label would greatly improve UX when collapsed (user hovers icon and sees “My Posts”, etc.).
Ensure SidebarLink still highlights the active route. Perhaps it adds a subtle background or a small vertical bar. When collapsed, perhaps highlight by a colored dot or an accent bar on the left of the icon. For now, keep the same approach: e.g., if active, maybe we already add aria-current="page" which triggers a style (the code sets variant secondary for active in mobile menu, but in sidebar, likely there’s some style when exact match).
If not implemented, we can add: if the current route equals the link’s href (or startswith, for non-exact), apply a different Tailwind style (e.g., bg-accent text-foreground rounded-md as a subtle highlight).
Integration with DashboardSidebar: After creating SidebarNav, modify DashboardSidebar to use it (pass the needed props). This is in the next section.
src/components/app/dashboard/organisms/dashboard-sidebar.tsx
(This file wasn’t explicitly listed in the user’s audit list, but it’s crucial and linked from DashboardShell. We include it here for completeness.)
Current Role & Structure: DashboardSidebar is the component rendering the sidebar <aside> in the current dashboard. It includes the Lnked logo at the top, sections for Main, Collectives, Settings with headings, and a bottom “Create Post” button
github.com
github.com
github.com
github.com
. It imports SidebarLink for each link and uses hardcoded nav item arrays.
Required Edits for Linear-style Layout: We will refactor DashboardSidebar to act as a container that uses SidebarNav:
Aside Container: Retain the <aside> element and its classes: currently "bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border h-full w-64 py-4 overflow-y-auto"
github.com
. We might adjust some of these:
The w-64 (16rem, ~256px) is the expanded width. We’ll keep that for default. When collapsed, we’ll apply a different width (e.g., w-16 or w-14 ~ 64px or 56px). We can manage this by conditional class or a parent state class. For example, we can add:
jsx
Copy
Edit
<aside className={cn("flex flex-col border-r h-full overflow-y-auto transition-width duration-200", collapsed ? "w-16" : "w-64", className)}>
Use Tailwind’s arbitrary properties if needed for smooth width transition (or just use CSS). The transition-width requires the width property to be whitelisted in Tailwind config (if not, use duration-200 and maybe ease-in-out).
Colors: bg-sidebar and text-sidebar-foreground presumably are custom CSS variables defined for sidebar background. If these are set in design tokens, fine. If not, we might unify them with the main background (bg-background). However, often sidebars have a slightly different tone. If bg-sidebar is defined, keep it. Ensure it works in dark mode (maybe it’s the same as bg-background or a variant).
Border: border-sidebar-border is likely a subtle border color. Keep it for the right edge in light mode; in dark mode, ensure it’s the appropriate dark border (likely defined).
Padding: py-4 gave some top/bottom space. We might reduce this to py-2 or py-3 to save space if needed, but since content inside (links) has their own padding, it’s okay. We can leave it or trim a bit. Linear’s sidebar usually is flush at top except maybe some margin under the logo.
We will remove the className="hidden md:flex" usage from DashboardShell and instead control visibility here: For mobile, we can add className="hidden md:flex" on the <aside> to hide it on < md, or handle via the mobile sheet approach. The current code already had <DashboardSidebar className="hidden md:flex" />
github.com
. If we keep that, then DashboardSidebar doesn’t need to worry about responsiveness. Alternatively, we could always render it and hide via internal CSS. Keeping the parent control is fine.
Brand/Logo: At the top of the sidebar, we have the Lnked logo text:
jsx
Copy
Edit
<Link href="/" className="flex items-center gap-2 text-lg font-semibold px-4 mb-6">
  <span className="text-sidebar-primary">Lnked</span>
</Link>
This is currently how it’s done
github.com
. We should keep a recognizable branding there, but consider adjustments:
In the dashboard context, the brand might not need to be as prominent as on the landing page. We can perhaps make it smaller (text-lg is fine, could even be text-base if we want more compact).
Since we have the brand already at top of sidebar, we definitely want to hide the RootLayout header’s brand when on dashboard (to avoid seeing it twice).
The “text-sidebar-primary” class presumably makes the brand colored (maybe primary color). That’s fine – it gives a bit of accent in the sidebar logo.
In collapsed mode, we may want to show just an icon or a shorter logo. Perhaps we could display just the “L” or some logo icon. If no dedicated icon exists, maybe just the dot or first letter. A simple approach: when collapsed, hide the text “Lnked” and show just the dot (they have a dot in the brand in RootLayout, but here it’s just text).
If no icon, we could simply show “L” or something stylized. Alternatively, show the “Lnked” text but with sr-only and use a logo icon font if available.
For now, to keep it simple: In collapsed state, we can collapse this element entirely (maybe just show the colored dot or an initial). For example, we could use a styled div with letter “L” or use the existing brand span but with a CSS to only show first letter and dot.
This might be too detailed; an easier solution: when collapsed, we could hide the whole text but still keep maybe a 40px tall space for branding (with maybe the dot as a small decorative element).
Another tactic: Provide a tooltip on hover of the collapsed brand to show “Lnked”.
Given time, we can simply accept that collapsing the sidebar hides the brand text – the user likely knows the app name anyway.
Implementation: Wrap the brand in a container that we can toggle:
jsx
Copy
Edit
<div className={collapsed ? "px-4 mb-6 text-center" : "px-4 mb-6"}>
  <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
    <span className={collapsed ? "text-xl text-sidebar-primary" : "text-sidebar-primary"}>{collapsed ? "L" : "Lnked"}</span>
    { !collapsed && <span className="text-sidebar-primary">…</span> }
  </Link>
</div>
Actually, the dot is appended in RootLayout as a separate span
github.com
. In Sidebar, they didn’t include the dot (just “Lnked”). We could add a small dot here too if desired, but not necessary.
We’ll mention: consider using a shortened label or icon when collapsed.
Inject SidebarNav: After the logo section, include <SidebarNav collectives={props.collectives} collapsed={collapsed} />. This will render the nav sections. Pass the collapsed prop so it can render appropriately (especially to hide labels).
Bottom Create Post Button: The current code has a bottom-aligned “Create Post” button:
jsx
Copy
Edit
<div className="mt-auto px-4 py-4 flex justify-center">
  <Button variant="outline" size="sm" asChild className="w-full">
    <Link href="/dashboard/new-personal-post"><PlusCircle className="size-4 mr-2" />Create Post</Link>
  </Button>
</div>
Keep this functionality, but adjust styling for compactness:
It’s outline variant, small, full width which is fine. We might remove the left icon margin in collapsed mode.
When sidebar is collapsed, ideally this should also collapse to just an icon (plus tooltip). Perhaps we can reuse the same logic: if collapsed, render a circle icon button:
jsx
Copy
Edit
{collapsed ? (
  <Button asChild variant="outline" size="icon">
    <Link href="/dashboard/new-personal-post"><PlusCircle className="h-5 w-5" aria-label="Create Post" /></Link>
  </Button>
) : (
  <Button asChild variant="outline" size="sm" className="w-full">
    <Link href="/dashboard/new-personal-post"><PlusCircle className="h-4 w-4 mr-2" /> Create Post</Link>
  </Button>
)}
Note the use of size="icon" (a style likely existing for square icon-only buttons) for collapsed.
Also, give the icon an aria-label in collapsed mode since text is gone.
Keep this button aligned at bottom (mt-auto) so it always sits at the bottom of the sidebar column.
This button respects user’s ability to create content (links to personal post creation – possibly in future we might have collective post creation, but that’s beyond scope).
Responsive (mobile): Since we hide the aside on mobile (via parent class), the create post function should still be accessible via other UI (maybe via a “New Post” button on the headbar for mobile or via the mobile menu – but currently mobile menu doesn’t list it). We might consider adding “Create Post” as an item in the mobile sheet as well. Linear’s mobile experience is limited; but we can quickly allow creation via headbar: for example, on mobile, maybe show a small “+” icon on the headbar to create post (only visible on xs screens). This wasn’t requested, but thinking of consistency. We won’t delve deep; just note that when sidebar is not present on mobile, the user might click their profile or something to get to post creation if needed. However, since the question doesn’t raise it, we won’t focus on it here.
Components to Delete/Extract/Rename: We are not deleting DashboardSidebar (it remains the sidebar container). We extracted the nav link rendering to SidebarNav. So:
Remove the arrays mainNavItems, collectiveNavItems, settingsNavItems from this file
github.com
github.com
github.com
 and any mapping logic. That now lives in SidebarNav (with dynamic collectives). This simplifies DashboardSidebar.
Simplify the JSX accordingly: after the brand, just <SidebarNav ... /> and then bottom button.
Rename thoughts: The name DashboardSidebar is fine. If anything, now that SidebarNav exists, DashboardSidebar could be renamed to something like SidebarContainer or just remain as is since it’s the organism housing the nav. No strong need to rename.
New Components or Refactors Needed: Most changes here are integration of existing or new components:
Integrate the new SidebarNav as described.
We should ensure to thread through any required props: If DashboardSidebar itself receives the collectives list prop from DashboardShell, pass it into SidebarNav. Also pass the collapsed state (from DashboardShell via props).
Possibly, DashboardSidebar could itself manage the collapse state and context – but we decided to manage in DashboardShell to coordinate with headbar. So DashboardSidebar is mostly presentational, depending on collapsed prop.
Ensure to apply ref or semantics: The <aside> already has aria-label="Dashboard sidebar" in code
github.com
, which is good. We keep that for accessibility.
The color classes bg-sidebar, text-sidebar-foreground: ensure these are defined in Tailwind config. If not, consider using default bg-background text-foreground for simplicity. But presumably they exist to allow a slightly different shade. We might keep them for a subtle contrast (maybe the sidebar is a bit darker background).
Minor refactor: If needed, define a CSS transition for the width if collapsed. In Tailwind, we might add a utility via config or use inline style. Since this is a plan, we can just mention the transition; implementation can be done with a small CSS snippet:
css
Copy
Edit
.transition-width { transition: width 0.2s ease; }
and add that class.
Summarize atomic role: DashboardSidebar remains an organism composed of atoms (SidebarLink), molecules (SidebarNav, maybe the create post button or brand link can be considered atoms too). This refactor aligns it with Atomic Design by isolating the pure nav list into SidebarNav (which is like a molecule/organism of just nav items), and leaving the container to handle layout and branding.
src/components/app/SmoothScroll.tsx
Current Role & Structure: SmoothScroll is a utility component that initializes the Lenis smooth scrolling library on mount
github.com
github.com
. It attaches to the RAF loop and does not render any UI
github.com
. It’s included in RootLayout to globally enable smooth scrolling.
Required Edits for Linear-style Layout: The main concern is ensuring smooth scroll still works with our new layout:
Scroll Container: Currently, Lenis likely hooks into window scrolling. However, in our dashboard, we have an inner scrollable <main> for content (overflow-y in DashboardShell). This means the window itself might not scroll when content changes, the main element does. Lenis by default might not affect that, resulting in no smooth scroll in the dashboard content.
To address this, we have a couple of options:
Simplify the scroll model: Perhaps we decide to remove overflow-y:auto on the main content and let the entire page scroll. That would require making the sidebar position: sticky or fixed so it stays put. This is a larger change (and could break Lenis less). However, our current structure was chosen to allow sidebar fixed without extra code. We likely want to keep the inner scroll for now.
Configure Lenis to target the main content element instead of window. Lenis might support initializing with a custom wrapper or scroll target. We should research Lenis’s API for something like wrapper: element or content: element. If possible, update SmoothScroll to select the .overflow-y-auto container and call Lenis on that.
For example, if our main content has an id or ref (we could add an id to the main, like <main id="scrollable-content" ...>), then do: lenisRef.current = new Lenis({ wrapper: document.getElementById('scrollable-content'), smooth: true, ... }). We’d have to verify Lenis’s configuration options (likely out of memory scope, but assume it’s doable).
If Lenis cannot easily hook to a nested element, another approach is to make the entire <html> scroll smoothly and just keep the sidebar fixed via CSS. We could convert the sidebar to position: fixed (left 0, top 0, height 100%) instead of part of a flex. Then main content could have a left margin. This would let the page scroll normally (with Lenis). This is a valid alternative layout approach. However, implementing that requires careful adjustments for responsive and container widths.
Given time, we might choose to temporarily disable smooth scroll for the main content to avoid conflicts, or accept that on dashboard pages the smooth scroll might not apply. But since the user explicitly has SmoothScroll, better to keep it functional.
Action: Update SmoothScroll initialization:
Use a useEffect to query an element (maybe via a ref passed from DashboardShell). Alternatively, one can call lenisRef.current = new Lenis({ ... , lerp: 0.1, smooth: true, target: element }) if such option exists.
If not sure, we could check Lenis docs or test outside. But in plan, mention that we will attach Lenis to the scrollable content container. This ensures the smoothing applies to the dashboard feed scroll.
If unattainable easily, note as a caveat: possibly disable smoothing on that container and only have it on full-page scroll outside dash. (But that’s inconsistent.)
Performance: Ensure that the existence of multiple scroll containers doesn’t double-trigger Lenis. We likely will only run one Lenis instance for the main body. If we keep one global Lenis on document, it won’t catch inner div scroll. So switching to target main is needed.
Possibly, we could instantiate two Lenis: one for window (for normal pages) and one for the dashboard main container. But that’s overkill. Simpler: detect if on dashboard and target accordingly. We could utilize usePathname() inside SmoothScroll (since it’s client) to decide target:
tsx
Copy
Edit
const pathname = usePathname();
useEffect(() => {
  const scrollElement = pathname?.startsWith("/dashboard")
    ? document.querySelector(".dashboard-main") // e.g., add a class to main
    : window;
  lenisRef.current = new Lenis({ wrapper: scrollElement, ... });
  ...
}, [pathname]);
But Lenis might not accept window directly as wrapper (it defaults to document).
Alternatively, always use document as wrapper but set content to the main container.
Without exact API, we can only outline approach.
In summary, to align with redesign: we will either reconfigure Lenis or potentially reconsider the scroll strategy. We want to maintain smooth scroll because it’s a design element (modern feel).
This is a technical detail – the plan should mention it so developers can address it.
Components to Delete/Extract/Rename: None. We keep SmoothScroll; it’s a standalone utility. We may augment it with some logic as above. No need to rename.
New Components or Refactors Needed: Not a new component, but a refactor of SmoothScroll configuration:
Perhaps allow it to accept a ref or selector prop to scroll. Or the simplest is to update it internally after the DOM is ready.
Also ensure to test after changes: after implementing the new layout, scroll the dashboard page and confirm smooth effect. If not smooth, then adjust accordingly.
If Lenis is too rigid, another approach: apply CSS scroll-behavior: smooth; to the main content container in CSS for a basic smooth scroll (this only smooths anchor link jumps and programmatic scroll, not continuous scroll).
We want continuous smoothing (which Lenis provides), so ideally fix Lenis usage.
(This is a fairly technical point; including it shows thoroughness.)
src/components/app/nav/RouteProgress.tsx
Current Role & Structure: RouteProgress mounts a listener for Next.js route changes using usePathname() and triggers the NProgress progress bar on route transitions
github.com
. It doesn’t render visible UI, just controls the top loading bar (NProgress is configured globally to hide spinner and just show a thin bar
github.com
).
Required Edits for Linear-style Layout: This component can remain largely as is, but we will verify it fits the new design:
Styling: The NProgress bar by default is a thin blue line at top. We should ensure it’s styled to match our theme’s primary color. If not already overridden, we can add custom CSS for #nprogress .bar { background: var(--color-primary); }. Possibly the nprogress.css imported
github.com
 might be default (blue). We should override it to use our design tokens (for example, maybe bg-primary). If our Tailwind config maps text-primary to a CSS variable, we can use that variable in custom CSS.
If our primary color is a certain green/blue (not sure), we make the progress bar that color. This will ensure consistency with the design system.
The thickness is typically 2px; that’s fine and unobtrusive (Linear’s loading bar is also a small line).
Positioning: Since we have a sticky headbar of our own, we want the progress bar to appear at the very top of the page (not underneath the headbar). NProgress by default injects a <div id="nprogress"> at body end and sets CSS #nprogress { pointer-events: none; } #nprogress .bar { position: fixed; top: 0; left: 0; width: 100%; }. So it’s fixed to top of viewport, which will overlay our headbar at the very top edge. This is fine – the bar will be visible above or on top of the headbar content for a brief moment. If the headbar has a border or different color, the bar should still be noticeable. Because our headbar is also at top 0, the bar will overlap its top border. That’s acceptable, as the bar is just 2px. If we want it above everything, we could increase its z-index. But likely default z-index is high enough or we can set it to, say, 999. Our headbar z-50 is equivalent to 2000 in CSS (since tailwind z-50). Not sure NProgress default, but often it’s 1031. To be safe, we might set in CSS: #nprogress .bar { z-index: 9999; } so it’s always on top of any UI.
After route loads, NProgress finishes and the bar goes away, so no lasting layout issues.
No Functional Changes: The logic of starting on path change and ending after a 300ms delay is fine
github.com
. It ensures a short flash for quick routes which is okay.
Components to Delete/Extract/Rename: None – keep RouteProgress as is.
New Components or Refactors Needed: None new. Just ensure the styling customizations:
Possibly add a tiny CSS override file for NProgress (if not done). The import nprogress.css might be a default. We can either override in globals.css by adding:
css
Copy
Edit
#nprogress .bar {
  background-color: rgb(var(--color-primary)); /* assuming --color-primary is defined for primary */
}
#nprogress .peg { background: ... } /* if needed, but spinner disabled so maybe not needed */
Where --color-primary is set by our theme (like in :root or dark mode classes).
Confirm that in dark mode, the same color is used or if a different color is desired for contrast (likely same primary).
If our primary is a bright color that works on both backgrounds, fine.
New Proposed Components:
CollectiveSelectorDropdown (Molecule): A reusable dropdown for selecting a collective from the user’s memberships.
Implement with Radix Select: a trigger button showing the current collective name (or “All Collectives”), and a list of options (All + each collective’s name).
Style the trigger as a small outline or ghost dropdown (to match input styles). Perhaps use Button variant="outline" styling for the closed state.
The options list should appear as a popover. Each option styled with px-3 py-1.5 text-sm hover:bg-muted cursor-pointer. Use Radix’s Select.Item and Select.ItemText for accessibility. Mark the selected item with a check icon or bold text. Radix can provide Select.ItemIndicator for the checkmark.
Ensure it’s keyboard navigable and accessible (Radix handles most of that).
This component will take props: collectives: CollectiveSummary[], value: string | null (the current collective id or "all"), and onChange(newValue) callback.
It will likely live in components/app/dashboard/molecules (or in nav folder as it’s nav-related).
Use it in DashboardNav when feedType is “collective”. The onChange can trigger filtering or navigation as decided.
Example usage in DashboardNav:
jsx
Copy
Edit
{feedType === 'collective' && (
  <CollectiveSelectorDropdown 
     collectives={collectives} 
     value={currentCollectiveId} 
     onChange={id => setCurrentCollectiveId(id)} 
  />
)}
where currentCollectiveId could be state in DashboardNav or lifted.
This new component promotes reusability (if there are other places to select a collective, like maybe on new post form to choose which collective to post to).
Atomic: It’s a molecule (combines a button, list items, Radix behavior).
MiniHeaderBar / DashboardNav (Organism): As we have detailed, this is essentially created. It’s the combination of controls at the top of the dashboard. (We’ve used the name DashboardNav for it).
It includes atomic pieces (toggle button, mode toggle, user menu trigger) and molecules (CollectiveSelectorDropdown, maybe a FeedToggle if separated, and possibly the user dropdown).
We’ve integrated its creation above.
UserMenu (Molecule): A dropdown menu for user actions.
Possibly implement with Radix DropdownMenu. Contains a trigger (avatar icon) and <DropdownMenu.Content> with <DropdownMenu.Item>s.
Items: “Profile & Settings” (navigates to /dashboard/profile/edit), “Sign Out” (calls supabase signOut).
We can also include the theme toggle here if we wanted to consolidate, but we chose to show ModeToggle separately for quick access.
Styling: similar to a context menu. Use bg-popover text-foreground p-1 for the menu container and text-sm px-2 py-1.5 rounded hover:bg-muted for items.
This would be used in DashboardNav. Could also be reused later in Navbar (if we wanted a dropdown there instead of separate buttons).
Atomic: molecule (combining avatar trigger and list of actions).
If we don’t want a separate component file, we could implement inside DashboardNav. But making it separate keeps DashboardNav cleaner.
MobileSidebarSheet (Organism/Molecule): If we decide to factor out the mobile drawer logic from DashboardNav, this could be a component.
It would wrap Radix <Sheet> logic, and inside SheetContent render <SidebarNav> (maybe with an onSelect to close the sheet when link clicked).
This is an optional abstraction. We might just do it inline in DashboardNav for now.
If separate, it’s still a part of nav domain.
By implementing and integrating all the above, we end up with:
A persistent small headbar (DashboardNav) with collapse toggle, feed toggle, collective dropdown, and user controls.
A full-height sidebar (DashboardSidebar + SidebarNav) similar to Linear’s, supporting collapsible icons and nested sections.
Focus on feeds: the UI now clearly presents a toggle for personal vs collective content, and a way to filter collectives, fulfilling the “two main feed types” focus.
All using existing data (we use user’s collectives membership via Supabase queries we already have).
Consistent styling: Tailwind classes referencing design tokens ensure dark mode compatibility. Radix UI components used for complex UI (Sheet, Select, Menu) ensure accessibility.
This plan lays out the changes file by file, providing a clear roadmap for engineering to implement the new dashboard design in an atomic, maintainable way.

<PLANNING> Dashboard Redesign Implementation Steps
Step 1: Data & Layout Foundation
Refactor src/app/dashboard/layout.tsx to:
Fetch all user collectives (owned + joined) server-side.
Pass this data as a prop to DashboardShell.
(Optionally) Add a dashboard-specific class to <body> or <html> for CSS overrides.
Step 2: DashboardShell Refactor
Refactor src/components/app/dashboard/template/dashboard-shell.tsx to:
Accept userCollectives and pass to sidebar/headbar.
Integrate new DashboardNav (headbar) and refactor flex layout.
Add state for sidebar collapse and propagate to sidebar/nav.
Remove any direct use of the old Navbar.
Step 3: Sidebar & Navigation Extraction
Refactor or create:
dashboard-sidebar.tsx (organism): Container for sidebar, handles collapse, branding, and bottom button.
SidebarNav.tsx (molecule): Extract nav list/sections from sidebar, support collapsed mode, tooltips, and dynamic collectives.
sidebar-link.tsx (atom): Support collapsed mode, tooltips, and aria-labels.
Step 4: DashboardNav (Headbar) Implementation
Create/refactor:
DashboardNav.tsx (organism): Top bar with sidebar toggle, feed toggle, collective dropdown, user menu, and mode toggle.
CollectiveSelectorDropdown.tsx (molecule): Radix Select for collectives.
UserMenu.tsx (molecule): Radix DropdownMenu for profile/sign-out.
(Optional) MobileSidebarSheet.tsx for mobile nav.
Step 5: Root Layout & Global UI Adjustments
Refactor:
src/app/layout.tsx to not render header/footer on dashboard pages (via Navbar logic or CSS).
Navbar.tsx to return null on dashboard routes.
Footer.tsx to not render on dashboard routes.
Step 6: Utility & Experience
Update:
SmoothScroll.tsx to target dashboard main scroll area if needed.
RouteProgress.tsx to ensure correct z-index and color.
Step 7: CSS & Theming
Update:
globals.css for any dashboard-specific overrides (container, header/footer hiding, nprogress color).
Step 8: Remove/Extract Obsolete Files
Remove:
template/sidebar.tsx if not used.
