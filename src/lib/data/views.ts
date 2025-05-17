import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

interface LogPostViewArgs {
  postId: string;
  userId?: string | null;
}

export async function logPostView({ postId, userId }: LogPostViewArgs) {
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
    .from("post_views")
    .insert([{ post_id: postId, user_id: userId || null }])
    .select()
    .single();
  if (error) throw error;
  return data;
}
