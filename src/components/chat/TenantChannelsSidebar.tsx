'use client';

import { Plus, Hash, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import React, { useState, useMemo, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useDirectMessages } from '@/hooks/chat/useDirectMessages';
import {
  useCreateTenantChannel,
  useTenantChannels,
} from '@/hooks/chat/useTenantChannels';
import { useDebounce } from '@/hooks/useDebounce';
import { useUser } from '@/hooks/useUser';
import { useTenant } from '@/providers/TenantProvider';

import { UserSearchDialog } from './UserSearchDialog';

import type { TenantChannel } from '@/hooks/chat/useTenantChannels';
import type { ConversationWithParticipants } from '@/lib/chat/types';

interface TenantChannelsSidebarProps {
  selectedChannelId?: string;
  onSelectChannel: (channel: {
    id: string;
    title: string | null;
    type: string;
    tenant_id?: string | null;
  }) => void;
}

export function TenantChannelsSidebar({
  selectedChannelId,
  onSelectChannel,
}: TenantChannelsSidebarProps): React.JSX.Element {
  const { currentTenant } = useTenant();
  const { user } = useUser();
  const { data: channels = [], isLoading: channelsLoading } =
    useTenantChannels();
  const { data: conversations = [], isLoading: dmsLoading } =
    useDirectMessages();

  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [newChannelTitle, setNewChannelTitle] = useState('');

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const createChannel = useCreateTenantChannel();

  // Filter channels based on search term
  const filteredChannels = useMemo(() => {
    if (debouncedSearchTerm.trim().length === 0) return channels;

    const searchLower = debouncedSearchTerm.toLowerCase();
    return channels.filter(
      (channel) =>
        channel.title !== null &&
        channel.title !== undefined &&
        channel.title.toLowerCase().includes(searchLower),
    );
  }, [channels, debouncedSearchTerm]);

  // Filter conversations based on search term
  const filteredConversations = useMemo(() => {
    if (debouncedSearchTerm.trim().length === 0) return conversations;

    const searchLower = debouncedSearchTerm.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.title !== null &&
        conv.title !== undefined &&
        conv.title.toLowerCase().includes(searchLower),
    );
  }, [conversations, debouncedSearchTerm]);

  const handleChannelClick = useCallback(
    (channel: TenantChannel) => () => {
      onSelectChannel({
        id: channel.id,
        title: channel.title,
        type: channel.type,
        tenant_id: channel.tenant_id,
      });
    },
    [onSelectChannel],
  );

  const handleConversationClick = useCallback(
    (conversation: ConversationWithParticipants) => () => {
      onSelectChannel({
        id: conversation.id,
        title: conversation.title,
        type: conversation.type,
        tenant_id: null, // Direct messages don't have tenant_id
      });
    },
    [onSelectChannel],
  );

  const handleCreateChannel = useCallback(async () => {
    if (newChannelTitle.trim().length === 0) return;

    try {
      await createChannel.mutateAsync({
        title: newChannelTitle.trim(),
        type: 'channel',
        isPrivate: false,
      });
      setNewChannelTitle('');
      setCreateChannelOpen(false);
    } catch (error) {
      console.error('Failed to create channel:', error);
    }
  }, [newChannelTitle, createChannel]);

  const handleConversationCreated = useCallback(
    (conversationId: string) => {
      // Find the newly created conversation and select it
      const newConversation = conversations.find(
        (conv) => conv.id === conversationId,
      );
      if (newConversation !== undefined) {
        onSelectChannel({
          id: newConversation.id,
          title: newConversation.title,
          type: newConversation.type,
          tenant_id: null,
        });
      }
    },
    [conversations, onSelectChannel],
  );

  const getDisplayName = (user: {
    full_name: string | null;
    username: string | null;
  }): string => {
    if (user.full_name !== null && user.full_name !== undefined) {
      return user.full_name;
    }
    if (user.username !== null && user.username !== undefined) {
      return user.username;
    }
    return 'Unknown User';
  };

  const getAvatarFallback = (user: {
    username: string | null;
    full_name: string | null;
  }): string => {
    const name =
      user.full_name !== null && user.full_name !== undefined
        ? user.full_name
        : user.username !== null && user.username !== undefined
          ? user.username
          : 'U';
    return name.charAt(0).toUpperCase();
  };

  // Get the other participant in a direct conversation
  const getOtherParticipant = (conversation: ConversationWithParticipants) => {
    if (conversation.type !== 'direct' || !conversation.participants || !user) {
      return null;
    }

    // Find the participant who is not the current user
    const otherParticipant = conversation.participants.find(
      (p) => p.user_id !== user.id && p.user,
    );

    return otherParticipant?.user || null;
  };

  // Get display information for a conversation
  const getConversationDisplay = (
    conversation: ConversationWithParticipants,
  ) => {
    if (conversation.type === 'direct') {
      const otherParticipant = getOtherParticipant(conversation);

      if (otherParticipant) {
        return {
          title: getDisplayName(otherParticipant),
          avatar_url: otherParticipant.avatar_url,
          fallback: getAvatarFallback(otherParticipant),
        };
      }
    }

    // For group/channel conversations allow empty titles (can display placeholder)
    return {
      title:
        conversation.title !== null && conversation.title.trim() !== ''
          ? conversation.title
          : 'Untitled',
      avatar_url: null,
      fallback:
        conversation.title && conversation.title.trim() !== ''
          ? conversation.title.charAt(0).toUpperCase()
          : 'G',
    };
  };

  // Return a loading or placeholder state if the tenant is not yet available
  if (!currentTenant) {
    return (
      <div className="flex flex-col h-full w-64 bg-muted/20 border-r border-border/40 p-4">
        <p className="text-sm text-muted-foreground">Loading tenant...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-64 bg-muted/20 border-r border-border/40">
      {/* Header & search */}
      <div className="p-4 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        {/* Hide avatar/name/count block for personal tenants */}
        {!currentTenant.is_personal && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                {currentTenant.tenant_name.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg truncate">
                {currentTenant.tenant_name}
              </h2>
              <p className="text-xs text-muted-foreground">
                {`${filteredChannels.length} channel${filteredChannels.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        )}

        {/* Search Input (always visible) */}
        <Input
          type="text"
          placeholder={
            currentTenant.is_personal
              ? 'Search conversations...'
              : 'Search channels...'
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {currentTenant.is_personal ? (
          /* Direct Messages */
          <div className="p-3 space-y-1">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Direct Messages
              </h3>
              <button
                onClick={() => setUserSearchOpen(true)}
                className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors"
                title="Start new conversation"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {filteredConversations.length > 0 ? (
              <div className="space-y-0.5">
                {filteredConversations.map((conversation) => {
                  const displayInfo = getConversationDisplay(conversation);
                  return (
                    <button
                      key={conversation.id}
                      onClick={handleConversationClick(conversation)}
                      className={`w-full flex items-center gap-3 px-2 py-2 rounded text-sm transition-colors ${
                        selectedChannelId === conversation.id
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
                        {displayInfo.avatar_url ? (
                          <Image
                            src={displayInfo.avatar_url}
                            alt={displayInfo.title}
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-semibold text-xs">
                            {conversation.type === 'direct' ? (
                              displayInfo.fallback
                            ) : (
                              <MessageCircle className="w-4 h-4" />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="truncate font-medium">
                          {displayInfo.title}
                        </p>
                        {conversation.created_at !== null &&
                          conversation.created_at !== undefined && (
                            <p className="text-xs text-muted-foreground truncate">
                              {new Date(
                                conversation.created_at,
                              ).toLocaleDateString()}
                            </p>
                          )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-2 py-8 text-center">
                <div className="text-muted-foreground mb-2">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {searchTerm.length > 0
                      ? 'No conversations found'
                      : 'No conversations yet'}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Channels */
          <div className="p-3 space-y-1">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Channels
              </h3>
              <Dialog
                open={createChannelOpen}
                onOpenChange={setCreateChannelOpen}
              >
                <DialogTrigger asChild>
                  <button
                    className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors"
                    title="Create new channel"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Channel</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Channel name"
                      value={newChannelTitle}
                      onChange={(e) => setNewChannelTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          void handleCreateChannel();
                        }
                      }}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setCreateChannelOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => void handleCreateChannel()}
                        disabled={
                          !newChannelTitle.trim() || createChannel.isPending
                        }
                      >
                        {createChannel.isPending ? 'Creating...' : 'Create'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {filteredChannels.length > 0 ? (
              <div className="space-y-0.5">
                {filteredChannels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={handleChannelClick(channel)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                      selectedChannelId === channel.id
                        ? 'bg-muted text-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Hash className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">
                      {channel.title !== null && channel.title !== undefined
                        ? channel.title
                        : 'Unnamed Channel'}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-2 py-8 text-center">
                <div className="text-muted-foreground mb-2">
                  <Hash className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {searchTerm.length > 0
                      ? 'No channels found'
                      : 'No channels yet'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Search Dialog */}
      <UserSearchDialog
        open={userSearchOpen}
        onOpenChange={setUserSearchOpen}
        onConversationCreated={handleConversationCreated}
      />
    </div>
  );
}
