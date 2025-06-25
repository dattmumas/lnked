// Tenant Members Component
// Displays and manages members within a tenant

'use client';

import {
  MoreHorizontal,
  UserPlus,
  Crown,
  Shield,
  Edit,
  Trash2,
  Mail,
} from 'lucide-react';
import React, { useState } from 'react';


import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useTenant } from '@/hooks/useTenant';
import { useTenantMembers } from '@/hooks/useTenantMembers';

import { RoleBadge } from './TenantPermissions';

import type { TenantMember, MemberRole } from '@/types/tenant.types';

interface TenantMembersProps {
  tenantId: string;
  className?: string;
  showInvite?: boolean;
  maxDisplay?: number;
}

export function TenantMembers({
  tenantId,
  className = '',
  showInvite = true,
  maxDisplay,
}: TenantMembersProps): React.JSX.Element {
  const {
    members,
    isLoading,
    error,
    inviteMember,
    updateMemberRole,
    removeMember,
  } = useTenantMembers(tenantId);
  const { permissions } = useTenant(tenantId);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);

  const filteredMembers = members.filter(
    (member) =>
      member.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user_email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const displayedMembers = maxDisplay
    ? filteredMembers.slice(0, maxDisplay)
    : filteredMembers;

  const handleRoleChange = async (memberId: string, newRole: MemberRole) => {
    try {
      await updateMemberRole(memberId, newRole);
    } catch (error) {
      console.error('Failed to update member role:', error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (confirm('Are you sure you want to remove this member?')) {
      try {
        await removeMember(memberId);
      } catch (error) {
        console.error('Failed to remove member:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="animate-pulse space-y-2">
            <div className="h-5 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              {members.length} member{members.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          {showInvite && permissions.canManageMembers && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInviteForm(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search */}
        {members.length > 5 && (
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        )}

        {/* Invite Form */}
        {showInviteForm && (
          <InviteForm
            onInvite={inviteMember}
            onCancel={() => setShowInviteForm(false)}
          />
        )}

        {/* Members List */}
        <div className="space-y-3">
          {displayedMembers.map((member) => (
            <MemberItem
              key={member.id}
              member={member}
              canManage={permissions.canManageMembers}
              onRoleChange={(newRole) => handleRoleChange(member.id, newRole)}
              onRemove={() => handleRemoveMember(member.id)}
            />
          ))}

          {maxDisplay && filteredMembers.length > maxDisplay && (
            <div className="text-center pt-2">
              <Button variant="ghost" size="sm">
                View all {filteredMembers.length} members
              </Button>
            </div>
          )}
        </div>

        {filteredMembers.length === 0 && searchQuery && (
          <div className="text-center text-muted-foreground py-8">
            <p>No members found matching "{searchQuery}"</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MemberItemProps {
  member: TenantMember;
  canManage: boolean;
  onRoleChange: (newRole: MemberRole) => void;
  onRemove: () => void;
}

function MemberItem({
  member,
  canManage,
  onRoleChange,
  onRemove,
}: MemberItemProps): React.JSX.Element {
  const getRoleIcon = (role: MemberRole) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3" />;
      case 'admin':
        return <Shield className="h-3 w-3" />;
      case 'editor':
        return <Edit className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border">
      <Avatar className="h-10 w-10">
        <AvatarImage src={member.user_avatar_url || undefined} />
        <AvatarFallback>
          {member.user_name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{member.user_name}</p>
          {getRoleIcon(member.role)}
        </div>
        <div className="flex items-center gap-2">
          {member.user_email && (
            <p className="text-xs text-muted-foreground truncate">
              {member.user_email}
            </p>
          )}
          <RoleBadge role={member.role} className="text-xs" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {new Date(member.joined_at).toLocaleDateString()}
        </span>

        {canManage && member.role !== 'owner' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onRoleChange('admin')}>
                <Shield className="h-4 w-4 mr-2" />
                Make Admin
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRoleChange('editor')}>
                <Edit className="h-4 w-4 mr-2" />
                Make Editor
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRoleChange('member')}>
                Make Member
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onRemove} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

interface InviteFormProps {
  onInvite: (email: string, role: MemberRole) => Promise<void>;
  onCancel: () => void;
}

function InviteForm({
  onInvite,
  onCancel,
}: InviteFormProps): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('member');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      await onInvite(email.trim(), role);
      setEmail('');
      setRole('member');
      onCancel();
    } catch (error) {
      console.error('Failed to invite member:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-muted/50">
      <h4 className="text-sm font-medium mb-3">Invite New Member</h4>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
            required
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as MemberRole)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="member">Member</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isLoading}>
            <Mail className="h-4 w-4 mr-2" />
            {isLoading ? 'Sending...' : 'Send Invite'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Export sub-components
export { MemberItem, InviteForm };
