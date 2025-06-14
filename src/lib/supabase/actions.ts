"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "../database.types";
import type { User } from "@supabase/supabase-js";

/**
 * Server action to get the currently authenticated user profile
 * This is safer than accessing the users table directly client-side
 */
export async function getCurrentUserProfile(): Promise<{
  user: User | null;
  profile: { full_name: string | null; avatar_url: string | null } | null;
}> {
  const cookieStore = cookies();

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
        get: (name) => {
          return cookieStore.get(name)?.value;
        },
        set: (name, value, options) => {
          cookieStore.set(name, value, options);
        },
        remove: (name, options) => {
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { user: null, profile: null };

    const { data: profile } = await supabase
      .from("users")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .single();

    return { user, profile };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return { user: null, profile: null };
  }
}
