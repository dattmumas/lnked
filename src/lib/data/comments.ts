import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

interface AddCommentArgs {
  postId: string;
  userId: string;
  content: string;
  parentId?: string;
}

export async function getCommentsByPostId(postId: string) {
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
    .from("comments")
    .select(
      `
      *,
      user:users(*),
      reactions:comment_reactions(*)
    `
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addComment({
  postId,
  userId,
  content,
  parentId,
}: AddCommentArgs) {
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
    .from("comments")
    .insert([
      {
        post_id: postId,
        user_id: userId,
        content,
        parent_id: parentId || null,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
}
