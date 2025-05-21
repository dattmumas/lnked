3. Update Next.js App Router API Usage (useRouter, notFound, headers, etc.)
Root Cause: Some Next.js App Router APIs are being used in the wrong context or have moved in newer versions. The upgrade to Next 15 means certain functions need to be imported/used differently. For example, useRouter must only be used in Client Components, and Next’s notFound/redirect functions should be used instead of manual 404 routes. The headers() and cookies() utilities may have changed to async in the new version, affecting how they’re used.
Solution – Hooks (useRouter, usePathname): Audit all components using Next navigation hooks. Ensure that any component calling useRouter or usePathname is marked with "use client" at the top. For instance, src/components/Navbar.tsx imports usePathname and useRouter from "next/navigation"
github.com
 – this file already has "use client"
github.com
, which is correct. If you find any server components trying to use these hooks (which would throw a TS error), refactor them to either be client components or remove the hook usage. In practice, most such hooks (for navigation or pathname) should stay in client-side interactive components only.
Solution – notFound and redirect: Continue to use notFound() and redirect() from 'next/navigation' in Server Components to handle error states, but ensure they are imported from the correct module and used in proper contexts. In Next 15, these functions are still available in next/navigation (and they throw to halt rendering). For example, in src/app/posts/[postId]/page.tsx, keep import { notFound } from 'next/navigation' and calls to notFound() on error conditions
github.com
. Likewise, use redirect() from next/navigation for auth redirects (as seen in src/app/dashboard/page.tsx where we redirect if no session
github.com
). The key is to ensure TypeScript knows these calls never return. If TypeScript complains about code after a notFound()/redirect() call (e.g., “might be undefined” because it doesn’t realize execution stops), you can explicitly mark those functions as returning never or add a return statement after the call to satisfy the compiler. In practice, Next’s types usually define notFound() and redirect() as throwing errors (type never), so updating to the latest next types should resolve that.
Solution – headers() and cookies(): In Next 13, headers()/cookies() were synchronous, but in Next 15 these may be async. Update their usage accordingly:
In server components (e.g., src/app/layout.tsx), call them with await. The root layout is already doing this for headers
github.com
, which is correct if headers() returns a Promise. Double-check any other usage. For example, in src/app/layout.tsx:
ts
Copy
Edit
const headersList = await headers();
const pathname = headersList.get('next-url') || '';
is fine. Just ensure the function signature matches (if headers() is now defined to return Promise<Headers> in Next’s types, the await is needed; if it’s still sync, remove the unnecessary await to appease TS).
In API route handlers, prefer using the Request object’s headers instead of the global headers() util. For instance, in src/app/api/stripe-webhook/route.ts, instead of:
ts
Copy
Edit
const sig = (headers() as unknown as Headers).get('stripe-signature');
do:
ts
Copy
Edit
const sig = req.headers.get('stripe-signature');
Here req is the NextRequest or Request passed into the route function. This change removes the need for the unknown cast
github.com
 and uses the standard Web API Headers type, satisfying TypeScript. Similarly, use req.cookies via the NextRequest if needed, or the cookies() util with await in other server contexts.
Solution – App Router conventions: Add a global not-found.tsx in the app directory (or within relevant routes) to properly handle 404 states. This is optional but recommended with App Router – when you call notFound(), Next.js will render the nearest not-found.tsx. If such a file is missing, you might get a generic error. Creating a simple app/not-found.tsx page that shows a 404 message will improve this. Also consider adding an error.tsx for error boundaries if not present (to catch unhandled errors). Ensure no legacy APIs like getServerSideProps or next/router are being used – a quick search confirms none are present, which is good. After these adjustments, all code will align with Next.js 15’s App Router practices, eliminating the “removed or unavailable export” errors for useRouter, notFound, etc.
