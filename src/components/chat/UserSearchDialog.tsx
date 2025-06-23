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
import { chatApiClient } from '@/lib/chat/api-client';

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

export function UserSearchDialog({
  open,
  onOpenChange,
  onConversationCreated,
}: UserSearchDialogProps): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, DEBOUNCE_MS);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useUserSearch(debouncedQuery, open);

  const createConversationMutation = useMutation({
    mutationFn: async (userId: string) => {
      return chatApiClient.createConversation({
        type: 'direct',
        participant_ids: [userId],
      });
    },
    onSuccess: (data) => {
      // Invalidate conversations to refresh the list
      void queryClient.invalidateQueries({
        queryKey: ['direct-conversations'],
      });

      // Close dialog and navigate to conversation
      onOpenChange(false);
      setSearchQuery('');

      if (onConversationCreated !== undefined) {
        onConversationCreated(data.id);
      }
    },
    onError: (error) => {
      console.error('Failed to create conversation:', error);
    },
  });

  const handleUserSelect = useCallback(
    (user: User) => {
      createConversationMutation.mutate(user.id);
    },
    [createConversationMutation],
  );

  const getDisplayName = (user: User): string => {
    if (user.full_name !== null && user.full_name.trim() !== '') {
      return user.full_name;
    }
    if (user.username !== null && user.username.trim() !== '') {
      return user.username;
    }
    return 'Unknown User';
  };

  const getAvatarFallback = (user: User): string => {
    if (user.username !== null && user.username.length > 0) {
      return user.username[0].toUpperCase();
    }
    if (user.full_name !== null && user.full_name.length > 0) {
      return user.full_name[0].toUpperCase();
    }
    return 'U';
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
                  {user.avatar_url !== null ? (
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
                  {user.username !== null &&
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
