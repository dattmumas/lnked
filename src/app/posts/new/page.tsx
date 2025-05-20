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
    // Only allow owner/editor to create posts for a collective
    if (data.owner_id !== user.id) {
      // TODO: expand to allow editors if your RLS allows
      notFound();
    }
    collective = data;
  }

  return <NewPostForm collective={collective} />;
}
