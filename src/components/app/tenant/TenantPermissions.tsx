// Tenant Permissions Component
// Displays and manages user permissions within a tenant

'use client';

import { Shield, Edit, Eye, Trash2, Settings, Users, Plus } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useTenant, useTenantActions } from '@/providers/TenantProvider';

import type { MemberRole, TenantPermissions } from '@/types/tenant.types';

interface TenantPermissionsProps {
  tenantId: string;
  showActions?: boolean;
  className?: string;
}

export function TenantPermissionsDisplay({
  tenantId,
  showActions = true,
  className = '',
}: TenantPermissionsProps): React.JSX.Element {
  const { currentTenant: tenant, isLoading, error } = useTenant();
  const { isPersonalTenant, canPerformAction } = useTenantActions();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !tenant) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{error || 'Unable to load tenant permissions'}</p>
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
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permissions in {tenant.name}
            </CardTitle>
            <CardDescription>
              Your role: <RoleBadge role={tenant.user_role} />
            </CardDescription>
          </div>
          {showActions && canPerformAction('manage') && (
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Manage
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Content Permissions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Content</h4>
          <div className="grid gap-2">
            <PermissionItem
              icon={Eye}
              label="View content"
              granted={canPerformAction('read')}
              description="See posts and discussions"
            />
            <PermissionItem
              icon={Edit}
              label="Create content"
              granted={canPerformAction('write')}
              description="Create posts and replies"
            />
            <PermissionItem
              icon={Trash2}
              label="Delete content"
              granted={canPerformAction('admin')}
              description="Delete your own posts"
            />
          </div>
        </div>

        {/* Management Permissions */}
        {(canPerformAction('manage') || canPerformAction('admin')) && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Management
            </h4>
            <div className="grid gap-2">
              {canPerformAction('admin') && (
                <PermissionItem
                  icon={Users}
                  label="Manage members"
                  granted
                  description="Invite, remove, and change member roles"
                />
              )}
              {canPerformAction('manage') && (
                <PermissionItem
                  icon={Settings}
                  label="Manage settings"
                  granted
                  description="Change tenant settings and configuration"
                />
              )}
            </div>
          </div>
        )}

        {/* Role-specific Actions */}
        {showActions && (
          <div className="pt-4 border-t">
            <div className="flex gap-2 flex-wrap">
              {canPerformAction('write') && (
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Post
                </Button>
              )}
              {canPerformAction('admin') && (
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Invite Members
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PermissionItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  granted: boolean;
  description?: string;
}

function PermissionItem({
  icon: Icon,
  label,
  granted,
  description,
}: PermissionItemProps): React.JSX.Element {
  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-md ${granted ? 'bg-green-50' : 'bg-gray-50'}`}
    >
      <div
        className={`p-1 rounded ${granted ? 'bg-green-100' : 'bg-gray-100'}`}
      >
        <Icon
          className={`h-4 w-4 ${granted ? 'text-green-600' : 'text-gray-400'}`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium ${granted ? 'text-green-900' : 'text-gray-500'}`}
          >
            {label}
          </span>
          <Badge
            variant={granted ? 'default' : 'secondary'}
            className="text-xs"
          >
            {granted ? 'Granted' : 'Denied'}
          </Badge>
        </div>
        {description && (
          <p
            className={`text-xs ${granted ? 'text-green-700' : 'text-gray-400'}`}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

interface RoleBadgeProps {
  role: MemberRole | null;
  className?: string;
}

function RoleBadge({
  role,
  className = '',
}: RoleBadgeProps): React.JSX.Element {
  if (!role) {
    return (
      <Badge variant="secondary" className={className}>
        No Role
      </Badge>
    );
  }

  const roleConfig = {
    owner: {
      variant: 'default' as const,
      color: 'bg-purple-100 text-purple-800',
    },
    admin: { variant: 'default' as const, color: 'bg-blue-100 text-blue-800' },
    editor: {
      variant: 'secondary' as const,
      color: 'bg-green-100 text-green-800',
    },
    member: { variant: 'outline' as const, color: 'bg-gray-100 text-gray-800' },
  };

  const config = roleConfig[role];

  return (
    <Badge variant={config.variant} className={`${config.color} ${className}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </Badge>
  );
}

// Utility component for checking permissions inline
interface PermissionGateProps {
  tenantId: string;
  requiredPermission: keyof TenantPermissions;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({
  tenantId,
  requiredPermission,
  children,
  fallback = null,
}: PermissionGateProps): React.JSX.Element {
  const { canPerformAction } = useTenantActions();

  if (canPerformAction(requiredPermission as any)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

// Export sub-components
export { RoleBadge, PermissionItem };
