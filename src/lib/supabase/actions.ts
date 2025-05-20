"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "../database.types";

/**
 * Server action to get the currently authenticated user profile
 * This is safer than accessing the users table directly client-side
 */
export async function getCurrentUserProfile() {
  const cookieStore = await cookies(); // now async

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name) => {
          return (await cookieStore.get(name))?.value;
        },
        set: async (name, value, options) => {
          await cookieStore.set(name, value, options);
        },
        remove: async (name, options) => {
          await cookieStore.set(name, "", { ...options, maxAge: 0 });
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
