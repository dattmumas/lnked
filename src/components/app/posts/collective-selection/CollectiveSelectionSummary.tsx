'use client';

import { useState } from 'react';
import {
  Plus,
  Users,
  Settings,
  Crown,
  Shield,
  Edit3,
  PenTool,
  X,
} from 'lucide-react';
import { useCollectiveMemberships } from '@/hooks/posts/useCollectiveMemberships';
import { CollectiveWithPermission } from '@/types/enhanced-database.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CollectiveSelectionModal } from './CollectiveSelectionModal';
import { cn } from '@/lib/utils';

interface CollectiveSelectionSummaryProps {
  selectedCollectiveIds: string[];
  onSelectionChange: (collectiveIds: string[]) => void;
  disabled?: boolean;
  maxSelections?: number;
  placeholder?: string;
  showRoles?: boolean;
  compact?: boolean;
  className?: string;
}

// Role icon mapping
const roleIcons = {
  owner: Crown,
  admin: Shield,
  editor: Edit3,
  author: PenTool,
};

const roleColors = {
  owner: 'text-yellow-600 bg-yellow-50',
  admin: 'text-blue-600 bg-blue-50',
  editor: 'text-green-600 bg-green-50',
  author: 'text-purple-600 bg-purple-50',
};

export function CollectiveSelectionSummary({
  selectedCollectiveIds,
  onSelectionChange,
  disabled = false,
  maxSelections,
  placeholder = 'Select collectives to share with',
  showRoles = true,
  compact = false,
  className,
}: CollectiveSelectionSummaryProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch collective data for selected IDs
  const { data: allCollectives = [] } = useCollectiveMemberships(false);

  const selectedCollectives = allCollectives.filter((collective) =>
    selectedCollectiveIds.includes(collective.id),
  );

  const handleOpenModal = () => {
    if (!disabled) {
      setIsModalOpen(true);
    }
  };

  const handleRemoveCollective = (
    collectiveId: string,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation();
    if (!disabled) {
      onSelectionChange(
        selectedCollectiveIds.filter((id) => id !== collectiveId),
      );
    }
  };

  const canAddMore =
    !maxSelections || selectedCollectiveIds.length < maxSelections;

  return (
    <TooltipProvider>
      <div className={cn('space-y-3', className)}>
        {/* Selected Collectives Display */}
        {selectedCollectives.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Selected Collectives ({selectedCollectives.length}
                {maxSelections && `/${maxSelections}`})
              </label>
              {selectedCollectives.length > 0 && !disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectionChange([])}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Clear all
                </Button>
              )}
            </div>

            {/* Collective Cards */}
            <div
              className={cn(
                'grid gap-2',
                compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2',
              )}
            >
              {selectedCollectives.map((collective) => (
                <CollectiveCard
                  key={collective.id}
                  collective={collective}
                  onRemove={(id, event) => handleRemoveCollective(id, event)}
                  disabled={disabled}
                  showRole={showRoles}
                  compact={compact}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-6">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">{placeholder}</p>
          </div>
        )}

        {/* Add/Manage Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleOpenModal}
            disabled={
              disabled || (!canAddMore && selectedCollectives.length > 0)
            }
            variant={selectedCollectives.length > 0 ? 'outline' : 'default'}
            className="w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            {selectedCollectives.length > 0
              ? canAddMore
                ? 'Add More Collectives'
                : 'Manage Selection'
              : 'Select Collectives'}
          </Button>
        </div>

        {/* Selection Modal */}
        <CollectiveSelectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          selectedCollectiveIds={selectedCollectiveIds}
          onSelectionChange={onSelectionChange}
          maxSelections={maxSelections}
          title={
            selectedCollectives.length > 0
              ? 'Manage Collective Selection'
              : 'Select Collectives'
          }
          description={
            maxSelections
              ? `Choose up to ${maxSelections} collectives to share this post with`
              : 'Choose which collectives to share this post with'
          }
        />
      </div>
    </TooltipProvider>
  );
}

// Individual collective card component
interface CollectiveCardProps {
  collective: CollectiveWithPermission;
  onRemove: (id: string, event: React.MouseEvent) => void;
  disabled: boolean;
  showRole: boolean;
  compact: boolean;
}

function CollectiveCard({
  collective,
  onRemove,
  disabled,
  showRole,
  compact,
}: CollectiveCardProps) {
  const RoleIcon = roleIcons[collective.user_role];
  const roleColorClass = roleColors[collective.user_role];

  return (
    <Card className="transition-all duration-200 hover:shadow-sm">
      <CardContent className={cn('p-3', compact && 'p-2')}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Collective Avatar */}
            <div className="flex-shrink-0">
              {collective.logo_url ? (
                <img
                  src={collective.logo_url}
                  alt={`${collective.name} logo`}
                  className={cn(
                    'rounded-full object-cover',
                    compact ? 'w-6 h-6' : 'w-8 h-8',
                  )}
                />
              ) : (
                <div
                  className={cn(
                    'rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold',
                    compact ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm',
                  )}
                >
                  {collective.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Collective Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'font-medium text-gray-900 truncate',
                    compact ? 'text-sm' : 'text-base',
                  )}
                >
                  {collective.name}
                </span>

                {showRole && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'flex items-center gap-1 text-xs',
                          roleColorClass,
                        )}
                      >
                        <RoleIcon className="w-3 h-3" />
                        {collective.user_role}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Your role in this collective</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {!compact && collective.description && (
                <p className="text-xs text-gray-500 truncate mt-1">
                  {collective.description}
                </p>
              )}
            </div>
          </div>

          {/* Remove Button */}
          {!disabled && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => onRemove(collective.id, e)}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Remove from selection</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for smaller spaces
export function CompactCollectiveSelectionSummary(
  props: CollectiveSelectionSummaryProps,
) {
  return <CollectiveSelectionSummary {...props} compact={true} />;
}

// Loading skeleton
export function CollectiveSelectionSummarySkeleton({
  compact = false,
  count = 2,
}: {
  compact?: boolean;
  count?: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 bg-gray-200 rounded w-32" />
        <div className="h-6 bg-gray-200 rounded w-16" />
      </div>

      <div
        className={cn(
          'grid gap-2',
          compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2',
        )}
      >
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className={cn('p-3', compact && 'p-2')}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className={cn(
                      'rounded-full bg-gray-200',
                      compact ? 'w-6 h-6' : 'w-8 h-8',
                    )}
                  />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
                    {!compact && (
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    )}
                  </div>
                </div>
                <div className="w-8 h-8 bg-gray-200 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <div className="h-10 bg-gray-200 rounded w-32" />
      </div>
    </div>
  );
}
