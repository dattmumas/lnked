import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getPostById(postId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options) {
          cookieStore.set(name, "", options);
        },
      },
    }
  );
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      author:users(*),
      collective:collectives(*)
    `
    )
    .eq("id", postId)
    .single();
  if (error) throw error;
  return data;
}

export async function getPostStats(postId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options) {
          cookieStore.set(name, "", options);
        },
      },
    }
  );
  const { data, error } = await supabase
    .from("posts")
    .select("like_count, dislike_count, bookmark_count, view_count")
    .eq("id", postId)
    .single();
  if (error) throw error;
  return data;
}
