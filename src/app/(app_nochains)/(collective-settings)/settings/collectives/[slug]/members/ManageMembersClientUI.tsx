'use client';

import { useState, useTransition } from 'react';

import {
  changeMemberRole,
  removeMemberFromCollective,
  inviteMemberToCollective,
} from '@/app/actions/memberActions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { Database } from '@/lib/database.types';

// Safe toast function that only works on client side
const showToast = {
  success: (message: string, options?: { description?: string }) => {
    if (typeof window !== 'undefined') {
      import('sonner').then(({ toast }) => toast.success(message, options));
    }
  },
  error: (message: string, options?: { description?: string }) => {
    if (typeof window !== 'undefined') {
      import('sonner').then(({ toast }) => toast.error(message, options));
    }
  },
};

// Define types based on expected data shape from the server
type CollectiveMemberRole =
  Database['public']['Enums']['collective_member_role'];

interface Member {
  id: string;
  role: CollectiveMemberRole;
  member: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface Invite {
  id: string;
  email: string;
  role: CollectiveMemberRole;
  created_at: string;
}

export function ManageMembersClientUI({
  initialMembers,
  initialInvites,
  collectiveId,
  isOwner,
  currentUserId,
}: {
  initialMembers: Member[];
  initialInvites: Invite[];
  collectiveId: string;
  isOwner: boolean;
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();

  // Filter out any members with null member data to prevent hydration issues
  const validMembers = initialMembers.filter((m) => m.member != null);
  const validInvites = initialInvites || [];

  const [members, setMembers] = useState(validMembers);
  const [invites, setInvites] = useState(validInvites);

  const [isInviteModalOpen, setInviteModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CollectiveMemberRole>('author');

  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [isChangeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<CollectiveMemberRole>('author');

  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

  const handleInvite = () => {
    startTransition(async () => {
      const result = await inviteMemberToCollective({
        collectiveId,
        email,
        role: 'contributor',
      });
      if (result.success) {
        showToast.success('Invite sent successfully!');
        setInviteModalOpen(false);
        // Here you would ideally refresh the invites list
      } else {
        showToast.error('Error sending invite', {
          description: result.error || 'An unknown error occurred',
        });
      }
    });
  };

  const handleChangeRole = () => {
    if (!memberToEdit) return;
    startTransition(async () => {
      const result = await changeMemberRole({
        collectiveId,
        memberId: memberToEdit.id,
        newRole,
      });
      if (result.success) {
        showToast.success(`Role updated for ${memberToEdit.member?.full_name}`);
        setMembers(
          members.map((m) =>
            m.id === memberToEdit.id ? { ...m, role: newRole } : m,
          ),
        );
        setChangeRoleDialogOpen(false);
      } else {
        showToast.error('Failed to change role', {
          description: result.error || 'An unknown error occurred',
        });
      }
    });
  };

  const handleRemoveMember = () => {
    if (!memberToRemove) return;
    startTransition(async () => {
      const result = await removeMemberFromCollective({
        collectiveId,
        memberId: memberToRemove.id,
      });
      if (result.success) {
        showToast.success(
          `${memberToRemove.member?.full_name} has been removed.`,
        );
        setMembers(members.filter((m) => m.id !== memberToRemove.id));
        setMemberToRemove(null);
      } else {
        showToast.error('Failed to remove member', {
          description: result.error || 'An unknown error occurred',
        });
      }
    });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Members</h2>
          {isOwner && (
            <Dialog open={isInviteModalOpen} onOpenChange={setInviteModalOpen}>
              <DialogTrigger asChild>
                <Button>Invite Member</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite a new member</DialogTitle>
                  <DialogDescription>
                    Enter the email and select a role for the new member.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">
                      Role
                    </Label>
                    <Select
                      onValueChange={(value) =>
                        setRole(value as CollectiveMemberRole)
                      }
                      defaultValue={role}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="author">Author</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleInvite}
                    disabled={isPending || email === ''}
                  >
                    {isPending ? 'Sending...' : 'Send Invite'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              {isOwner && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              // Additional safety check to prevent hydration issues
              if (!member.member) {
                return null;
              }

              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {/* Placeholder for avatar */}
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      <span>
                        {member.member.full_name ||
                          member.member.username ||
                          'Unknown User'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{member.role}</TableCell>
                  {isOwner && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            ...
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => {
                              setMemberToEdit(member);
                              setNewRole(member.role);
                              setChangeRoleDialogOpen(true);
                            }}
                          >
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-500"
                            onClick={() => {
                              setMemberToRemove(member);
                            }}
                            disabled={member.member?.id === currentUserId}
                          >
                            Remove Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {isOwner && invites.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Pending Invites</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell>{invite.role}</TableCell>
                    <TableCell>
                      {new Date(invite.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Resend
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500"
                      >
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Dialogs for member actions */}
      <Dialog
        open={isChangeRoleDialogOpen}
        onOpenChange={setChangeRoleDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Change Role for {memberToEdit?.member?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Select
              onValueChange={(value) =>
                setNewRole(value as CollectiveMemberRole)
              }
              defaultValue={newRole}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="author">Author</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setChangeRoleDialogOpen(false)}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button onClick={handleChangeRole} disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(memberToRemove)}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {memberToRemove?.member?.full_name}{' '}
              from the collective.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isPending}
            >
              {isPending ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
