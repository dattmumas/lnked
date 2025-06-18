"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "../database.types";
import type { User } from "@supabase/supabase-js";

type CookieOptions = Partial<{
  maxAge: number;
  path: string;
  domain: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none" | boolean;
  expires: Date;
}>;

/**
 * Server action to get the currently authenticated user profile
 * This is safer than accessing the users table directly client-side
 */
export async function getCurrentUserProfile(): Promise<{
  user: User | undefined;
  profile: { full_name: string | undefined; avatar_url: string | undefined } | undefined;
}> {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url === undefined || url === "" || anonKey === undefined || anonKey === "") {
    throw new Error(
      "Supabase environment variables NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY are missing"
    );
  }

  const supabase = createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options?: CookieOptions) => {
          cookieStore.set(name, value, options);
        },
        remove: (name: string, options?: CookieOptions) => {
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { user: undefined, profile: undefined };

    const { data: profile } = await supabase
      .from("users")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .single();

    return { 
      user, 
      profile: profile ? {
        full_name: profile.full_name ?? undefined,
        avatar_url: profile.avatar_url ?? undefined
      } : undefined 
    };
  } catch (error: unknown) {
    console.error("Error fetching user profile:", error);
    return { user: undefined, profile: undefined };
  }
}
