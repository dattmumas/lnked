import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

interface ToggleBookmarkArgs {
  postId: string;
  userId: string;
}

export async function toggleBookmark({ postId, userId }: ToggleBookmarkArgs) {
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
  // Check if bookmark exists
  const { data: existing } = await supabase
    .from("post_bookmarks")
    .select("*")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    // Remove bookmark
    const { error } = await supabase
      .from("post_bookmarks")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    if (error) throw error;
    return { removed: true };
  } else {
    // Add bookmark
    const { data, error } = await supabase
      .from("post_bookmarks")
      .insert([{ post_id: postId, user_id: userId }])
      .select()
      .single();
    if (error) throw error;
    return { added: true, data };
  }
}
