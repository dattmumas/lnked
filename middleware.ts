import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

const AUTH_COOKIES = [
  "sb-access-token",
  "sb-refresh-token",
  "supabase-auth-token",
];
const SECURE_OPTS: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
};
const USER_SLUG = /^[A-Za-z0-9_-]{1,32}$/;

const clearAuthCookies = (res: NextResponse) =>
  AUTH_COOKIES.forEach((c) =>
    res.cookies.set(c, "", { ...SECURE_OPTS, maxAge: 0 }),
  );

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* ---------- Vanity @username rewrite (sanitised) ---------- */
  if (pathname.startsWith("/@")) {
    const usernameSegment = pathname.slice(2).split("/")[0] ?? "";
    const username: string = usernameSegment;
    if (!USER_SLUG.test(username))
      return NextResponse.redirect(new URL("/404", request.url));
    const rest = pathname.slice(2 + username.length);
    const url = request.nextUrl.clone();
    url.pathname = `/profile/${username}${rest}`;
    return NextResponse.rewrite(url);
  }

  /* ---------- Route classification ---------- */
  const requiresAuth =
    pathname.startsWith("/dashboard") ||
    pathname === "/posts/new" ||
    pathname === "/chat" ||
    (pathname.startsWith("/posts/") && pathname.endsWith("/edit"));

  const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up";
  if (!requiresAuth && !isAuthPage) return NextResponse.next();

  /* ---------- Supabase client ---------- */
  if (
    !process.env['NEXT_PUBLIC_SUPABASE_URL'] ||
    !process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
  )
    return NextResponse.error(); // env mis-config

  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL'],
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (n, v, o) => {
          response.cookies.set(n, v, { ...SECURE_OPTS, ...o });
        },
        remove: (n, o) => {
          response.cookies.set(n, "", { ...SECURE_OPTS, maxAge: 0, ...o });
        },
      },
    },
  );

  /* ---------- Auth flow ---------- */
  const {
    data: { session },
  } = await supabase.auth
    .getSession()
    .catch(() => ({ data: { session: null } }));

  // Protected route without session → purge + redirect
  if (requiresAuth && !session) {
    clearAuthCookies(response);
    const url = new URL("/sign-in", request.url);
    url.searchParams.set(
      "redirect",
      pathname.startsWith("/") ? pathname : "/dashboard",
    );
    url.searchParams.set("purge", "1");
    return NextResponse.redirect(url, 307);
  }

  // Auth page with session → bounce to dashboard
  if (isAuthPage && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url), 302);
  }

  /* ---------- Extra security headers ---------- */
  if (requiresAuth) {
    response.headers.set("Content-Security-Policy", "default-src 'self'");
    response.headers.set("X-Frame-Options", "DENY");
  }

  return response;
}

export const config = {
  runtime: "edge",
  matcher: [
    "/@:path*",
    "/dashboard/:path*",
    "/posts/:path*/edit",
    "/posts/new",
    "/chat",
    "/sign-in",
    "/sign-up",
  ],
};
