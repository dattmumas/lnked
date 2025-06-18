"use client";

import {
  UserPlus,
  Edit3,
  Trash2,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  changeMemberRole,
  removeMemberFromCollective,
  resendCollectiveInvite,
  cancelCollectiveInvite,
} from "@/app/actions/memberActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COLLECTIVE_MEMBER_ROLES } from "@/lib/schemas/memberSchemas";

import InviteMemberForm from "./InviteMemberForm";

import type { MemberWithDetails } from "./page";

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  invite_code: string;
}

interface ManageMembersClientUIProps {
  collectiveId: string;
  initialMembers: MemberWithDetails[];
  pendingInvites: PendingInvite[];
  isOwner: boolean;
}

export default function ManageMembersClientUI({
  collectiveId,
  initialMembers: initialMembersProp,
  pendingInvites,
  isOwner,
}: ManageMembersClientUIProps) {
  const router = useRouter();
  const [members] = useState<MemberWithDetails[]>(initialMembersProp);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [roleDropdown, setRoleDropdown] = useState<{
    id: string;
    open: boolean;
  }>({ id: "", open: false });
  const [inviteActionId, setInviteActionId] = useState<string | null>(null);
  const [inviteActionType, setInviteActionType] = useState<
    "resend" | "cancel" | null
  >(null);

  const handleInviteSuccess = () => {
    setShowInviteForm(false);
    void router.refresh(); // Re-fetches server components, including member list
  };

  const getRoleIcon = (role: string | null | undefined) => {
    if (role === "owner")
      return <ShieldCheck className="h-4 w-4 text-accent mr-1" />;
    if (role === "editor")
      return <Edit3 className="h-4 w-4 text-accent mr-1" />;
    if (role === "contributor")
      return <UserPlus className="h-4 w-4 text-foreground mr-1" />;
    return <ShieldAlert className="h-4 w-4 text-muted-foreground mr-1" />;
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setActionError(null);
    setChangingRoleId(memberId);
    const result = await changeMemberRole({
      collectiveId,
      memberId,
      newRole,
    });
    setChangingRoleId(null);
    if (result.success) {
      setActionSuccess("Role updated.");
      void router.refresh();
    } else {
      setActionError(result.error || "Failed to change role.");
    }
  };

  const handleRemove = async (memberId: string) => {
    setActionError(null);
    setRemovingId(memberId);
    const result = await removeMemberFromCollective({
      collectiveId,
      memberId,
    });
    setRemovingId(null);
    if (result.success) {
      setActionSuccess("Member removed.");
      void router.refresh();
    } else {
      setActionError(result.error || "Failed to remove member.");
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    setActionError(null);
    setInviteActionId(inviteId);
    setInviteActionType("resend");
    const result = await resendCollectiveInvite({ collectiveId, inviteId });
    setInviteActionId(null);
    setInviteActionType(null);
    if (result.success) {
      setActionSuccess("Invite resent.");
      void router.refresh();
    } else {
      setActionError(result.error || "Failed to resend invite.");
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    setActionError(null);
    setInviteActionId(inviteId);
    setInviteActionType("cancel");
    const result = await cancelCollectiveInvite({ collectiveId, inviteId });
    setInviteActionId(null);
    setInviteActionType(null);
    if (result.success) {
      setActionSuccess("Invite cancelled.");
      void router.refresh();
    } else {
      setActionError(result.error || "Failed to cancel invite.");
    }
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
                      <div className="relative inline-block">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setRoleDropdown({
                              id: member.id,
                              open:
                                !roleDropdown.open ||
                                roleDropdown.id !== member.id,
                            })
                          }
                          disabled={member.role === "owner"}
                        >
                          <Edit3 className="h-3 w-3 mr-1" /> Change Role
                        </Button>
                        {roleDropdown.open && roleDropdown.id === member.id && (
                          <div className="absolute z-10 bg-card border rounded shadow p-2 mt-1">
                            {COLLECTIVE_MEMBER_ROLES.filter(
                              (r) => r !== member.role && r !== "owner"
                            ).map((role) => (
                              <button
                                key={role}
                                className="block w-full text-left px-2 py-1 hover:bg-accent rounded"
                                onClick={() => {
                                  setRoleDropdown({ id: "", open: false });
                                  handleRoleChange(member.id, role);
                                }}
                                disabled={changingRoleId === member.id}
                              >
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to remove this member?"
                            )
                          )
                            handleRemove(member.id);
                        }}
                        disabled={
                          member.role === "owner" || removingId === member.id
                        }
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        {removingId === member.id ? "Removing..." : "Remove"}
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
          {actionError && (
            <p className="text-destructive mb-2">{actionError}</p>
          )}
          {actionSuccess && (
            <p className="text-success mb-2">{actionSuccess}</p>
          )}
        </CardContent>
      </Card>

      {isOwner && pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invites ({pendingInvites.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {pendingInvites.map((invite) => (
                <li
                  key={invite.id}
                  className="py-3 flex flex-col sm:flex-row justify-between sm:items-center space-y-2 sm:space-y-0"
                >
                  <div>
                    <span className="font-medium">{invite.email}</span>
                    <span className="text-xs text-muted-foreground ml-2 capitalize">
                      ({invite.role})
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      Invited {new Date(invite.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex space-x-2 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleResendInvite(invite.id)}
                      disabled={
                        inviteActionId === invite.id &&
                        inviteActionType === "resend"
                      }
                    >
                      {inviteActionId === invite.id &&
                      inviteActionType === "resend"
                        ? "Resending..."
                        : "Resend"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Are you sure you want to cancel this invite?"
                          )
                        )
                          handleCancelInvite(invite.id);
                      }}
                      disabled={
                        inviteActionId === invite.id &&
                        inviteActionType === "cancel"
                      }
                    >
                      {inviteActionId === invite.id &&
                      inviteActionType === "cancel"
                        ? "Cancelling..."
                        : "Cancel"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
