'use client';

import { Settings, LogOut, Users2, Edit } from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useState } from 'react';

import { removeMemberFromCollective } from '@/app/actions/memberActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import type { Database } from '@/lib/database.types';

type Collective = Database['public']['Tables']['collectives']['Row'];
export type CollectiveMemberRole =
  Database['public']['Enums']['collective_member_role'];

interface DashboardCollectiveCardProps {
  collective: Collective;
  userRole: 'Owner' | CollectiveMemberRole;
  memberId?: string; // For leave action, if user is not owner
  subscriberCount?: number;
}

export default function DashboardCollectiveCard({
  collective,
  userRole,
  memberId,
  subscriberCount,
}: DashboardCollectiveCardProps): React.ReactElement {
  const [isLeaving, setIsLeaving] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | undefined>(
    undefined,
  );

  const handleLeaveCollective = useCallback(async (): Promise<void> => {
    if (userRole === 'Owner') return;
    if (memberId === undefined || memberId === null || memberId.length === 0) {
      console.error('Member ID is required to leave a collective.');
      setStatusMessage('Error: Could not leave collective. Member ID missing.');
      return;
    }

    if (!showLeaveConfirm) {
      setShowLeaveConfirm(true);
      return;
    }

    setIsLeaving(true);
    setStatusMessage(undefined);

    try {
      const result = await removeMemberFromCollective({
        collectiveId: collective.id,
        memberId,
      });
      if (result.success) {
        setStatusMessage('Successfully left collective.');
      } else {
        setStatusMessage(
          `Failed to leave collective: ${result.error !== undefined && result.error !== null && result.error.length > 0 ? result.error : 'Unknown error'}`,
        );
      }
    } catch (error) {
      setStatusMessage('Failed to leave collective: Network error');
      console.error('Error leaving collective:', error);
    } finally {
      setIsLeaving(false);
      setShowLeaveConfirm(false);
    }
  }, [userRole, memberId, collective.id, showLeaveConfirm]);

  const handleLeaveClick = useCallback((): void => {
    void handleLeaveCollective();
  }, [handleLeaveCollective]);

  const handleCancelLeave = useCallback((): void => {
    setShowLeaveConfirm(false);
    setStatusMessage(undefined);
  }, []);

  // Check if user can post to this collective
  const canPost =
    userRole === 'Owner' ||
    ['admin', 'editor', 'author'].includes(userRole as string);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="hover:text-accent line-clamp-1 break-all">
            <Link href={`/collectives/${collective.slug}`}>
              {collective.name}
            </Link>
          </CardTitle>
          <Badge
            variant={userRole === 'Owner' ? 'default' : 'secondary'}
            className="capitalize flex-shrink-0"
          >
            {userRole}
          </Badge>
        </div>
        {collective.description !== undefined &&
          collective.description !== null &&
          collective.description.length > 0 && (
            <CardDescription className="line-clamp-2 pt-1 text-sm">
              {collective.description}
            </CardDescription>
          )}
      </CardHeader>
      <CardContent className="flex-grow text-sm">
        {userRole === 'Owner' && (
          <div className="space-y-1.5 text-xs text-muted-foreground pt-2 mt-2 border-t border-border">
            <div className="flex items-center">
              <Users2 className="h-3.5 w-3.5 mr-1.5 text-sky-600 dark:text-sky-400" />{' '}
              Subscribers:{' '}
              <span className="font-semibold ml-1 text-foreground">
                {subscriberCount ?? '0'}
              </span>
            </div>
          </div>
        )}

        {/* Status message display */}
        {statusMessage !== undefined &&
          statusMessage !== null &&
          statusMessage.length > 0 && (
            <div
              className={`mt-2 p-2 rounded text-sm ${
                statusMessage.includes('Success') ||
                statusMessage.includes('Successfully')
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {statusMessage}
            </div>
          )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row flex-wrap items-stretch gap-2 pt-4 border-t mt-auto">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="flex-grow basis-1/3 sm:basis-auto"
        >
          <Link
            href={`/collectives/${collective.slug}`}
            className="flex items-center justify-center w-full"
          >
            <Users2 className="h-4 w-4 mr-1.5" /> View
          </Link>
        </Button>
        {canPost && (
          <Button
            variant="default"
            size="sm"
            asChild
            className="flex-grow basis-1/3 sm:basis-auto"
            title={`Create a post and share it with ${collective.name}`}
          >
            <Link
              href="/posts/new"
              className="flex items-center justify-center w-full"
            >
              <Edit className="h-4 w-4 mr-1.5" /> Create Post
            </Link>
          </Button>
        )}
        {userRole === 'Owner' ? (
          <>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex-grow basis-1/3 sm:basis-auto"
            >
              <Link
                href={`/collectives/${collective.slug}/members`}
                className="flex items-center justify-center w-full"
              >
                <Users2 className="h-4 w-4 mr-1.5" /> Members
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex-grow basis-1/3 sm:basis-auto"
            >
              <Link
                href={`/collectives/${collective.slug}/settings`}
                className="flex items-center justify-center w-full"
              >
                <Settings className="h-4 w-4 mr-1.5" /> Settings
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex-grow basis-1/3 sm:basis-auto"
            >
              <Link
                href={`/collectives/${collective.slug}/subscribers`}
                className="flex items-center justify-center w-full"
              >
                <Users2 className="h-4 w-4 mr-1.5" /> Subscribers
              </Link>
            </Button>
          </>
        ) : (
          <div className="flex flex-col gap-2 flex-grow basis-full sm:basis-auto">
            {showLeaveConfirm ? (
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleLeaveClick}
                  disabled={
                    isLeaving ||
                    memberId === undefined ||
                    memberId === null ||
                    memberId.length === 0
                  }
                  className="flex-1"
                >
                  <LogOut className="h-4 w-4 mr-1.5" />
                  {isLeaving ? 'Leaving...' : 'Confirm Leave'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelLeave}
                  disabled={isLeaving}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLeaveClick}
                disabled={
                  memberId === undefined ||
                  memberId === null ||
                  memberId.length === 0
                }
                className="flex items-center justify-center w-full"
              >
                <LogOut className="h-4 w-4 mr-1.5" /> Leave
              </Button>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
