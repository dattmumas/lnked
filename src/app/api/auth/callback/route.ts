import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import type { CookieOptions } from "@supabase/ssr";

export async function POST(request: Request) {
  const { event, session } = await request.json();
  if (process.env.NODE_ENV === "development") {
    console.info("Auth callback triggered:", event);
  }

  const response = NextResponse.json({ status: "success" });
  const cookieStore = await cookies();

  // Create a stable wrapper around cookies for the auth client
  const cookieHandler = {
    get: async (name: string) => {
      return (await cookieStore.get(name))?.value;
    },
    set(name: string, value: string, options?: CookieOptions) {
      if (process.env.NODE_ENV === "development") {
        console.info(`Setting cookie: ${name}`);
      }
      response.cookies.set(name, value, options);
    },
    remove(name: string, options?: CookieOptions) {
      if (process.env.NODE_ENV === "development") {
        console.info(`Removing cookie: ${name}`);
      }
      response.cookies.set(name, "", { ...options, maxAge: 0 });
    },
  };

  try {
    const supabase = createServerClient<Database>(
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

    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      if (process.env.NODE_ENV === "development") {
        console.info("Setting session in callback");
      }

      // Explicitly log session data (without sensitive info)
      if (process.env.NODE_ENV === "development") {
        if (session) {
          console.info("Session received:", {
            hasSession: Boolean(session),
            user_id: session.user?.id,
            expires_at: session.expires_at,
          });
        } else {
          console.info("No session data received in callback");
        }
      }

      const result = await supabase.auth.setSession(session);
      if (result.error) {
        console.error("Error setting session:", result.error);
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      // Verify session was set
      const { data: sessionCheck } = await supabase.auth.getSession();
      if (process.env.NODE_ENV === "development") {
        console.info(
          "Session verification after setting:",
          Boolean(sessionCheck.session)
        );
      }
    } else if (event === "SIGNED_OUT") {
      if (process.env.NODE_ENV === "development") {
        console.info("Signing out in callback");
      }
      await supabase.auth.signOut();
    }

    return response;
  } catch (error) {
    console.error("Error in auth callback:", error);
    return NextResponse.json(
      { error: "Internal server error in auth callback" },
      { status: 500 }
    );
  }
}
