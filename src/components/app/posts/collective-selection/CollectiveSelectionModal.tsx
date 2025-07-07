'use client';

import { X, CheckCircle2 } from 'lucide-react';
import React, { useCallback, useState, useEffect } from 'react';


import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollectiveMemberships } from '@/hooks/posts/useCollectiveMemberships';
import { cn } from '@/lib/utils';

import {
  CollectiveSelectionCard,
  CollectiveSelectionCardSkeleton,
} from './CollectiveSelectionCard';

import type { CollectiveWithPermission } from '@/lib/data-loaders/posts-loader';

interface CollectiveSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCollectiveIds: string[];
  onSelectionChange: (collectiveIds: string[]) => void;
  maxSelections?: number;
  title?: string;
  description?: string;
  initialCollectives?: CollectiveWithPermission[];
}

export function CollectiveSelectionModal({
  isOpen,
  onClose,
  selectedCollectiveIds,
  onSelectionChange,
  maxSelections,
  title = 'Select Collectives',
  description = 'Choose which collectives to share this post with. You can select multiple collectives where you have posting permissions.',
  initialCollectives,
}: CollectiveSelectionModalProps): React.ReactElement | null {
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(
    selectedCollectiveIds,
  );

  // Data fetching - use initialCollectives if provided, otherwise fetch from hooks
  const {
    data: hookCollectives = [],
    isLoading,
    error,
  } = useCollectiveMemberships(true); // Only show postable collectives

  // Use initialCollectives if provided, otherwise use hook data
  const allCollectives = initialCollectives || hookCollectives;

  // Filter to only show collectives where user can post
  const postableCollectives = allCollectives.filter((c) => c.can_post);

  // Sync with external selected IDs when modal opens
  useEffect((): void => {
    if (isOpen) {
      setLocalSelectedIds(selectedCollectiveIds);
    }
  }, [isOpen, selectedCollectiveIds]);

  const handleToggleSelection = useCallback(
    (collectiveId: string): void => {
      setLocalSelectedIds((prev) => {
        const isCurrentlySelected = prev.includes(collectiveId);

        if (isCurrentlySelected) {
          return prev.filter((id) => id !== collectiveId);
        } else {
          // Check max selections limit
          if (
            maxSelections !== undefined &&
            maxSelections !== null &&
            maxSelections > 0 &&
            prev.length >= maxSelections
          ) {
            return prev; // Don't add if limit reached
          }
          return [...prev, collectiveId];
        }
      });
    },
    [maxSelections],
  );

  const handleSave = useCallback((): void => {
    onSelectionChange(localSelectedIds);
    onClose();
  }, [localSelectedIds, onSelectionChange, onClose]);

  const handleCancel = useCallback((): void => {
    setLocalSelectedIds(selectedCollectiveIds); // Reset to original
    onClose();
  }, [selectedCollectiveIds, onClose]);

  const selectedCount = localSelectedIds.length;
  const hasChanges =
    JSON.stringify(localSelectedIds.sort()) !==
    JSON.stringify(selectedCollectiveIds.sort());

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-purple-900/20 to-slate-900/80 backdrop-blur-md" />

      {/* Glass modal */}
      <div className="relative bg-white/10 dark:bg-black/20 backdrop-blur-xl rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl ring-1 ring-white/20 dark:ring-white/10 border border-white/20 dark:border-white/10">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 dark:border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">{title}</h2>
              <p className="text-sm text-white/70 mt-1">{description}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 text-white/90 text-sm font-medium whitespace-nowrap">
                {selectedCount} selected
                {maxSelections !== undefined &&
                  maxSelections !== null &&
                  maxSelections > 0 &&
                  ` / ${maxSelections}`}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 p-6 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <CollectiveSelectionCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8 text-red-400">
                <span>Failed to load collectives. Please try again.</span>
              </div>
            ) : postableCollectives.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-white/60">
                <p className="text-center">
                  You don't have posting permissions in any collectives yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {postableCollectives.map((collective) => (
                  <CollectiveSelectionCard
                    key={collective.id}
                    collective={collective}
                    isSelected={localSelectedIds.includes(collective.id)}
                    onToggle={handleToggleSelection}
                    disabled={
                      maxSelections !== undefined &&
                      maxSelections !== null &&
                      maxSelections > 0 &&
                      selectedCount >= maxSelections &&
                      !localSelectedIds.includes(collective.id)
                    }
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 dark:border-white/5 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm rounded-b-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-white/60">
              {selectedCount > 0 && (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span>
                    {selectedCount} collective{selectedCount !== 1 ? 's' : ''}{' '}
                    selected
                  </span>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="border-white/20 text-white/90 hover:bg-white/10 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges}
                className={cn(
                  'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0',
                  !hasChanges && 'opacity-50 cursor-not-allowed',
                )}
              >
                Save Selection ({selectedCount})
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
