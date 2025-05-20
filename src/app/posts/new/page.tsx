import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NewPostForm from "./NewPostForm";

export default async function NewPostPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/sign-in");
  }

  return <NewPostForm />;
}
