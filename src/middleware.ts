import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/database.types";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createMiddlewareClient<Database>({ req: request, res: response });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users away from /dashboard/**
  if (!session && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in"; // Or your preferred sign-in page
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages like /sign-in, /sign-up
  // if (session && (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up"))) {
  //   const url = request.nextUrl.clone();
  //   url.pathname = "/dashboard"; // Or your preferred authenticated home page
  //   return NextResponse.redirect(url);
  // }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - noise.png (landing page background noise image)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|noise.png).*)",
    "/dashboard/:path*", // Explicitly include dashboard paths for clarity
  ],
};
