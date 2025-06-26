'use client';

import {
  Check,
  Settings,
  Users,
  Crown,
  Shield,
  Edit3,
  PenTool,
} from 'lucide-react';
import React, { useCallback, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type {
  CollectiveWithPermission,
  CollectiveSharingSettings,
} from '@/lib/stores/enhanced-post-editor-store';

// Constants
const AVATAR_SIZE_COMPACT = 32;
const AVATAR_SIZE_NORMAL = 40;

interface CollectiveSelectionCardProps {
  collective: CollectiveWithPermission;
  isSelected: boolean;
  sharingSettings?: CollectiveSharingSettings;
  onToggle: (collectiveId: string) => void;
  onSettingsClick?: (collectiveId: string) => void;
  disabled?: boolean;
  showSettings?: boolean;
  className?: string;
}

// Role icon mapping with colors
const roleConfig = {
  owner: {
    icon: Crown,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    label: 'Owner',
    description: 'Full control over collective',
  },
  admin: {
    icon: Shield,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label: 'Admin',
    description: 'Manage collective and posts',
  },
  editor: {
    icon: Edit3,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: 'Editor',
    description: 'Create and edit posts',
  },
  author: {
    icon: PenTool,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    label: 'Author',
    description: 'Create posts',
  },
};

export function CollectiveSelectionCard({
  collective,
  isSelected,
  sharingSettings,
  onToggle,
  onSettingsClick,
  disabled = false,
  showSettings = true,
  className,
}: CollectiveSelectionCardProps): React.JSX.Element {
  const handleToggle = useCallback(() => {
    if (!disabled) {
      onToggle(collective.id);
    }
  }, [collective.id, disabled, onToggle]);

  const handleSettingsClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onSettingsClick && isSelected) {
        onSettingsClick(collective.id);
      }
    },
    [collective.id, isSelected, onSettingsClick],
  );

  // Determine if user can post to this collective
  const canPost = useMemo(() => {
    return (
      collective.can_post &&
      ['author', 'editor', 'admin', 'owner'].includes(collective.user_role)
    );
  }, [collective.can_post, collective.user_role]);

  // Get role badge color
  const roleColor = useMemo(() => {
    switch (collective.user_role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'editor':
        return 'bg-green-100 text-green-800';
      case 'author':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, [collective.user_role]);

  // Get status indicator
  const statusInfo = useMemo(() => {
    if (!isSelected || !sharingSettings) {
      return null;
    }

    const { status, auto_publish, require_approval } = sharingSettings;

    if (status === 'published') {
      return { label: 'Published', color: 'bg-green-100 text-green-800' };
    }
    if (status === 'draft') {
      return { label: 'Draft', color: 'bg-yellow-100 text-yellow-800' };
    }
    if (status === 'pending_approval') {
      return { label: 'Pending', color: 'bg-orange-100 text-orange-800' };
    }
    if (require_approval) {
      return {
        label: 'Needs Approval',
        color: 'bg-orange-100 text-orange-800',
      };
    }
    if (auto_publish) {
      return { label: 'Auto Publish', color: 'bg-blue-100 text-blue-800' };
    }

    return null;
  }, [isSelected, sharingSettings]);

  return (
    <Card
      className={cn(
        'relative cursor-pointer transition-all duration-200 hover:shadow-md',
        isSelected && 'ring-2 ring-blue-500 shadow-md',
        disabled && 'opacity-50 cursor-not-allowed',
        !canPost && 'border-red-200 bg-red-50',
        className,
      )}
      onClick={handleToggle}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          handleToggle();
        }
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="relative">
              <div
                className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center mt-1',
                  isSelected
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-300',
                  (disabled || !canPost) && 'opacity-50',
                )}
              >
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-medium text-gray-900 truncate">
                  {collective.name}
                </h3>
                {collective.logo_url && (
                  <img
                    src={collective.logo_url}
                    alt={`${collective.name} logo`}
                    className="h-4 w-4 rounded-full flex-shrink-0"
                  />
                )}
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Users className="h-3 w-3" />
                <span>{collective.member_count || 0} members</span>
                <Badge variant="outline" className={cn('text-xs', roleColor)}>
                  {collective.user_role}
                </Badge>
              </div>
            </div>
          </div>

          {showSettings && isSelected && onSettingsClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSettingsClick}
              className="h-8 w-8 p-0 flex-shrink-0"
              disabled={disabled}
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only">
                Sharing settings for {collective.name}
              </span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {collective.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {collective.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {!canPost && (
            <Badge variant="destructive" className="text-xs">
              Cannot Post
            </Badge>
          )}

          {statusInfo && (
            <Badge className={cn('text-xs', statusInfo.color)}>
              {statusInfo.label}
            </Badge>
          )}

          {isSelected &&
            sharingSettings?.display_priority !== undefined &&
            sharingSettings.display_priority > 0 && (
              <Badge variant="outline" className="text-xs">
                Priority: {sharingSettings.display_priority}
              </Badge>
            )}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for smaller spaces
export function CompactCollectiveSelectionCard(
  props: CollectiveSelectionCardProps,
): React.ReactElement {
  return <CollectiveSelectionCard {...props} />;
}

// Loading skeleton
export function CollectiveSelectionCardSkeleton({
  compact = false,
}: {
  compact?: boolean;
}): React.ReactElement {
  return (
    <Card className={cn('animate-pulse', compact ? 'p-2' : 'p-1')}>
      <CardContent className={cn('p-3', compact && 'p-2')}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div
                className={cn(
                  'rounded-full bg-gray-200',
                  compact ? 'w-8 h-8' : 'w-10 h-10',
                )}
              />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
                {!compact && <div className="h-3 bg-gray-200 rounded w-1/2" />}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="h-5 bg-gray-200 rounded w-16" />
              <div className="h-4 bg-gray-200 rounded w-8" />
            </div>
          </div>
          <div
            className={cn(
              'rounded-full bg-gray-200',
              compact ? 'w-5 h-5' : 'w-6 h-6',
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
