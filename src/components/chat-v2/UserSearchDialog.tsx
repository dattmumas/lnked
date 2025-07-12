'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { useState, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { useUserSearch } from '@/hooks/useUserSearch';
import { useTenant } from '@/providers/TenantProvider';

interface User {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface UserSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated?: (conversationId: string) => void;
}

const DEBOUNCE_MS = 300;

// Type guard utility functions
const isNonEmptyString = (value: string | null): value is string => {
  return value !== null && typeof value === 'string' && value.trim() !== '';
};

const isValidUrl = (value: string | null): value is string => {
  return value !== null && typeof value === 'string';
};

const isStringValue = (value: unknown): value is string => {
  return typeof value === 'string';
};

export function UserSearchDialog({
  open,
  onOpenChange,
  onConversationCreated,
}: UserSearchDialogProps): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, DEBOUNCE_MS);
  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useUserSearch(debouncedQuery, open);
  const { currentTenantId } = useTenant();

  // Ensure users is always an array
  const users = Array.isArray(usersData) ? usersData : [];

  const createConversationMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!currentTenantId) {
        throw new Error('No tenant selected');
      }

      const response = await fetch(
        `/api/tenants/${currentTenantId}/conversations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'direct',
            participant_ids: [userId],
          }),
        },
      );

      if (!response.ok) {
        const fallbackError = 'Unknown error';
        // Parse error response safely
        const errorPayload = (await response
          .json()
          .catch(() => ({ error: fallbackError }))) as Partial<{
          error: unknown;
        }>;

        const errorMessage = isStringValue(errorPayload.error)
          ? errorPayload.error
          : 'Failed to create conversation';
        throw new Error(errorMessage);
      }

      // Explicitly type the (potentially) wrapped API response to avoid `any`.
      type Conversation = {
        id: string;
        // Add other fields here if required in future.
      };

      type ConversationResponse = {
        conversation: Conversation;
      };

      type ApiResponse = ConversationResponse | { data: ConversationResponse };

      const parsedResponse = (await response.json()) as ApiResponse;
      const data: ConversationResponse =
        'data' in parsedResponse ? parsedResponse.data : parsedResponse;

      // Ensure we have a valid conversation object
      if (!data.conversation || !isStringValue(data.conversation.id)) {
        console.error(
          'Invalid conversation data:',
          JSON.stringify(data, null, 2),
        );
        throw new Error('Invalid conversation data received');
      }

      return data.conversation;
    },
    onMutate: async (userId: string) => {
      // Close dialog immediately for responsive UX
      onOpenChange(false);
      setSearchQuery('');

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['direct-messages'] });

      // Return context for rollback if needed
      return { userId };
    },
    onSuccess: (data) => {
      // Ensure data has an id before proceeding
      if (!data || !data.id) {
        console.error(
          'Invalid conversation data in onSuccess:',
          JSON.stringify(data, null, 2),
        );
        return;
      }

      // Invalidate ALL conversation-related caches for immediate UI updates
      void queryClient.invalidateQueries({
        queryKey: ['direct-messages'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['tenant-channels'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['conversations'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['chat'],
      });

      // Navigate to the new conversation
      if (onConversationCreated !== undefined && isStringValue(data.id)) {
        onConversationCreated(data.id);
      }
    },
    onError: (error, variables, context) => {
      console.error('Failed to create conversation:', error);

      // Reopen dialog on error so user can try again
      onOpenChange(true);
    },
  });

  const handleUserSelect = useCallback(
    (user: User) => {
      createConversationMutation.mutate(user.id);
    },
    [createConversationMutation],
  );

  const getDisplayName = (user: User): string => {
    if (isNonEmptyString(user.full_name)) {
      return user.full_name;
    }
    if (isNonEmptyString(user.username)) {
      return user.username;
    }
    return 'Unknown User';
  };

  const getAvatarFallback = (user: User): string => {
    const source =
      (isNonEmptyString(user.username) && user.username) ||
      (isNonEmptyString(user.full_name) && user.full_name);

    return source ? source.charAt(0).toUpperCase() : 'U';
  };

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setSearchQuery('');
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a Conversation</DialogTitle>
          <DialogDescription>
            Search for users to start a new direct message conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search users by username or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />

          <div className="max-h-64 overflow-y-auto space-y-1">
            {isLoading && searchQuery.trim() !== '' && (
              <div className="flex items-center justify-center py-4">
                <div className="text-sm text-muted-foreground">
                  Searching...
                </div>
              </div>
            )}

            {!isLoading && searchQuery.trim() !== '' && users.length === 0 && (
              <div className="flex items-center justify-center py-4">
                <div className="text-sm text-muted-foreground">
                  No users found
                </div>
              </div>
            )}

            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleUserSelect(user)}
                disabled={createConversationMutation.isPending}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                  {isValidUrl(user.avatar_url) ? (
                    <Image
                      src={user.avatar_url}
                      alt={getDisplayName(user)}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {getAvatarFallback(user)}
                    </div>
                  )}
                </div>

                <div className="flex-1 text-left">
                  <div className="font-medium">{getDisplayName(user)}</div>
                  {isNonEmptyString(user.username) &&
                    user.username !== getDisplayName(user) && (
                      <div className="text-sm text-muted-foreground">
                        @{user.username}
                      </div>
                    )}
                </div>

                {createConversationMutation.isPending && (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
              </button>
            ))}
          </div>

          {searchQuery.trim() === '' && (
            <div className="text-center py-8 text-muted-foreground">
              <svg
                className="w-8 h-8 mx-auto mb-2 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="text-sm">Start typing to search for users</p>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
