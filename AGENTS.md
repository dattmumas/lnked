Step 4: Refactor the post editor routes under an (editor) group layout
Scope: Use a dedicated route group for the post editor interface (creating or editing posts) to provide a tailored layout and eliminate the special-case code in the root layout. Currently, the app’s root layout manually checks if the path is /posts/new or /posts/[id]/edit to hide the navbar and footer
github.com
github.com
. We will replace that hack with an (editor) layout that intentionally provides a minimal or custom frame for the editor. This step will consolidate all editing UI and ensure it doesn’t inadvertently inherit styling or chrome from other layouts.
Affected Files:
Ensure all editor-related pages are under src/app/(editor)/. From our codebase, they already are: we have src/app/(editor)/posts/new/page.tsx and src/app/(editor)/posts/[postId]/edit/page.tsx implemented
github.com
github.com
. We will add src/app/(editor)/layout.tsx for this group.
In (editor)/layout.tsx, we likely want to render just {children} without any header or sidebar – the post editor is typically a fullscreen experience. If there are editor-wide components (for example, a toolbar or a persistent file explorer across all editor pages), we could include them here. In this case, much of the editor UI (like toolbars, title input, settings drawer, etc.) is part of the specific pages/components themselves (e.g. <EditorLayout> component is used inside the forms
github.com
github.com
). So the (editor) layout can be extremely minimal, perhaps just ensuring the page stretches full viewport height and inherits the theme provider from root.
Remove the editor-specific conditional logic from RootLayout. In step 1 we removed the nav/footer, but we also have some styling conditional: the root layout applied a different container class when isEditorPage was true
github.com
. This was a workaround to make the editor use full width. Now, with a dedicated layout, we can drop that logic. The root can treat all pages uniformly, and the (editor) layout (or the editor page components themselves) will handle any necessary width/fullscreen styles. For example, we might set a global class in (editor)/layout.tsx like <body className="overflow-hidden"> if needed, or simply rely on the editor components’ CSS (the Editor components already use .h-screen and flex layouts to occupy the viewport
github.com
). Essentially, by the end of this, RootLayout should no longer need to know anything about “editor pages.”
Confirm that the editor pages themselves still provide the necessary UI. For instance, in the EditPostForm component, they import and use an <EditorLayout> (a UI component) to structure the editor toolbar, canvas, and settings sidebar
github.com
github.com
. That will remain as is – we are not removing those. Our (editor) layout will wrap the entire page, but the page content already invokes EditorLayout, meaning the editing interface remains unchanged. We just need to ensure no extraneous padding or container from a parent layout interferes. By removing root’s container, the editor pages should now truly go edge-to-edge as intended. If needed, we can add a tiny bit of global CSS in (editor)/layout (for example, to neutralize any parent container class, though it shouldn’t apply anymore).
Test Updates: The main thing to verify is that all behaviors around post creation/editing and related navigation still work, and tests reflect the changes:
Unit tests: If there are tests for editor components or actions (e.g. testing the EditPostForm submission or the postActions), they shouldn’t be affected by the route grouping. If any test was shallow-rendering the entire app around an editor route, it might now need to include the (editor) layout context. But typically, tests focus on the forms and logic, not the Next.js layout wrappers.
E2E tests: We should run the post creation flow test. For example, the post-create.spec.ts ensures an unauthenticated user going to /posts/new is redirected to sign-in
github.com
. This should still pass – our (editor) layout doesn’t override the middleware or auth redirect; in fact, the middleware’s requiresAuth covers /posts/new and will send the user to /sign-in as before
github.com
. After login, there might be a test that the new post page loads and can be submitted – ensure that flow still works. The UI might have one subtle difference: previously, the root layout applied a padding on main for non-editor pages but not for editor pages
github.com
. Now, the editor page content might start at the very top of the viewport. If this reveals any styling issues (e.g. the editor’s own top bar might be flush with the very top edge), we can adjust the CSS in (editor)/layout or within Editor components to add a tiny top margin. However, given that EditorLayout already includes a top border and padding for the title bar
github.com
, it likely looks fine.
Check any test around navigating back from editor or the presence of certain elements. If, for example, there was a test expecting the main navbar not to appear on an edit page (which was ensured by root’s logic), that condition is inherently true now (navbar is only in public layout). There might not be an explicit test for that, but we have effectively satisfied the requirement by design.
Expected Outcome: The post editor interface is cleanly separated in the (editor) group. When a user goes to create or edit a post, they now get a dedicated layout with no top nav, no footer, and full-screen real estate for the editor – exactly as intended. The transition from the dashboard to the editor is smoother: clicking “Add Post” from the dashboard now navigates to /posts/new which loads under the editor layout (with no flash of the main site header). Developers no longer have to maintain tricky exceptions in the root layout for editor pages; the layout concern is handled by Next.js’s grouping. Everything from the rich text editor to the SEO sidebar continues to function as before. Importantly, at this stage, we have removed all redundant or ambiguous route patterns related to editing – there is a single, clear URL for new posts (/posts/new) and editing (/posts/[id]/edit), both under the proper layout. The app’s visuals should remain consistent (aside from the intentional removal of outer chrome in the editor), and tests for editor functionality and routing should all pass.
