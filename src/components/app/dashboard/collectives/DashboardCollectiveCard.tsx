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
import { Settings, LogOut, Users2, Plus } from "lucide-react";
import type { Database } from "@/lib/database.types";
import * as React from "react";
import { removeUserFromCollective } from "@/app/actions/collectiveActions";

type Collective = Database["public"]["Tables"]["collectives"]["Row"];
export type CollectiveMemberRole =
  Database["public"]["Enums"]["collective_member_role"];

interface DashboardCollectiveCardProps {
  collective: Collective;
  role: "Owner" | CollectiveMemberRole;
  memberId?: string; // For leave action, if user is not owner
  subscriberCount?: number;
}

export default function DashboardCollectiveCard({
  collective,
  role,
  memberId,
  subscriberCount,
}: DashboardCollectiveCardProps) {
  const handleLeaveCollective = async () => {
    if (role === "Owner") return;
    if (!memberId) {
      console.error("Member ID is required to leave a collective.");
      alert("Error: Could not leave collective. Member ID missing.");
      return;
    }
    if (
      window.confirm(`Are you sure you want to leave "${collective.name}"?`)
    ) {
      const result = await removeUserFromCollective(collective.id, memberId);
      if (result.success) {
        alert(result.message || "Successfully left collective.");
      } else {
        alert(`Failed to leave collective: ${result.error || "Unknown error"}`);
      }
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="hover:text-accent line-clamp-1 break-all">
            <Link href={`/collectives/${collective.slug}`}>{collective.name}</Link>
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
        {role === "Owner" && (
          <div className="space-y-1.5 text-xs text-muted-foreground pt-2 mt-2 border-t border-border">
            <div className="flex items-center">
              <Users2 className="h-3.5 w-3.5 mr-1.5 text-sky-600 dark:text-sky-400" />{" "}
              Subscribers:{" "}
              <span className="font-semibold ml-1 text-foreground">
                {subscriberCount ?? "0"}
              </span>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row flex-wrap items-stretch gap-2 pt-4 border-t mt-auto">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="flex-grow basis-1/3 sm:basis-auto"
        >
          <Link
            href={`/collectives/${collective.slug}`}
            className="flex items-center justify-center w-full"
          >
            <Users2 className="h-4 w-4 mr-1.5" /> View
          </Link>
        </Button>
        {role === "Owner" && (
          <Button
            variant="default"
            size="sm"
            asChild
            className="flex-grow basis-1/3 sm:basis-auto"
          >
            <Link
              href={`/posts/new?collectiveId=${collective.id}`}
              className="flex items-center justify-center w-full"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Add Post
            </Link>
          </Button>
        )}
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
                <Users2 className="h-4 w-4 mr-1.5" /> Members
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
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex-grow basis-1/3 sm:basis-auto"
            >
              <Link
                href={`/dashboard/collectives/${collective.id}/subscribers`}
                className="flex items-center justify-center w-full"
              >
                <Users2 className="h-4 w-4 mr-1.5" /> Subscribers
              </Link>
            </Button>
          </>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleLeaveCollective}
            disabled={!memberId}
            className="flex-grow basis-full sm:basis-auto flex items-center justify-center w-full"
          >
            <LogOut className="h-4 w-4 mr-1.5" /> Leave
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
