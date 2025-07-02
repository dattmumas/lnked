'use client';

import { X, CheckCircle2 } from 'lucide-react';
import React, { useCallback, useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollectiveMemberships } from '@/hooks/posts/useCollectiveMemberships';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-background rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col shadow-xl border">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">{title}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">
                {selectedCount} selected
                {maxSelections !== undefined &&
                  maxSelections !== null &&
                  maxSelections > 0 &&
                  ` / ${maxSelections}`}
              </Badge>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 p-6">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <CollectiveSelectionCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8 text-destructive">
                <span>Failed to load collectives. Please try again.</span>
              </div>
            ) : postableCollectives.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
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
        <div className="p-6 border-t bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {selectedCount > 0 && (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>
                    {selectedCount} collective{selectedCount !== 1 ? 's' : ''}{' '}
                    selected
                  </span>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges}
                className={selectedCount > 0 ? 'bg-primary' : ''}
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
