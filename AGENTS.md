Task 3: Harden Post Creation Features (Unify Personal vs Collective Posts)
Goal: Make the post creation workflow robust by unifying duplicate code paths and ensuring all edge cases are handled. This addresses the transition to a single “New Post” implementation for both personal newsletters and collectives.
Scope & Actions:
Unify New Post Forms: Merge the logic of personal and collective post creation into a single component. Currently, the app uses NewPostForm (for personal posts under /posts/new) and previously had a separate NewCollectivePostForm. We see that the collective route now simply redirects to the unified form
github.com
github.com
. Complete this unification by removing any remaining NewCollectivePostForm references or files and ensuring NewPostForm can handle both cases via props or context (it already accepts an optional collective prop
github.com
).
Shared Form Schema: Use a common Zod schema for post content requirements. The NewPost form’s schema enforces content length and publish date rules
github.com
github.com
. Ensure the EditPost form uses the same core rules. By consolidating these validations, a “Post must have at least 10 characters of meaningful text” rule, for example, is consistently applied everywhere.
Conditional UI for Collective Context: Update the form UI to reflect collective context when present. For instance, if a collective prop is passed to NewPostForm, display an indication like “New Post in Collective Name” in the form header or title. (The agent notes suggest showing this in a page title
github.com
github.com
.) This can simply be a heading at the top of the form or a label in the form fields, so users know which collective they are posting to.
Cleanup Old Routes: Since /dashboard/[collectiveId]/new-post now redirects to the unified route
github.com
, remove any obsolete route components or links that pointed to the old separate form. Ensure that all “Add Post” buttons or links (e.g. on a collective’s dashboard page) direct to /posts/new?collectiveId=XYZ. Consistently using the unified route prevents confusion and ensures one code path is tested and maintained.
Authorize Collective Posts: Double-check that the server-side logic prevents unauthorized users from creating posts in a collective. The posts/new page already checks membership roles and redirects if the user isn’t an admin/editor/author of that collective
github.com
. Ensure similar checks exist for other actions (like editing posts) and that they use the unified logic (for example, after form submission, the creation action should verify the user’s right to post in that collective). Strengthening these checks guards against URL manipulation or misuse.
