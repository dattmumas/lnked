"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import type { MemberWithDetails } from "./page";
import InviteMemberForm from "./InviteMemberForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  UserPlus,
  Edit3,
  Trash2,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

interface ManageMembersClientUIProps {
  collectiveId: string;
  initialMembers: MemberWithDetails[];
  isOwner: boolean;
}

export default function ManageMembersClientUI({
  collectiveId,
  initialMembers: initialMembersProp,
  isOwner,
}: ManageMembersClientUIProps) {
  const router = useRouter();
  const [members] = useState<MemberWithDetails[]>(initialMembersProp);
  const [showInviteForm, setShowInviteForm] = useState(false);

  const handleInviteSuccess = () => {
    setShowInviteForm(false);
    router.refresh(); // Re-fetches server components, including member list
  };

  const getRoleIcon = (role: string | null | undefined) => {
    if (role === "owner")
      return <ShieldCheck className="h-4 w-4 text-primary mr-1" />;
    if (role === "editor")
      return <Edit3 className="h-4 w-4 text-accent mr-1" />;
    if (role === "contributor")
      return <UserPlus className="h-4 w-4 text-foreground mr-1" />;
    return <ShieldAlert className="h-4 w-4 text-muted-foreground mr-1" />;
  };

  return (
    <div className="space-y-8">
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserPlus className="mr-2 h-5 w-5" /> Invite New Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showInviteForm ? (
              <InviteMemberForm
                collectiveId={collectiveId}
                onSuccess={handleInviteSuccess}
              />
            ) : (
              <Button onClick={() => setShowInviteForm(true)} variant="outline">
                <UserPlus className="mr-2 h-4 w-4" /> Invite Member
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Current Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length > 0 ? (
            <ul className="divide-y divide-border">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="py-4 flex flex-col sm:flex-row justify-between sm:items-center space-y-2 sm:space-y-0"
                >
                  <div className="flex items-center">
                    {getRoleIcon(member.role)}
                    <span className="font-medium">
                      {member.user?.full_name || "Unknown User"}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2 capitalize">
                      ({member.role})
                    </span>
                  </div>
                  {isOwner && member.user?.id && (
                    <div className="flex space-x-2 self-end sm:self-center">
                      <Button variant="outline" size="sm" disabled>
                        <Edit3 className="h-3 w-3 mr-1" /> Change Role
                      </Button>
                      <Button variant="destructive" size="sm" disabled>
                        <Trash2 className="h-3 w-3 mr-1" /> Remove
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground py-4">
              No members found for this collective.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
