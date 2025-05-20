import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NewCollectivePostForm from "./NewCollectivePostForm";

export default async function NewCollectivePostPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/sign-in");
  }

  return <NewCollectivePostForm />;
}
