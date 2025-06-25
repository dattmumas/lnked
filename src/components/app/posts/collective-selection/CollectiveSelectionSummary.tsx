'use client';

import {
  Users,
  Settings,
  Eye,
  EyeOff,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import React, { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';

import type {
  CollectiveWithPermission,
  CollectiveSharingSettings,
} from '@/lib/stores/enhanced-post-editor-store';

interface CollectiveSelectionSummaryProps {
  selectedCollectives: CollectiveWithPermission[];
  sharingSettings: Record<string, CollectiveSharingSettings>;
  onEditSettings?: (collectiveId: string) => void;
  onRemoveCollective?: (collectiveId: string) => void;
  className?: string;
}

export function CollectiveSelectionSummary({
  selectedCollectives,
  sharingSettings,
  onEditSettings,
  onRemoveCollective,
  className,
}: CollectiveSelectionSummaryProps): React.JSX.Element {
  const totalMembers = useMemo(() => {
    return selectedCollectives.reduce((sum, collective) => {
      return sum + (collective.member_count || 0);
    }, 0);
  }, [selectedCollectives]);

  const statusCounts = useMemo(() => {
    const counts = {
      published: 0,
      draft: 0,
      pending_approval: 0,
      auto_publish: 0,
    };

    selectedCollectives.forEach((collective) => {
      const settings = sharingSettings[collective.id];
      if (settings) {
        switch (settings.status) {
        case 'published': {
          counts.published++;
        
        break;
        }
        case 'draft': {
          counts.draft++;
        
        break;
        }
        case 'pending_approval': {
          counts.pending_approval++;
        
        break;
        }
        // No default
        }

        if (settings.auto_publish) {
          counts.auto_publish++;
        }
      }
    });

    return counts;
  }, [selectedCollectives, sharingSettings]);

  if (selectedCollectives.length === 0) {
    return (
      <Card className={cn('border-dashed border-2', className)}>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Users className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No collectives selected
          </h3>
          <p className="text-sm text-gray-500">
            Select collectives to share your post with their communities
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Selected Collectives ({selectedCollectives.length})
          </span>
          <Badge variant="outline" className="text-sm">
            {totalMembers.toLocaleString()} total members
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Summary */}
        <div className="flex flex-wrap gap-2">
          {statusCounts.published > 0 && (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              {statusCounts.published} Published
            </Badge>
          )}
          {statusCounts.draft > 0 && (
            <Badge className="bg-yellow-100 text-yellow-800">
              <EyeOff className="h-3 w-3 mr-1" />
              {statusCounts.draft} Draft
            </Badge>
          )}
          {statusCounts.pending_approval > 0 && (
            <Badge className="bg-orange-100 text-orange-800">
              <Calendar className="h-3 w-3 mr-1" />
              {statusCounts.pending_approval} Pending
            </Badge>
          )}
          {statusCounts.auto_publish > 0 && (
            <Badge className="bg-blue-100 text-blue-800">
              <Eye className="h-3 w-3 mr-1" />
              {statusCounts.auto_publish} Auto-publish
            </Badge>
          )}
        </div>

        {/* Collective List */}
        <div className="space-y-2">
          {selectedCollectives.map((collective) => {
            const settings = sharingSettings[collective.id];

            return (
              <div
                key={collective.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {collective.logo_url && (
                    <img
                      src={collective.logo_url}
                      alt={`${collective.name} logo`}
                      className="h-8 w-8 rounded-full flex-shrink-0"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {collective.name}
                    </h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Users className="h-3 w-3" />
                      <span>{collective.member_count || 0} members</span>
                      <Badge variant="outline" className="text-xs">
                        {collective.user_role}
                      </Badge>
                    </div>
                  </div>

                  {settings && (
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          settings.status === 'published' &&
                            'bg-green-100 text-green-800',
                          settings.status === 'draft' &&
                            'bg-yellow-100 text-yellow-800',
                          settings.status === 'pending_approval' &&
                            'bg-orange-100 text-orange-800',
                        )}
                      >
                        {settings.status}
                      </Badge>

                      {settings.display_priority !== undefined &&
                        settings.display_priority > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Priority: {settings.display_priority}
                          </Badge>
                        )}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  {onEditSettings && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditSettings(collective.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Settings className="h-4 w-4" />
                      <span className="sr-only">
                        Edit settings for {collective.name}
                      </span>
                    </Button>
                  )}

                  {onRemoveCollective && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveCollective(collective.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      ×<span className="sr-only">Remove {collective.name}</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        {selectedCollectives.length > 1 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Sharing with {selectedCollectives.length} collectives</span>
              <span>Reaching {totalMembers.toLocaleString()} members</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
