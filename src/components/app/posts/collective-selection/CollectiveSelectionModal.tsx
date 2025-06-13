'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  Users,
  CheckCircle2,
  AlertCircle,
  Filter,
  SortAsc,
  SortDesc,
} from 'lucide-react';
import {
  useCollectiveMemberships,
  useSearchCollectiveMemberships,
} from '@/hooks/posts/useCollectiveMemberships';
import { CollectiveWithPermission } from '@/types/enhanced-database.types';
import {
  CollectiveSelectionCard,
  CollectiveSelectionCardSkeleton,
} from './CollectiveSelectionCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface CollectiveSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCollectiveIds: string[];
  onSelectionChange: (collectiveIds: string[]) => void;
  maxSelections?: number;
  title?: string;
  description?: string;
  showPermissionFilter?: boolean;
  allowSearch?: boolean;
}

type SortOption = 'name' | 'role' | 'members';
type SortDirection = 'asc' | 'desc';

export function CollectiveSelectionModal({
  isOpen,
  onClose,
  selectedCollectiveIds,
  onSelectionChange,
  maxSelections,
  title = 'Select Collectives',
  description = 'Choose which collectives to share this post with',
  showPermissionFilter = true,
  allowSearch = true,
}: CollectiveSelectionModalProps) {
  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('role');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showOnlyPostable, setShowOnlyPostable] = useState(true);
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(
    selectedCollectiveIds,
  );

  // Data fetching
  const {
    data: allCollectives = [],
    isLoading: isLoadingAll,
    error: errorAll,
  } = useCollectiveMemberships(!showOnlyPostable);

  const { data: searchResults = [], isLoading: isSearching } =
    useSearchCollectiveMemberships(searchQuery);

  // Use search results when searching, otherwise use all collectives
  const collectivesToShow = useMemo(() => {
    let collectives = searchQuery.trim() ? searchResults : allCollectives;

    // Filter by posting permissions if enabled
    if (showOnlyPostable) {
      collectives = collectives.filter((c) => c.can_post);
    }

    // Sort collectives
    collectives = [...collectives].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'role': {
          const rolePriority: Record<string, number> = {
            owner: 4,
            admin: 3,
            editor: 2,
            author: 1,
          };
          comparison =
            (rolePriority[b.user_role] || 0) - (rolePriority[a.user_role] || 0);
          break;
        }
        case 'members':
          comparison = (b.member_count || 0) - (a.member_count || 0);
          break;
        default:
          comparison = 0;
          break;
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return collectives;
  }, [
    allCollectives,
    searchResults,
    searchQuery,
    showOnlyPostable,
    sortBy,
    sortDirection,
  ]);

  // Sync with external selected IDs when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalSelectedIds(selectedCollectiveIds);
    }
  }, [isOpen, selectedCollectiveIds]);

  // Clear search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleToggleSelection = (collectiveId: string) => {
    setLocalSelectedIds((prev) => {
      const isCurrentlySelected = prev.includes(collectiveId);

      if (isCurrentlySelected) {
        return prev.filter((id) => id !== collectiveId);
      } else {
        // Check max selections limit
        if (maxSelections && prev.length >= maxSelections) {
          return prev; // Don't add if limit reached
        }
        return [...prev, collectiveId];
      }
    });
  };

  const handleSelectAll = () => {
    const postableCollectives = collectivesToShow.filter((c) => c.can_post);
    const collectiveIds = postableCollectives.map((c) => c.id);

    if (maxSelections) {
      setLocalSelectedIds(collectiveIds.slice(0, maxSelections));
    } else {
      setLocalSelectedIds(collectiveIds);
    }
  };

  const handleClearAll = () => {
    setLocalSelectedIds([]);
  };

  const handleSave = () => {
    onSelectionChange(localSelectedIds);
    onClose();
  };

  const handleCancel = () => {
    setLocalSelectedIds(selectedCollectiveIds); // Reset to original
    onClose();
  };

  const isLoading = isLoadingAll || isSearching;
  const selectedCount = localSelectedIds.length;
  const postableCount = collectivesToShow.filter((c) => c.can_post).length;
  const hasChanges =
    JSON.stringify(localSelectedIds.sort()) !==
    JSON.stringify(selectedCollectiveIds.sort());

  const isAtMaxSelections = maxSelections && selectedCount >= maxSelections;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              {description && (
                <p className="text-sm text-gray-600 mt-1">{description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">
                {selectedCount} selected
                {maxSelections && ` / ${maxSelections}`}
              </Badge>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 flex-1 min-h-0 p-6">
          {/* Search and Filters */}
          <div className="flex flex-col gap-3">
            {/* Search Bar */}
            {allowSearch && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search collectives..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Filters and Controls */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {/* Permission Filter */}
                {showPermissionFilter && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="postable-only"
                      checked={showOnlyPostable}
                      onChange={(e) => setShowOnlyPostable(e.target.checked)}
                      className="rounded"
                    />
                    <label
                      htmlFor="postable-only"
                      className="text-sm font-medium"
                    >
                      Only show postable collectives
                    </label>
                  </div>
                )}

                {/* Sort Controls */}
                <div className="flex items-center gap-2">
                  <Select
                    value={sortBy}
                    onValueChange={(value: SortOption) => setSortBy(value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="role">Sort by Role</SelectItem>
                      <SelectItem value="name">Sort by Name</SelectItem>
                      <SelectItem value="members">Sort by Members</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSortDirection((prev) =>
                        prev === 'asc' ? 'desc' : 'asc',
                      )
                    }
                  >
                    {sortDirection === 'asc' ? (
                      <SortAsc className="w-4 h-4" />
                    ) : (
                      <SortDesc className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Bulk Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={postableCount === 0 || Boolean(isAtMaxSelections)}
                >
                  Select All{' '}
                  {maxSelections &&
                    `(${Math.min(postableCount, maxSelections)})`}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={selectedCount === 0}
                >
                  Clear All
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {collectivesToShow.length} collective
              {collectivesToShow.length !== 1 ? 's' : ''}
              {searchQuery && ` matching "${searchQuery}"`}
            </span>

            {isAtMaxSelections && (
              <div className="flex items-center gap-1 text-amber-600">
                <AlertCircle className="w-4 h-4" />
                <span>Maximum {maxSelections} collectives can be selected</span>
              </div>
            )}
          </div>

          {/* Collective Grid */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <CollectiveSelectionCardSkeleton key={i} />
                ))}
              </div>
            ) : errorAll ? (
              <div className="flex items-center justify-center py-8 text-red-600">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span>Failed to load collectives. Please try again.</span>
              </div>
            ) : collectivesToShow.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Users className="w-8 h-8 mb-2" />
                <p className="text-center">
                  {searchQuery
                    ? `No collectives found matching "${searchQuery}"`
                    : showOnlyPostable
                      ? "You don't have posting permissions in any collectives"
                      : 'No collectives found'}
                </p>
                {searchQuery && (
                  <Button
                    variant="link"
                    onClick={() => setSearchQuery('')}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {collectivesToShow.map((collective) => (
                  <CollectiveSelectionCard
                    key={collective.id}
                    collective={collective}
                    isSelected={localSelectedIds.includes(collective.id)}
                    onToggleSelection={handleToggleSelection}
                    disabled={
                      !collective.can_post ||
                      (Boolean(isAtMaxSelections) &&
                        !localSelectedIds.includes(collective.id))
                    }
                    showMemberCount
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
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
              className={cn(
                selectedCount > 0 && 'bg-blue-600 hover:bg-blue-700',
              )}
            >
              Save Selection
              {selectedCount > 0 && ` (${selectedCount})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
