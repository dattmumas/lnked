import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import EditCollectiveSettingsForm from "./EditCollectiveSettingsForm"; // Client component for the form

export default async function CollectiveSettingsPage({
  params,
}: {
  params: { collectiveId: string };
}) {
  const { collectiveId } = params;
  const supabase = await createServerSupabaseClient();

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
    redirect("/error");
  }

  // Authorization: Only owner can edit settings
  if (collective.owner_id !== authUser.id) {
    console.warn(
      `User ${authUser.id} attempted to access settings for collective ${collective.id} without ownership.`
    );
    // Or redirect to an unauthorized page or the dashboard
    redirect("/unauthorized");
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

  // Fetch eligible members for ownership transfer
  const { data: members } = await supabase
    .from("collective_members")
    .select("user:users!user_id(id, full_name)")
    .eq("collective_id", collectiveId);
  const eligibleMembers = (members || [])
    .map(
      (m: { user: { id: string; full_name: string | null } | null }) => m.user
    )
    .filter((u) => u && u.id !== authUser.id);

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
        currentSlug={collective.slug}
        defaultValues={defaultValues}
        eligibleMembers={eligibleMembers}
      />
    </div>
  );
}
