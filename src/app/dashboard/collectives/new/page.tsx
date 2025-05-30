import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NewCollectiveForm from "./NewCollectiveForm";

export default async function NewCollectivePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/sign-in");
  }

  return <NewCollectiveForm />;
}
