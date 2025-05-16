"use client";

import { useState, useTransition, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { MemberWithDetails } from "./page"; // Import type from server component
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  inviteUserToCollective,
  removeUserFromCollective,
  updateMemberRole,
} from "@/app/actions/collectiveActions";
import type { Enums } from "@/lib/database.types";
import { Trash2, UserPlus, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

interface ManageMembersClientUIProps {
  collectiveId: string;
  collectiveName: string;
  initialMembers: MemberWithDetails[];
  isOwner: boolean; // To gate owner-specific actions
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function ManageMembersClientUI({
  collectiveId,
  collectiveName,
  initialMembers,
  isOwner,
}: ManageMembersClientUIProps) {
  const router = useRouter();
  const [members, setMembers] = useState<MemberWithDetails[]>(initialMembers);
  const [isPending, startTransition] = useTransition();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] =
    useState<Enums<"collective_member_role">>("author");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentOwnerId, setCurrentOwnerId] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentOwnerId(user.id);
    };
    getCurrentUser();
  }, [supabase]);

  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  const handleInviteUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    if (!isOwner) return;

    startTransition(async () => {
      const result = await inviteUserToCollective(
        collectiveId,
        inviteEmail,
        inviteRole
      );
      if (result.error) {
        setError(
          result.fieldErrors?.email ||
            result.fieldErrors?.general ||
            result.error
        );
      } else {
        setSuccessMessage(result.message || "User invited successfully.");
        setInviteEmail("");
        router.refresh();
      }
    });
  };

  const handleRemoveMember = async (
    membershipId: string,
    memberUserId: string
  ) => {
    if (
      !isOwner ||
      !window.confirm("Are you sure you want to remove this member?")
    )
      return;
    if (memberUserId === currentOwnerId && isOwner) {
      alert("Collective owner cannot be removed through this action.");
      return;
    }
    setError(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const result = await removeUserFromCollective(collectiveId, membershipId);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccessMessage(result.message || "Member removed.");
        setMembers((prev) => prev.filter((m) => m.id !== membershipId));
        router.refresh();
      }
    });
  };

  const handleRoleChange = async (
    membershipId: string,
    newRoleValue: string
  ) => {
    if (!isOwner) return;
    const newRole = newRoleValue as Enums<"collective_member_role">;
    setError(null);
    setSuccessMessage(null);

    const memberToUpdate = members.find((m) => m.id === membershipId);
    if (
      memberToUpdate?.user_id === currentOwnerId &&
      memberToUpdate?.role === "admin" &&
      newRole !== "admin"
    ) {
      alert("Collective owner cannot demote themselves from the admin role.");
      return;
    }

    startTransition(async () => {
      const result = await updateMemberRole(
        collectiveId,
        membershipId,
        newRole
      );
      if (result.error) {
        setError(result.error);
      } else {
        setSuccessMessage(result.message || "Role updated.");
        setMembers((prev) =>
          prev.map((m): MemberWithDetails => {
            if (m.id === membershipId) {
              return { ...m, role: newRole };
            }
            return m;
          })
        );
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-8">
      {isOwner && (
        <form
          onSubmit={handleInviteUser}
          className="p-6 border rounded-lg bg-card shadow-sm"
        >
          <h2 className="text-xl font-semibold mb-4">Invite New Member</h2>
          <div className="grid sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="inviteEmail">User Email</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inviteRole">Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(value: string) =>
                  setInviteRole(value as Enums<"collective_member_role">)
                }
                disabled={isPending}
              >
                <SelectTrigger id="inviteRole">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="author">Author</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-destructive mt-3">{error}</p>}
          {successMessage && (
            <p className="text-sm text-green-600 mt-3">{successMessage}</p>
          )}
          <Button type="submit" disabled={isPending} className="mt-4">
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}{" "}
            Invite Member
          </Button>
        </form>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">
          Current Members ({members.length})
        </h2>
        {members.length > 0 ? (
          <Table>
            <TableCaption>Members of {collectiveName}.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                {isOwner && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.user?.full_name || "N/A"}
                  </TableCell>
                  <TableCell>
                    {isOwner && member.user_id !== currentOwnerId ? (
                      <Select
                        value={member.role}
                        onValueChange={(newRoleValue: string) =>
                          handleRoleChange(member.id, newRoleValue)
                        }
                        disabled={isPending}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="author">Author</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="capitalize">{member.role}</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(member.created_at)}</TableCell>
                  {isOwner && member.user_id !== currentOwnerId && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleRemoveMember(member.id, member.user_id!)
                        }
                        disabled={isPending}
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                  {(!isOwner || member.user_id === currentOwnerId) && (
                    <TableCell />
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground">
            No members found (besides the owner, if not listed here).
          </p>
        )}
      </div>
    </div>
  );
}
