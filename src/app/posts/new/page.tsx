import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NewPostForm from "./NewPostForm";
import { notFound } from "next/navigation";

interface SearchParams {
  collectiveId?: string;
}

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/sign-in");
  }

  let collective: { id: string; name: string; owner_id: string } | null = null;
  if (searchParams?.collectiveId) {
    const { data, error: collectiveError } = await supabase
      .from("collectives")
      .select("id, name, owner_id")
      .eq("id", searchParams.collectiveId)
      .single();
    if (collectiveError || !data) {
      notFound();
    }
    // Allow owner or member with editor/author/admin role
    if (data.owner_id !== user.id) {
      const { data: membership } = await supabase
        .from("collective_members")
        .select("role")
        .eq("collective_id", data.id)
        .eq("user_id", user.id)
        .maybeSingle<{ role: string }>();
      const allowed = membership && ["admin", "editor", "author"].includes(membership.role);
      if (!allowed) {
        notFound();
      }
    }
    collective = data;
  }

  return <NewPostForm collective={collective} />;
}
