"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Users, Eye, LogOut } from "lucide-react";
import type { Database } from "@/lib/database.types";
import { useTransition } from "react";
// import { removeUserFromCollective } from "@/app/actions/collectiveActions"; // Assuming this action exists
import { useRouter } from "next/navigation";

type Collective = Database["public"]["Tables"]["collectives"]["Row"];
export type CollectiveMemberRole =
  Database["public"]["Enums"]["collective_member_role"];

interface DashboardCollectiveCardProps {
  collective: Collective;
  role: "Owner" | CollectiveMemberRole;
  memberId?: string; // For leave action, if user is not owner
}

export default function DashboardCollectiveCard({
  collective,
  role,
  memberId,
}: DashboardCollectiveCardProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleLeaveCollective = async () => {
    if (role === "Owner") return; // Owners cannot leave this way
    if (!memberId) {
      console.error("Member ID is required to leave a collective.");
      alert("Error: Could not leave collective. Member ID missing.");
      return;
    }
    if (
      window.confirm(`Are you sure you want to leave "${collective.name}"?`)
    ) {
      // TODO: Implement actual leave collective logic using a server action
      // startTransition(async () => {
      //   const result = await removeUserFromCollective(collective.id, memberId);
      //   if (result.success) {
      //     router.refresh();
      //     // toast({ title: "Successfully left collective." });
      //   } else {
      //     // toast({ title: "Failed to leave collective", description: result.error, variant: "destructive" });
      //   }
      // });
      alert(
        "Leave collective functionality to be implemented with a server action."
      );
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="hover:text-primary line-clamp-1 break-all">
            <Link href={`/${collective.slug}`}>{collective.name}</Link>
          </CardTitle>
          <Badge
            variant={role === "Owner" ? "default" : "secondary"}
            className="capitalize flex-shrink-0"
          >
            {role}
          </Badge>
        </div>
        {collective.description && (
          <CardDescription className="line-clamp-2 pt-1 text-sm">
            {collective.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-grow text-sm">
        {/* Placeholder for future stats like members, subscribers, revenue */}
        {role === "Owner" && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              Subscribers: <span className="font-medium">TBD</span>
            </p>
            <p>
              Monthly Revenue: <span className="font-medium">TBD</span>
            </p>
            {/* TODO: Add members count here if desired */}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row flex-wrap items-stretch gap-2 pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="flex-grow basis-1/3 sm:basis-auto"
        >
          <Link
            href={`/${collective.slug}`}
            className="flex items-center justify-center w-full"
          >
            <Eye className="h-4 w-4 mr-1.5" /> View
          </Link>
        </Button>
        {role === "Owner" ? (
          <>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex-grow basis-1/3 sm:basis-auto"
            >
              <Link
                href={`/dashboard/collectives/${collective.id}/manage/members`}
                className="flex items-center justify-center w-full"
              >
                <Users className="h-4 w-4 mr-1.5" /> Members
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex-grow basis-1/3 sm:basis-auto"
            >
              {/* TODO: Create /dashboard/collectives/[collectiveId]/settings page */}
              <Link
                href={`/dashboard/collectives/${collective.id}/settings`}
                className="flex items-center justify-center w-full"
              >
                <Settings className="h-4 w-4 mr-1.5" /> Settings
              </Link>
            </Button>
          </>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleLeaveCollective}
            disabled={isPending || !memberId}
            className="flex-grow basis-full sm:basis-auto flex items-center justify-center w-full"
          >
            <LogOut className="h-4 w-4 mr-1.5" /> Leave
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
