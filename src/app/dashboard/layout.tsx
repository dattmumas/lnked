import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import DashboardShell from "@/components/app/dashboard/template/dashboard-shell";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Dashboard | Lnked",
  description: "Manage your posts, newsletters, and collectives",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { session },
    error: authErrorSession,
  } = await supabase.auth.getSession();

  if (authErrorSession || !session || !session.user) {
    // Protect the dashboard route
    return redirect("/sign-in");
  }

  const userId = session.user.id;

  // Fetch collectives the user owns
  const { data: ownedCollectivesData } = await supabase
    .from("collectives")
    .select("id, name, slug")
    .eq("owner_id", userId)
    .order("name", { ascending: true });

  // Fetch collectives the user is a member of (excluding owned)
  const { data: joinedMembershipsData } = await supabase
    .from("collective_members")
    .select("collective:collectives!inner(id, name, slug, owner_id)")
    .eq("user_id", userId)
    .order("collective(name)", { ascending: true });

  // Filter out collectives the user owns from joined
  const joinedCollectives = (
    Array.isArray(joinedMembershipsData)
      ? joinedMembershipsData
          .filter(
            (member: unknown) =>
              typeof member === "object" &&
              member !== null &&
              "collective" in member &&
              (member as any).collective &&
              (member as any).collective.owner_id !== userId
          )
          .map((member: unknown) => {
            const m = member as {
              collective: { id: string; name: string; slug: string };
            };
            return {
              id: m.collective.id,
              name: m.collective.name,
              slug: m.collective.slug,
            };
          })
      : []
  ) as { id: string; name: string; slug: string }[];

  const ownedCollectives =
    (Array.isArray(ownedCollectivesData)
      ? (ownedCollectivesData as { id: string; name: string; slug: string }[])
      : []) || [];

  // Combine and dedupe by id
  const userCollectives = [
    ...ownedCollectives,
    ...joinedCollectives.filter(
      (jc) => !ownedCollectives.some((oc) => oc.id === jc.id)
    ),
  ];

  return (
    <DashboardShell userCollectives={userCollectives}>
      {children}
    </DashboardShell>
  );
}
