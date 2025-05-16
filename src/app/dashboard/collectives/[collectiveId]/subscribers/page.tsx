import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database, Enums } from "@/lib/database.types";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

interface CollectiveSubscribersPageProps {
  params: {
    collectiveId: string;
  };
}

export default async function CollectiveSubscribersPage({
  params,
}: CollectiveSubscribersPageProps) {
  const { collectiveId } = params;
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) =>
          cookieStore.set(name, value, options),
        remove: (name: string, options: CookieOptions) =>
          cookieStore.delete(name, options),
      },
    }
  );

  const {
    data: { user: currentUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !currentUser) {
    redirect("/sign-in");
  }

  // 1. Fetch collective details and verify ownership
  const { data: collective, error: collectiveError } = await supabase
    .from("collectives")
    .select("id, name, owner_id")
    .eq("id", collectiveId)
    .single();

  if (collectiveError || !collective) {
    console.error(
      `Error fetching collective ${collectiveId}:`,
      collectiveError?.message
    );
    notFound();
  }

  if (collective.owner_id !== currentUser.id) {
    // Or show a more specific "access denied" page
    console.warn(
      `User ${currentUser.id} tried to access subscribers for collective ${collectiveId} they do not own.`
    );
    notFound();
  }

  // 2. Fetch subscribers to this collective
  const { data: subscriptions, error: subsError } = await supabase
    .from("subscriptions")
    .select(
      `
      id,
      status,
      created,
      current_period_end,
      cancel_at_period_end,
      subscriber:users!user_id(id, full_name) 
    `
    )
    .eq("target_entity_type", "collective" as Enums<"subscription_target_type">)
    .eq("target_entity_id", collective.id)
    .order("created", { ascending: false });

  if (subsError) {
    console.error(
      `Error fetching subscribers for collective ${collective.id}:`,
      subsError.message
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">
          Subscribers for {collective.name}
        </h1>
        <p className="text-muted-foreground">
          Users subscribed to this collective.
        </p>
      </header>

      {(!subscriptions || subscriptions.length === 0) && (
        <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm text-center">
          <p className="text-muted-foreground">
            This collective currently has no subscribers.
          </p>
        </div>
      )}

      {subscriptions && subscriptions.length > 0 && (
        <Table>
          <TableCaption>
            A list of subscribers for {collective.name}.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Subscriber Name</TableHead>
              {/* <TableHead>Email</TableHead> */}
              <TableHead>Status</TableHead>
              <TableHead>Subscribed On</TableHead>
              <TableHead className="text-right">Current Period End</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((sub) => {
              const subscriber = sub.subscriber as {
                id: string;
                full_name: string | null;
              } | null;
              return (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">
                    {subscriber?.full_name || "N/A"}
                  </TableCell>
                  {/* <TableCell>{(subscriber as any)?.email || 'N/A'}</TableCell> */}
                  <TableCell>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full 
                      ${
                        sub.status === "active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : sub.status === "trialing"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          : sub.status === "canceled" ||
                            sub.cancel_at_period_end
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      }
                    `}
                    >
                      {sub.status}
                    </span>
                    {sub.cancel_at_period_end && sub.status === "active" && (
                      <span className="text-xs text-muted-foreground ml-1">
                        (ends {formatDate(sub.current_period_end)})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(sub.created)}</TableCell>
                  <TableCell className="text-right">
                    {formatDate(sub.current_period_end)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <div className="mt-8">
        <Button variant="outline" asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
