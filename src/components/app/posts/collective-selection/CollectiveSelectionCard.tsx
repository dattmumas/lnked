'use client';

import { Check, Users } from 'lucide-react';
import Image from 'next/image';
import React, { useCallback } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { type CollectiveWithPermission } from '@/lib/stores/post-editor-v2-store';
import { cn } from '@/lib/utils';

interface CollectiveSelectionCardProps {
  collective: CollectiveWithPermission;
  isSelected: boolean;
  onToggle: (collectiveId: string) => void;
  disabled?: boolean;
  className?: string;
}

export function CollectiveSelectionCard({
  collective,
  isSelected,
  onToggle,
  disabled = false,
  className,
}: CollectiveSelectionCardProps): React.JSX.Element {
  const handleToggle = useCallback(() => {
    if (!disabled) {
      onToggle(collective.id);
    }
  }, [collective.id, disabled, onToggle]);

  return (
    <Card
      className={cn(
        'relative cursor-pointer transition-all duration-200 border backdrop-blur-sm',
        isSelected
          ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-purple-400/50 shadow-lg shadow-purple-500/20'
          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      onClick={handleToggle}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          handleToggle();
        }
      }}
    >
      <CardContent className="px-1 py-0">
        <div className="flex items-center space-x-3">
          {/* Checkbox */}
          <div
            className={cn(
              'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0',
              isSelected
                ? 'bg-gradient-to-br from-purple-600 to-blue-600 border-transparent'
                : 'border-white/30 bg-white/5',
              disabled && 'opacity-50',
            )}
          >
            {isSelected && <Check className="h-3 w-3 text-white" />}
          </div>

          {/* Collective Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-white truncate">
                {collective.name}
              </h3>
              {collective.logo_url && (
                <Image
                  src={collective.logo_url}
                  alt={`${collective.name} logo`}
                  width={20}
                  height={20}
                  className="rounded-full flex-shrink-0"
                  sizes="20px"
                />
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-white/60">
                <Users className="h-3 w-3" />
                <span>{collective.member_count || 0} members</span>
              </div>

              <div className="px-2 py-0.5 rounded-full bg-white/10 text-white/80 text-xs capitalize">
                {collective.user_role}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading skeleton
export function CollectiveSelectionCardSkeleton(): React.ReactElement {
  return (
    <Card className="animate-pulse border border-white/10 bg-white/5 backdrop-blur-sm">
      <CardContent className="px-4 py-2">
        <div className="flex items-center space-x-3">
          <div className="w-4 h-4 rounded bg-white/10 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-white/10 rounded w-3/4" />
            <div className="h-3 bg-white/10 rounded w-1/2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
