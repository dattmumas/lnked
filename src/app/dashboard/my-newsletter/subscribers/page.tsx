import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Ensure this path is correct after moving table.tsx
import { Enums } from "@/lib/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Helper to map subscription status to badge variant
const getStatusBadgeVariant = (
  status: string,
  cancelAtPeriodEnd: boolean
): "default" | "secondary" | "destructive" | "outline" => {
  if (status === "active" && !cancelAtPeriodEnd) return "default";
  if (status === "trialing") return "secondary";
  if (status === "canceled" || cancelAtPeriodEnd) return "destructive";
  return "outline";
};

type Subscriber = { id: string; full_name: string | null };
type SubscriptionRow = {
  id: string;
  status: string;
  created: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  subscriber: Subscriber | null;
};

export default async function MyNewsletterSubscribersPage() {
  const supabase = createServerSupabaseClient();

  const {
    data: { user: currentUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !currentUser) {
    redirect("/sign-in");
  }

  // Fetch subscribers to the current user's individual newsletter
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
    .eq("target_entity_type", "user" as Enums<"subscription_target_type">)
    .eq("target_entity_id", currentUser.id)
    .order("created", { ascending: false });

  if (subsError) {
    console.error(
      "Error fetching subscribers for individual newsletter:",
      subsError.message
    );
    // Handle error display - perhaps show a message on the page
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">My Newsletter Subscribers</h1>
        <p className="text-muted-foreground">
          Users subscribed to your individual newsletter.
        </p>
      </header>

      {(!subscriptions || subscriptions.length === 0) && (
        <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm text-center">
          <p className="text-muted-foreground">
            You currently have no subscribers for your individual newsletter.
          </p>
        </div>
      )}

      {subscriptions && subscriptions.length > 0 && (
        <Table>
          <TableCaption>A list of your newsletter subscribers.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Subscriber Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Subscribed On</TableHead>
              <TableHead className="text-right">Current Period End</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((sub: SubscriptionRow) => {
              const {subscriber} = sub;
              return (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">
                    {subscriber?.full_name || "N/A"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getStatusBadgeVariant(
                        sub.status,
                        sub.cancel_at_period_end
                      )}
                      className="capitalize"
                    >
                      {sub.status}
                    </Badge>
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
