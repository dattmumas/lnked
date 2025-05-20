Task 4: Adopt New Editor Layout & Improve Editor UX
Goal: Refactor the post editor interface to use the improved layout pattern, enhancing usability. Remove outdated UI elements and integrate settings (metadata) into a sidebar for a cleaner experience.
Scope & Actions:
Upgrade EditorLayout Component: Modify EditorLayout to support a right-hand sidebar for post settings and an optional page title/header. The current implementation only handles a left fileExplorer and top metadataBar
github.com
github.com
, but our usage in EditPostForm passes settingsSidebar and pageTitle
github.com
. Update EditorLayout props to include settingsSidebar?: ReactNode and pageTitle?: string, and adjust its JSX to render a two-column layout when a settings sidebar is provided
github.com
. For example, you can wrap the main content and sidebar in a flex container with the sidebar on the right. Include styling (Tailwind classes or CSS) so that the editor canvas and sidebar both scroll if content overflows.
Integrate PostFormFields in Sidebar: Remove the old top metadata bar that contained Publish buttons or title inputs. Instead, use the existing PostFormFields component (which includes Title, Status, Publish Date, etc.) as the settingsSidebar content in EditorLayout
github.com
. In NewPostForm and EditPostForm, pass <PostFormFields … /> to the EditorLayout’s sidebar prop. This moves all post metadata controls to the sidebar, aligning with the new design for a cleaner top area.
Remove Unused File Explorer: The left FileExplorer panel was intended for draft lists but is not populated (currently we see it being passed empty arrays
github.com
). Following the updated design, eliminate the file explorer from the editor screen. This means we can stop rendering <FileExplorer> in NewPostForm
github.com
and update EditorLayout to omit the left sidebar entirely if not needed. By dropping this, the editor focuses on the content, and it avoids confusing the user with an empty panel. (The dashboard already provides a post list, so an in-editor list is redundant.)
SEO Settings Access: Ensure authors can manage SEO settings (meta title & description) in the new layout. The previous approach included an SEOSettingsDrawer component toggled from the editor
github.com
. In the new layout, provide a button or link in the sidebar, e.g. “SEO Settings”, that opens the <SEOSettingsDrawer> modal. This button can reside below the PostFormFields in the sidebar. Make sure that functionality (like updating the SEO fields and closing the drawer) still works after the layout refactor.
Finalize Toolbar and Title: With metadata moved to the sidebar, repurpose the top bar if needed. For example, the pageTitle prop of EditorLayout can display “Edit Post” or “New Post” (with collective name if applicable) as a heading at the top of the editor. Implement this: if pageTitle is provided, render it in a header area (maybe reuse the metadataBar slot or create a small header above the toolbar). This gives context (especially useful if multiple tabs are open). Also ensure the main toolbar with formatting options remains visible. After these changes, the editor UI will be cleaner and more intuitive, with all post settings in one place (sidebar) and content editing in the main area

.
