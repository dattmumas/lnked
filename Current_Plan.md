Lnked Codebase Audit – Issues and Recommendations
Critical Issues
Session Cookie Not Persisted on Login (Critical)
File: src/app/(auth)/sign-in/page.tsx (SignInPage component) and src/middleware.ts
Problem: After a user signs in, the session is not persisted to a cookie, causing protected routes (e.g., /dashboard) to immediately redirect back to the sign-in page. The client-side login uses Supabase’s signInWithPassword and then navigates to /dashboard without establishing a server-known session
github.com
. Meanwhile, the middleware and server layouts expect a valid session cookie; if none is set, they redirect unauthenticated users away from protected pages
github.com
. This results in an infinite login loop: the user appears to log in on the client, but the server doesn’t recognize the session, forcing a redirect back to login.
Severity: Critical – Users cannot access authenticated content at all.
Recommendation: Implement Supabase’s auth cookie syncing. Use the Supabase Auth Helpers pattern to set a secure HTTP-only cookie on sign-in and clear it on sign-out. This typically involves listening for auth state changes on the client and calling a Next.js Route Handler (or API route) to persist the session server-side. Ensure that onAuthStateChange triggers a fetch to a new endpoint (e.g., /api/auth/callback) with the session, and that endpoint uses createServerClient to set or remove the auth cookie. This will allow the server (middleware, server components) to see the session. Additionally, re-enable redirecting already-authenticated users away from the sign-in/up pages (the logic in middleware.ts is currently commented out
github.com
). Fix – Example Implementation: Below are two snippets: one for updating the client to send the auth event to the server, and one for a new route handler to set the cookie.
tsx
Copy
Edit
// src/components/Navbar.tsx (excerpt)
// ... inside useEffect that subscribes to auth state changes:
useEffect(() => {
const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
setUser(session?.user ?? null);
// Sync session to server cookie on sign-in/sign-out
fetch("/api/auth/callback", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ event, session }), // send event and session data
});
});
return () => {
authListener?.subscription.unsubscribe();
};
}, [supabase]);
ts
Copy
Edit
// src/app/api/auth/callback/route.ts (new file)
// Purpose: handle Supabase auth events and set/remove cookies using the server client
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/database.types";

export async function POST(request: Request) {
const { event, session } = await request.json();
const cookieStore = cookies(); // Next.js cookie helper
const supabase = createServerClient<Database>(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
{ cookies: cookieStore }
);

if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
// Set the Supabase session cookie for SSR – provides the access & refresh tokens
await supabase.auth.setSession(session);
} else if (event === "SIGNED_OUT") {
await supabase.auth.signOut();
}
return NextResponse.json({ status: "success" });
}
After this change, the middleware will find a valid session cookie after login and allow navigation to /dashboard. Also, consider uncommenting or reinstating the middleware logic to redirect logged-in users away from /sign-in and /sign-up
github.com
for a smoother experience.
Major Issues
Redundant Supabase Client Instances (Major)
File: Multiple (e.g., src/components/Navbar.tsx, src/components/PostCard.tsx, etc.)
Problem: The code creates a new Supabase client on each usage of createSupabaseBrowserClient() instead of reusing a single instance. For example, the Navbar component calls this function inside the component body
github.com
, meaning every render could initialize a new client. This leads to duplicate event listeners and unnecessary memory usage. It also causes multiple parallel connections and potential state inconsistencies (though Supabase’s internal sync via localStorage/BroadcastChannel mitigates some issues). Overall, this is inefficient and could introduce subtle bugs (e.g., multiple onAuthStateChange subscriptions running).
Severity: Major – Affects performance and maintainability (multiple clients track auth state independently).
Recommendation: Use a single shared Supabase client instance. The project already exports a default client in src/lib/supabase/browser.ts
github.com
, so import and use that instead of calling the factory repeatedly. Alternatively, wrap createSupabaseBrowserClient in a useMemo or context so it doesn’t recreate the client on every render. This ensures one source of truth for auth state and fewer network calls. Fix – Use Shared Supabase Client: Here we refactor the Navbar to use the singleton client. Similar changes should be applied to other components (PostCard, auth pages, etc.) that call createSupabaseBrowserClient on each render.
tsx
Copy
Edit
// src/components/Navbar.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import supabase from "@/lib/supabase/browser"; // import the shared Supabase client instance
import type { User } from "@supabase/supabase-js";
import { Button } from "./ui/button";
// ... (other imports remain unchanged)

export default function Navbar() {
const router = useRouter();
const pathname = usePathname();
const [user, setUser] = useState<User | null>(null);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
// Fetch current user using shared Supabase client
supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
setUser(currentUser);
setIsLoading(false);
});
// Subscribe to auth changes on the singleton client
const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
setUser(session?.user ?? null);
});
return () => {
authListener.subscription.unsubscribe();
};
}, []); // no supabase in dependency, using singleton

// ... rest of component unchanged ...
}
This change ensures all components use the same Supabase client instance, preventing duplicate connections and keeping auth state in sync across the app.
Inconsistent User Profile Data Synchronization (Major)
File: src/app/dashboard/nav/DashboardNav.tsx and profile management in src/app/actions/userActions.ts
Problem: There are two sources of truth for user info (full name, avatar, etc.): the Supabase Auth user metadata and the separate users table in the database. On sign-up, the app stores the user’s name in the auth metadata (full_name in user_metadata)
github.com
. However, profile updates (e.g., editing name or bio) are applied to the users table
github.com
, and the Dashboard’s navigation bar (DashboardNav) does not fetch the updated data from this table – it only calls supabase.auth.getUser()
github.com
. This means changes to profile (full name or avatar URL) might not reflect in the UI header, causing stale or inconsistent display of user info.
Severity: Major – Data inconsistency can confuse users (e.g., editing profile appears to do nothing in the navbar).
Recommendation: Resolve to a single source of truth for user profile data. The simplest approach is to have the client fetch fresh profile info from the database whenever needed (or sync the Supabase auth metadata when profiles update). For example, update DashboardNav to load the user’s profile from the users table (using the user’s ID) and update the state. Alternatively, upon profile update, also call Supabase Auth API to update the user’s metadata so that auth.getUser() returns current info. The first approach is shown below for clarity. Fix – Fetch updated profile in DashboardNav: This snippet modifies DashboardNav’s effect to retrieve the latest profile record and use it for display.
tsx
Copy
Edit
// src/components/app/dashboard/nav/DashboardNav.tsx (excerpt)
useEffect(() => {
const supabase = createBrowserClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
supabase.auth.getUser().then(async ({ data }) => {
if (data.user) {
const { id, email } = data.user;
// Fetch the corresponding profile from the 'users' table
const { data: profile } = await supabase
.from("users")
.select("full_name, avatar_url")
.eq("id", id)
.single();
setUser({
email: email ?? undefined,
avatar_url: profile?.avatar_url || undefined,
full_name: profile?.full_name || undefined,
});
} else {
setUser(null);
}
});
}, []);
With this change, the dashboard top bar will reflect updates made in the Edit Profile form. As an alternative, consider using a single users table for all profile info (and not relying on Supabase auth metadata at all), or updating the auth metadata when profile changes. Ensuring consistency will improve user experience.
Minor Issues
Authentication Page Layout Overflow (Minor)
File: src/components/app/auth/AuthForm.tsx (used by SignIn and SignUp pages)
Problem: The auth pages are meant to display a centered form card. However, the container <div> in AuthForm uses min-h-screen (100vh) inside the global layout
github.com
. Since the global layout already includes a header (and a footer) occupying part of the viewport
github.com
, the additional 100vh minimum height on the form container causes overflow (extra blank space requiring scroll). Essentially, the page’s content can exceed the screen height by the height of the header/footer. This is a UX bug causing a stray scrollbar and misaligned centering.
Severity: Minor – Visual/Layout bug, does not break functionality but affects polish.
Recommendation: Remove or adjust the min-h-screen style on the auth form container. The form can be centered with flex utilities or padding without forcing a full viewport height. For example, use min-h-[calc(100vh-4rem)] (subtracting header height) or simply rely on the parent flex layout. A simpler fix is to drop min-h-screen so that the form container sizes to its content and uses padding for spacing. Fix – Remove full-height styling on AuthForm:
diff
Copy
Edit

- <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4 md:p-6">

* <div className="flex items-center justify-center p-4 md:p-6 bg-muted/40 min-h-full">
      <Card className="w-full max-w-sm">
        ... form contents ...
      </Card>
  </div>
  In the above replacement, the container will only be as tall as needed (with min-h-full ensuring it expands in the main area). This prevents the double-scroll issue while still centering the card within the available space. Adjust or add responsive top/bottom padding as needed for proper spacing.
  Missing Auth Redirect for Logged-in Users (Minor)
  File: src/middleware.ts
  Problem: The middleware contains commented-out code intended to redirect authenticated users away from the sign-in and sign-up pages
  github.com
  . As a result, a logged-in user can manually navigate to /sign-in or /sign-up, which is undesirable (they would see a login form despite already being logged in). This is a minor flow issue that could confuse users or allow strange states (especially once the session cookie issue is fixed).
  Severity: Minor – Does not prevent core functionality, but it is a polish/auth flow concern.
  Recommendation: Re-enable the redirect for authenticated users on auth pages. This ensures that once logged in, the user is always forwarded to the dashboard (or appropriate page) if they try to access auth-only routes. It improves flow and security by not exposing login forms to already-authenticated users. Fix – Enable authenticated redirect in middleware:
  ts
  Copy
  Edit
  // src/middleware.ts
  if (session && (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";  // redirect logged-in users to dashboard
    return NextResponse.redirect(url);
  }
  With this change, the middleware will send logged-in users to the dashboard instead of showing the sign-in/up pages. This complements the cookie fix and ensures a smooth navigation experience.
  Informational / Code Quality
  Supabase Types and Duplicated Logic (Informational)
  Observation: The project declares a module @supabase/ssr with any types
  github.com
   to import createBrowserClient and createServerClient. This avoids TypeScript errors but sacrifices type safety – potential misuses of Supabase client methods won’t be caught at compile time. Additionally, the logic to create Supabase server clients (with cookie handling) is repeated in many places (middleware, server actions, route handlers). This duplication can lead to inconsistent behavior if one instance is modified.
  Severity: Informational – These are not immediate bugs, but technical debt.
  Recommendation: Import official Supabase helpers with proper types (e.g., use @supabase/auth-helpers-nextjs and its createServerComponentClient, etc., which provide TypeScript definitions for auth.setSession, etc.). This would eliminate the need for the declare module "@supabase/ssr" hack and improve confidence in refactors. Moreover, consider centralizing Supabase client initialization for server-side code. For example, create a wrapper function in one place (in src/lib/supabase folder) to get the server client given a Next.js cookies helper, so that all server actions and route handlers call the same utility. This ensures any changes to auth or cookie handling are made in one location. Consolidating this logic will reduce errors and ease future maintenance.
  Conclusion: The audit identified several issues, primarily around the authentication flow and recent layout changes. Addressing the Critical item (auth cookie persistence) is top priority to make the app usable. Next, resolving the Major issues will improve the app’s stability and consistency (single Supabase client instance and profile data alignment). The Minor issues, while not breaking functionality, are important for user experience polish (layout correctness and proper redirects). By implementing the recommended fixes above – complete with provided code snippets – the Lnked application will become more robust, maintainable, and user-friendly
  github.com
  github.com
  . Each fix is aligned with best practices for accessibility, maintainability, and performance, ensuring the platform remains solid as it evolves.
