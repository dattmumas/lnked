'use client';

import { Check, Users } from 'lucide-react';
import React, { useCallback } from 'react';

import { Badge } from '@/components/ui/badge';
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
        'relative cursor-pointer transition-all duration-200 hover:shadow-md border',
        isSelected && 'ring-2 ring-primary shadow-md bg-muted/20',
        disabled && 'opacity-50 cursor-not-allowed',
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
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          {/* Checkbox */}
          <div
            className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
              isSelected
                ? 'bg-primary border-primary'
                : 'border-muted-foreground/30',
              disabled && 'opacity-50',
            )}
          >
            {isSelected && (
              <Check className="h-3 w-3 text-primary-foreground" />
            )}
          </div>

          {/* Collective Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-medium text-foreground truncate">
                {collective.name}
              </h3>
              {collective.logo_url && (
                <img
                  src={collective.logo_url}
                  alt={`${collective.name} logo`}
                  className="h-5 w-5 rounded-full flex-shrink-0"
                />
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{collective.member_count || 0} members</span>
              </div>

              <Badge variant="outline" className="text-xs capitalize">
                {collective.user_role}
              </Badge>
            </div>

            {collective.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {collective.description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading skeleton
export function CollectiveSelectionCardSkeleton(): React.ReactElement {
  return (
    <Card className="animate-pulse border">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 rounded bg-muted flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
