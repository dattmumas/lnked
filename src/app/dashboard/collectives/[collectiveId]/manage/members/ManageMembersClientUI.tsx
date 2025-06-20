'use client';

import {
  UserPlus,
  Edit3,
  Trash2,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback , useState } from 'react';

import {
  changeMemberRole,
  removeMemberFromCollective,
  resendCollectiveInvite,
  cancelCollectiveInvite,
} from '@/app/actions/memberActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COLLECTIVE_MEMBER_ROLES } from '@/lib/schemas/memberSchemas';

import InviteMemberForm from './InviteMemberForm';

import type { MemberWithDetails } from './page';

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
}: ManageMembersClientUIProps): React.ReactElement {
  const router = useRouter();
  const [members] = useState<MemberWithDetails[]>(initialMembersProp);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>(undefined);
  const [actionSuccess, setActionSuccess] = useState<string | undefined>(
    undefined,
  );
  const [changingRoleId, setChangingRoleId] = useState<string | undefined>(
    undefined,
  );
  const [removingId, setRemovingId] = useState<string | undefined>(undefined);
  const [roleDropdown, setRoleDropdown] = useState<{
    id: string;
    open: boolean;
  }>({ id: '', open: false });
  const [inviteActionId, setInviteActionId] = useState<string | undefined>(
    undefined,
  );
  const [inviteActionType, setInviteActionType] = useState<
    'resend' | 'cancel' | undefined
  >(undefined);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | undefined>(
    undefined,
  );
  const [cancelInviteConfirmId, setCancelInviteConfirmId] = useState<
    string | undefined
  >(undefined);

  const handleInviteSuccess = useCallback((): void => {
    setShowInviteForm(false);
    void router.refresh(); // Re-fetches server components, including member list
  }, [router]);

  const getRoleIcon = useCallback(
    (role: string | null | undefined): React.ReactElement => {
      if (role === 'owner')
        return <ShieldCheck className="h-4 w-4 text-accent mr-1" />;
      if (role === 'editor')
        return <Edit3 className="h-4 w-4 text-accent mr-1" />;
      if (role === 'contributor')
        return <UserPlus className="h-4 w-4 text-foreground mr-1" />;
      return <ShieldAlert className="h-4 w-4 text-muted-foreground mr-1" />;
    },
    [],
  );

  const handleRoleChange = useCallback(
    async (memberId: string, newRole: string): Promise<void> => {
      setActionError(undefined);
      setChangingRoleId(memberId);
      const result = await changeMemberRole({
        collectiveId,
        memberId,
        newRole,
      });
      setChangingRoleId(undefined);
      if (result.success === true) {
        setActionSuccess('Role updated.');
        void router.refresh();
      } else {
        setActionError(
          (result.error ?? '').trim().length > 0
            ? (result.error ?? undefined)
            : 'Failed to change role.',
        );
      }
    },
    [collectiveId, router],
  );

  const handleRemove = useCallback(
    async (memberId: string): Promise<void> => {
      setActionError(undefined);
      setRemovingId(memberId);
      const result = await removeMemberFromCollective({
        collectiveId,
        memberId,
      });
      setRemovingId(undefined);
      if (result.success === true) {
        setActionSuccess('Member removed.');
        void router.refresh();
      } else {
        setActionError(
          (result.error ?? '').trim().length > 0
            ? (result.error ?? undefined)
            : 'Failed to remove member.',
        );
      }
    },
    [collectiveId, router],
  );

  const handleResendInvite = useCallback(
    async (inviteId: string): Promise<void> => {
      setActionError(undefined);
      setInviteActionId(inviteId);
      setInviteActionType('resend');
      const result = await resendCollectiveInvite({ collectiveId, inviteId });
      setInviteActionId(undefined);
      setInviteActionType(undefined);
      if (result.success === true) {
        setActionSuccess('Invite resent.');
        void router.refresh();
      } else {
        setActionError(
          (result.error ?? '').trim().length > 0
            ? (result.error ?? undefined)
            : 'Failed to resend invite.',
        );
      }
    },
    [collectiveId, router],
  );

  const handleCancelInvite = useCallback(
    async (inviteId: string): Promise<void> => {
      setActionError(undefined);
      setInviteActionId(inviteId);
      setInviteActionType('cancel');
      const result = await cancelCollectiveInvite({ collectiveId, inviteId });
      setInviteActionId(undefined);
      setInviteActionType(undefined);
      if (result.success === true) {
        setActionSuccess('Invite cancelled.');
        void router.refresh();
      } else {
        setActionError(
          (result.error ?? '').trim().length > 0
            ? (result.error ?? undefined)
            : 'Failed to cancel invite.',
        );
      }
    },
    [collectiveId, router],
  );

  const handleShowInviteForm = useCallback((): void => {
    setShowInviteForm(true);
  }, []);

  const handleRoleDropdownToggle = useCallback(
    (memberId: string): (() => void) => {
      return (): void => {
        setRoleDropdown({
          id: memberId,
          open: !roleDropdown.open || roleDropdown.id !== memberId,
        });
      };
    },
    [roleDropdown],
  );

  const handleRoleSelect = useCallback(
    (memberId: string, role: string): (() => void) => {
      return (): void => {
        setRoleDropdown({ id: '', open: false });
        void handleRoleChange(memberId, role);
      };
    },
    [handleRoleChange],
  );

  const handleRemoveClick = useCallback(
    (memberId: string): (() => void) => {
      return (): void => {
        if (removeConfirmId === memberId) {
          void handleRemove(memberId);
          setRemoveConfirmId(undefined);
        } else {
          setRemoveConfirmId(memberId);
        }
      };
    },
    [removeConfirmId, handleRemove],
  );

  const handleRemoveCancel = useCallback((): void => {
    setRemoveConfirmId(undefined);
  }, []);

  const handleResendInviteClick = useCallback(
    (inviteId: string): (() => void) => {
      return (): void => {
        void handleResendInvite(inviteId);
      };
    },
    [handleResendInvite],
  );

  const handleCancelInviteClick = useCallback(
    (inviteId: string): (() => void) => {
      return (): void => {
        if (cancelInviteConfirmId === inviteId) {
          void handleCancelInvite(inviteId);
          setCancelInviteConfirmId(undefined);
        } else {
          setCancelInviteConfirmId(inviteId);
        }
      };
    },
    [cancelInviteConfirmId, handleCancelInvite],
  );

  const handleCancelInviteCancel = useCallback((): void => {
    setCancelInviteConfirmId(undefined);
  }, []);

  return (
    <div className="space-y-8">
      {isOwner === true && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserPlus className="mr-2 h-5 w-5" /> Invite New Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showInviteForm === true ? (
              <InviteMemberForm
                collectiveId={collectiveId}
                onSuccess={handleInviteSuccess}
              />
            ) : (
              <Button onClick={handleShowInviteForm} variant="outline">
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
                      {member.user?.full_name !== undefined &&
                      member.user?.full_name !== null &&
                      member.user.full_name.trim().length > 0
                        ? member.user.full_name
                        : 'Unknown User'}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2 capitalize">
                      ({member.role})
                    </span>
                  </div>
                  {isOwner === true &&
                    member.user?.id !== undefined &&
                    member.user?.id !== null && (
                      <div className="flex space-x-2 self-end sm:self-center">
                        <div className="relative inline-block">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRoleDropdownToggle(member.id)}
                            disabled={member.role === 'owner'}
                          >
                            <Edit3 className="h-3 w-3 mr-1" /> Change Role
                          </Button>
                          {roleDropdown.open === true &&
                            roleDropdown.id === member.id && (
                              <div className="absolute z-10 bg-card border rounded shadow p-2 mt-1">
                                {COLLECTIVE_MEMBER_ROLES.filter(
                                  (r) => r !== member.role && r !== 'owner',
                                ).map((role) => (
                                  <button
                                    key={role}
                                    className="block w-full text-left px-2 py-1 hover:bg-accent rounded"
                                    onClick={handleRoleSelect(member.id, role)}
                                    disabled={changingRoleId === member.id}
                                  >
                                    {role.charAt(0).toUpperCase() +
                                      role.slice(1)}
                                  </button>
                                ))}
                              </div>
                            )}
                        </div>
                        {removeConfirmId === member.id ? (
                          <div className="flex gap-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={handleRemoveClick(member.id)}
                              disabled={removingId === member.id}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              {removingId === member.id
                                ? 'Removing...'
                                : 'Confirm Remove'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleRemoveCancel}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleRemoveClick(member.id)}
                            disabled={
                              member.role === 'owner' ||
                              removingId === member.id
                            }
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            {removingId === member.id
                              ? 'Removing...'
                              : 'Remove'}
                          </Button>
                        )}
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
          {actionError !== undefined &&
            actionError !== null &&
            actionError.trim().length > 0 && (
              <p className="text-destructive mb-2">{actionError}</p>
            )}
          {actionSuccess !== undefined &&
            actionSuccess !== null &&
            actionSuccess.trim().length > 0 && (
              <p className="text-success mb-2">{actionSuccess}</p>
            )}
        </CardContent>
      </Card>

      {isOwner === true && pendingInvites.length > 0 && (
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
                      onClick={handleResendInviteClick(invite.id)}
                      disabled={
                        inviteActionId === invite.id &&
                        inviteActionType === 'resend'
                      }
                    >
                      {inviteActionId === invite.id &&
                      inviteActionType === 'resend'
                        ? 'Resending...'
                        : 'Resend'}
                    </Button>
                    {cancelInviteConfirmId === invite.id ? (
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleCancelInviteClick(invite.id)}
                          disabled={
                            inviteActionId === invite.id &&
                            inviteActionType === 'cancel'
                          }
                        >
                          {inviteActionId === invite.id &&
                          inviteActionType === 'cancel'
                            ? 'Cancelling...'
                            : 'Confirm Cancel'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelInviteCancel}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleCancelInviteClick(invite.id)}
                        disabled={
                          inviteActionId === invite.id &&
                          inviteActionType === 'cancel'
                        }
                      >
                        {inviteActionId === invite.id &&
                        inviteActionType === 'cancel'
                          ? 'Cancelling...'
                          : 'Cancel'}
                      </Button>
                    )}
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
