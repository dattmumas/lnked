"use server";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  // Only run on dashboard routes
  if (!req.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      getRequestHeader: (key: string) => req.headers.get(key) ?? undefined,
      cookies: {
        get: (key: string) => req.cookies.get(key)?.value,
        set: (key: string, value: string, options: any) => {
          res.cookies.set({ name: key, value, ...options });
        },
        remove: (key: string, options: any) => {
          res.cookies.set({
            name: key,
            value: "",
            ...options,
            expires: new Date(0),
          });
        },
      },
    }
  );
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const redirectUrl = new URL("/sign-in", req.url);
    redirectUrl.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl, { status: 302 });
  }

  if (
    session &&
    (req.nextUrl.pathname.startsWith("/sign-in") ||
      req.nextUrl.pathname.startsWith("/sign-up"))
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
