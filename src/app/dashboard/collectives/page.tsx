import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import DashboardCollectiveCard, {
  CollectiveMemberRole,
} from "@/components/app/dashboard/collectives/DashboardCollectiveCard";

type CollectiveRow = Database["public"]["Tables"]["collectives"]["Row"];
interface JoinedCollectiveMembership {
  id: string; // This is collective_members.id
  role: CollectiveMemberRole;
  collective: CollectiveRow & { owner_id: string };
}

export default async function MyCollectivesPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  const {
    data: { session },
    error: authErrorSession,
  } = await supabase.auth.getSession();

  if (authErrorSession || !session || !session.user) {
    redirect("/sign-in");
  }

  const userId = session.user.id;

  // 1. Fetch collectives OWNED by the user
  const { data: ownedCollectives, error: ownedError } = await supabase
    .from("collectives")
    .select("id, name, slug, description") // Add more fields as needed for DashboardCollectiveCard
    .eq("owner_id", userId)
    .order("name", { ascending: true });

  if (ownedError) {
    console.error("Error fetching owned collectives:", ownedError.message);
    // Handle error appropriately
  }

  // 2. Fetch collectives JOINED by the user (where they are a member but not owner)
  const { data: joinedMembershipsData, error: joinedError } = await supabase
    .from("collective_members")
    .select(
      `
      id, 
      role,
      collective:collectives!inner(id, name, slug, description, owner_id)
    `
    )
    .eq("user_id", userId)
    // .neq('collective.owner_id', userId) // This condition needs to be applied carefully post-fetch or via a view/function if complex
    .order("collective(name)", { ascending: true });

  if (joinedError) {
    console.error("Error fetching joined collectives:", joinedError.message);
    // Handle error appropriately
  }

  const joinedCollectives: JoinedCollectiveMembership[] =
    (joinedMembershipsData?.filter(
      (member) => member.collective?.owner_id !== userId
    ) as JoinedCollectiveMembership[]) || [];

  const hasCollectives =
    (ownedCollectives && ownedCollectives.length > 0) ||
    (joinedCollectives && joinedCollectives.length > 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <h1 className="text-2xl font-serif font-semibold">My Collectives</h1>
        <Button asChild size="sm" className="w-full md:w-auto">
          <Link href="/dashboard/collectives/new">
            <PlusCircle className="h-4 w-4 mr-2" /> Create New Collective
          </Link>
        </Button>
      </div>

      {!hasCollectives && (
        <div className="text-center py-10 border border-dashed rounded-lg">
          <h2 className="text-xl font-semibold mb-2">No Collectives Yet</h2>
          <p className="text-muted-foreground mb-4">
            You haven&apos;t created or joined any collectives.
          </p>
          <Button asChild>
            <Link href="/dashboard/collectives/new">
              Create Your First Collective
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Or{" "}
            <Link href="/discover" className="underline hover:text-primary">
              explore collectives
            </Link>{" "}
            to join.
          </p>
        </div>
      )}

      {ownedCollectives && ownedCollectives.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Collectives I Own</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ownedCollectives.map((collective) => (
              <DashboardCollectiveCard
                key={collective.id}
                collective={collective}
                role="Owner"
              />
            ))}
          </div>
        </section>
      )}

      {joinedCollectives && joinedCollectives.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">
            Collectives I Contribute To
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {joinedCollectives.map((membership) => (
              <DashboardCollectiveCard
                key={membership.id}
                collective={membership.collective}
                role={membership.role}
                memberId={membership.id}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
