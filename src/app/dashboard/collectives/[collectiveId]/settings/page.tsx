import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { redirect, notFound } from "next/navigation";
import EditCollectiveSettingsForm from "./EditCollectiveSettingsForm"; // Client component for the form

export default async function CollectiveSettingsPage({
  params,
}: {
  params: Promise<{ collectiveId: string }>;
}) {
  const { collectiveId } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieStore }
  );

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect("/sign-in");
  }

  const { data: collective, error: collectiveError } = await supabase
    .from("collectives")
    .select("id, name, slug, description, tags, owner_id")
    .eq("id", collectiveId)
    .single();

  if (collectiveError || !collective) {
    console.error(
      `Error fetching collective ${collectiveId} for settings:`,
      collectiveError?.message
    );
    notFound();
  }

  // Authorization: Only owner can edit settings
  if (collective.owner_id !== authUser.id) {
    console.warn(
      `User ${authUser.id} attempted to access settings for collective ${collective.id} without ownership.`
    );
    // Or redirect to an unauthorized page or the dashboard
    notFound();
  }

  const defaultValues = {
    name: collective.name || "",
    slug: collective.slug || "",
    description: collective.description || "",
    tags_string: (collective.tags as string[] | null)?.join(", ") || "",
  };

  if ("id" in collective) {
    // safe to access collective.id, collective.name, etc.
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-2xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Collective Settings</h1>
        <p className="text-muted-foreground">
          Manage details for: {collective.name}
        </p>
      </header>
      <EditCollectiveSettingsForm
        collectiveId={collective.id}
        currentSlug={collective.slug} // Pass current slug for comparison in client if needed
        defaultValues={defaultValues}
      />
    </div>
  );
}
