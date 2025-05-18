import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const wantsDashboard = pathname.startsWith("/dashboard");
  const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up";

  if (!wantsDashboard && !isAuthPage) return NextResponse.next();

  let response = NextResponse.next({ request });

  // Create a stable cookie handler
  const cookieHandler = {
    get(name: string) {
      try {
        return request.cookies.get(name)?.value;
      } catch (error) {
        console.error(`Error getting cookie ${name} in middleware:`, error);
        return undefined;
      }
    },
    set(name: string, value: string, options?: CookieOptions) {
      response.cookies.set(name, value, options);
    },
    remove(name: string, options?: CookieOptions) {
      response.cookies.set(name, "", { ...options, maxAge: 0 });
    },
  };

  // Create a Supabase client for auth operations
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: cookieHandler.get,
          set: cookieHandler.set,
          remove: cookieHandler.remove,
        },
      }
    );

    // Add debug logging to trace the issue
    console.log(
      `Middleware check path=${pathname}, wantsDashboard=${wantsDashboard}, isAuthPage=${isAuthPage}`
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();

    console.log(`Session check result: hasSession=${!!session}`);

    if (!session && wantsDashboard) {
      console.log("No session, redirecting to sign-in");
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    if (session && isAuthPage) {
      console.log("Has session, redirecting to dashboard");
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    return response;
  } catch (error) {
    console.error("Error in middleware:", error);
    // On error, allow the request to proceed
    return response;
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/sign-in", "/sign-up"],
};
