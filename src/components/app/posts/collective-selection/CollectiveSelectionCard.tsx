'use client';

import {
  CheckCircle2,
  Users,
  Crown,
  Shield,
  Edit3,
  PenTool,
  AlertCircle,
  Info,
} from 'lucide-react';
import Image from 'next/image';
import React, { useCallback, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { CollectiveWithPermission } from '@/types/enhanced-database.types';

// Constants
const AVATAR_SIZE_COMPACT = 32;
const AVATAR_SIZE_NORMAL = 40;

interface CollectiveSelectionCardProps {
  collective: CollectiveWithPermission;
  isSelected: boolean;
  onToggleSelection: (collectiveId: string) => void;
  disabled?: boolean;
  showMemberCount?: boolean;
  compact?: boolean;
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
  onToggleSelection,
  disabled = false,
  showMemberCount = true,
  compact = false,
}: CollectiveSelectionCardProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);

  const roleInfo = roleConfig[collective.user_role];
  const RoleIcon = roleInfo.icon;

  const handleClick = useCallback((): void => {
    if (!disabled && collective.can_post) {
      onToggleSelection(collective.id);
    }
  }, [disabled, collective.can_post, collective.id, onToggleSelection]);

  const handleMouseEnter = useCallback((): void => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback((): void => {
    setIsHovered(false);
  }, []);

  const canPost = collective.can_post;
  const isInteractive = canPost && !disabled;

  return (
    <TooltipProvider>
      <Card
        className={cn(
          'relative cursor-pointer transition-all duration-200 border-2',
          compact ? 'p-2' : 'p-1',
          isSelected && canPost
            ? 'border-blue-500 bg-blue-50 shadow-md'
            : 'border-gray-200 hover:border-gray-300',
          !canPost
            ? 'opacity-60 cursor-not-allowed bg-gray-50'
            : isInteractive
              ? 'hover:shadow-lg hover:border-blue-300'
              : 'cursor-not-allowed',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <CardContent className={cn('p-3', compact && 'p-2')}>
          <div className="flex items-start justify-between gap-3">
            {/* Collective Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {/* Collective Avatar/Logo */}
                <div className="flex-shrink-0">
                  {collective.logo_url !== undefined &&
                  collective.logo_url !== null &&
                  collective.logo_url.length > 0 ? (
                    <Image
                      src={collective.logo_url}
                      alt={`${collective.name} logo`}
                      width={compact ? AVATAR_SIZE_COMPACT : AVATAR_SIZE_NORMAL}
                      height={
                        compact ? AVATAR_SIZE_COMPACT : AVATAR_SIZE_NORMAL
                      }
                      className={cn(
                        'rounded-full object-cover',
                        compact ? 'w-8 h-8' : 'w-10 h-10',
                      )}
                    />
                  ) : (
                    <div
                      className={cn(
                        'rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold',
                        compact ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-lg',
                      )}
                    >
                      {collective.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Collective Name */}
                <div className="flex-1 min-w-0">
                  <h3
                    className={cn(
                      'font-semibold text-gray-900 truncate',
                      compact ? 'text-sm' : 'text-base',
                    )}
                  >
                    {collective.name}
                  </h3>
                  {!compact &&
                    collective.description !== undefined &&
                    collective.description !== null &&
                    collective.description.length > 0 && (
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {collective.description}
                      </p>
                    )}
                </div>
              </div>

              {/* Role and Member Count */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Role Badge */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'flex items-center gap-1 text-xs',
                          roleInfo.bgColor,
                          roleInfo.color,
                        )}
                      >
                        <RoleIcon className="w-3 h-3" />
                        {roleInfo.label}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{roleInfo.description}</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Posting Permission Indicator */}
                  {!canPost && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Insufficient permissions to post</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Member Count */}
                {showMemberCount &&
                  collective.member_count !== undefined &&
                  collective.member_count !== null &&
                  collective.member_count > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Users className="w-3 h-3" />
                      <span>{collective.member_count}</span>
                    </div>
                  )}
              </div>
            </div>

            {/* Selection Indicator */}
            <div className="flex-shrink-0">
              {canPost ? (
                <div
                  className={cn(
                    'rounded-full transition-all duration-200',
                    isSelected
                      ? 'text-blue-600 bg-blue-100'
                      : isHovered
                        ? 'text-gray-400 bg-gray-100'
                        : 'text-gray-300',
                  )}
                >
                  <CheckCircle2
                    className={cn(compact ? 'w-5 h-5' : 'w-6 h-6')}
                  />
                </div>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-gray-400">
                      <Info className={cn(compact ? 'w-5 h-5' : 'w-6 h-6')} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>You need author, editor, admin, or owner role to post</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Selected State Overlay */}
          {isSelected && canPost && (
            <div className="absolute inset-0 bg-blue-500 opacity-5 rounded-lg pointer-events-none" />
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

// Compact version for smaller spaces
export function CompactCollectiveSelectionCard(
  props: CollectiveSelectionCardProps,
): React.ReactElement {
  return <CollectiveSelectionCard {...props} compact />;
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
