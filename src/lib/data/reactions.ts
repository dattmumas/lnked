import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

interface TogglePostReactionArgs {
  postId: string;
  userId: string;
  type: "like" | "dislike";
}

interface ToggleCommentReactionArgs {
  commentId: string;
  userId: string;
  type: "like" | "dislike";
}

export async function togglePostReaction({
  postId,
  userId,
  type,
}: TogglePostReactionArgs) {
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
    .from("post_reactions")
    .upsert([{ post_id: postId, user_id: userId, type }], {
      onConflict: "post_id,user_id",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleCommentReaction({
  commentId,
  userId,
  type,
}: ToggleCommentReactionArgs) {
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
    .from("comment_reactions")
    .upsert([{ comment_id: commentId, user_id: userId, type }], {
      onConflict: "comment_id,user_id",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
