import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";
import { redirect } from "next/navigation";
import Link from "next/link";
import ManageMembersClientUI from "./ManageMembersClientUI"; // New client component

export type MemberWithDetails = Tables<"collective_members"> & {
  user: Pick<Tables<"users">, "id" | "full_name"> | null; // Removed email
};

export default async function ManageCollectiveMembersPage({
  params,
}: {
  params: { collectiveId: string };
}) {
  const { collectiveId } = params;
  const supabase = createServerSupabaseClient();

  const {
    data: { user: currentUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !currentUser) {
    redirect("/sign-in");
  }

  const { data: collective, error: collectiveError } = await supabase
    .from("collectives")
    .select("id, name, owner_id")
    .eq("id", collectiveId)
    .single();

  if (collectiveError || !collective) {
    console.error(
      `Error fetching collective ${collectiveId} for member management:`,
      collectiveError?.message
    );
    redirect("/not-found");
  }

  // Permission check: Only owner can manage members (for now, can be expanded to admin role members)
  if (collective.owner_id !== currentUser.id) {
    console.warn(
      `User ${currentUser.id} attempted to manage members for collective ${collectiveId} without ownership.`
    );
    // redirect('/dashboard'); // Or a more specific unauthorized page
    redirect("/not-found");
  }

  const { data: members, error: membersError } = await supabase
    .from("collective_members")
    .select(
      `
      id,
      role,
      created_at,
      user:users!user_id(id, full_name)
    `
    )
    .eq("collective_id", collectiveId)
    .order("created_at", { ascending: true });

  if (membersError) {
    console.error(
      `Error fetching members for collective ${collectiveId}:`,
      membersError.message
    );
    // Handle error, maybe show empty list with an error message
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">
          Manage Members for: {collective.name}
        </h1>
        <Link
          href={`/dashboard`}
          className="text-sm text-primary hover:underline"
        >
          &larr; Back to Dashboard
        </Link>
      </header>
      <ManageMembersClientUI
        collectiveId={collective.id}
        initialMembers={(members as MemberWithDetails[]) || []}
        isOwner={currentUser.id === collective.owner_id}
      />
    </div>
  );
}
