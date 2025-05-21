2. Correct Dynamic Route Parameter Types
   Root Cause: The dynamic route page components were typed incorrectly – they expected params as a Promise of an object, then used await params. This is not how Next App Router passes route params to page components. In Next.js App Router, params is provided as a plain object (synchronous) containing the dynamic segment values. The TypeScript inference breaks because the signature is wrong
   github.com
   github.com
   .
   Solution: Adjust the function signature of all dynamic route pages to accept params as a normal object, not a Promise. For example, in src/app/posts/[postId]/page.tsx change:
   ts
   Copy
   Edit
   export default async function IndividualPostViewPage({
   params,
   }: {
   params: Promise<{ postId: string }>;
   }) {
   const { postId } = await params;
   // ...
   }
   to:
   ts
   Copy
   Edit
   export default async function IndividualPostViewPage({
   params,
   }: {
   params: { postId: string };
   }) {
   const { postId } = params;
   // ...
   }
   Do this for each page with dynamic route params. Notably:
   src/app/posts/[postId]/page.tsx – accept params: { postId: string } and use params.postId directly
   github.com
   .
   src/app/[collectiveSlug]/[postId]/page.tsx – accept params: { collectiveSlug: string; postId: string } and use directly
   github.com
   .
   src/app/(editor)/posts/[postId]/edit/page.tsx – accept params: { postId: string } instead of Promise
   github.com
   .
   With these changes, TypeScript can correctly infer the types of route params. You’ll also remove the unnecessary await on params, since the object is available synchronously. This fixes the invalid type inference and eliminates related TS errors.
