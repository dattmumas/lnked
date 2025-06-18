import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import NewCollectiveForm from "./NewCollectiveForm";

export default async function NewCollectivePage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/sign-in");
  }

  return <NewCollectiveForm />;
}
