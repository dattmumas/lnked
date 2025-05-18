import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const wantsDashboard = pathname.startsWith("/dashboard");
  const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up";

  if (!wantsDashboard && !isAuthPage) return NextResponse.next();

  const res = NextResponse.next();

  // Minimal cookie adapter: read-only
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        // no-ops – Supabase won't call these in middleware after we read session
        set(_name: string, _value: string, _opts?: CookieOptions) {},
        remove(_name: string, _opts?: CookieOptions) {},
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session && wantsDashboard) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (session && isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/sign-in", "/sign-up"],
};
