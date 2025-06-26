'use client';

import { MoreVertical } from 'lucide-react';
import React, { useCallback, useEffect, useState, useMemo } from 'react';

import { CenteredSpinner } from '@/components/ui/CenteredSpinner';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useDirectMessages } from '@/hooks/chat/useDirectMessages';
import { useTenantChannels } from '@/hooks/chat/useTenantChannels';
import { useToast } from '@/hooks/useToast';
import { useUser } from '@/hooks/useUser';
import { selectAdapter } from '@/lib/chat/realtime-adapter';
import { CHAT_HEADER_HEIGHT } from '@/lib/constants/chat';
import { useDeleteConversation ,
  useConversation,
  useMarkAsRead,
} from '@/lib/hooks/chat/use-conversations';
import { useMessages, useSendMessage } from '@/lib/hooks/chat/use-messages';
import { useChatUIStore } from '@/lib/stores/chat-ui-store';
import { useTenant } from '@/providers/TenantProvider';

import { ChannelIcon } from './ChannelIcon';
import { ChatPanel } from './chat-panel';
import { TenantChannelsSidebar } from './TenantChannelsSidebar';

import type { MessageWithSender } from '@/lib/chat/types';


interface TenantChatInterfaceProps {
  userId: string;
}

type ActiveChannel = {
  id: string;
  title: string | null;
  type: string;
  tenant_id: string | null;
};

export default function TenantChatInterface({
  userId: _userId,
}: TenantChatInterfaceProps): React.JSX.Element {
  const { user } = useUser();
  const { toast } = useToast();
  const { currentTenant } = useTenant();
  const {
    data: channels = [],
    isLoading: channelsLoading,
    error: channelsError,
  } = useTenantChannels();
  const {
    data: conversations = [],
    isLoading: dmsLoading,
    error: dmsError,
  } = useDirectMessages();

  const isLoading = channelsLoading || dmsLoading;
  const error = channelsError || dmsError;

  const [activeChannel, setActiveChannel] = useState<ActiveChannel | null>(
    null,
  );
  const [replyTarget, setReplyTarget] = useState<MessageWithSender | null>(
    null,
  );

  // Chat data for active conversation
  const conversation = useConversation(activeChannel?.id || '');
  const {
    messages,
    isLoading: messagesLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useMessages(activeChannel?.id || '');
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();

  // Get chat state for typing indicators
  const typingUsers = useChatUIStore((state) => state.typingUsers);

  // SINGLE REALTIME SUBSCRIPTION - The only place in the entire app
  useEffect(() => {
    if (!activeChannel?.id) return;

    const setupSubscription = async () => {
      try {
        const adapter = selectAdapter('supabase');
        const unsub = await adapter.subscribe(activeChannel.id, {});
        return unsub;
      } catch (error) {
        console.error('Failed to set up realtime subscription:', error);
        return () => {};
      }
    };

    let unsubscribe: (() => void) | null = null;
    setupSubscription().then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) {
        void unsubscribe();
      }
    };
  }, [activeChannel?.id]);

  // Mark conversation as read when viewing
  useEffect(() => {
    if (activeChannel?.id && conversation) {
      markAsRead.mutate(activeChannel.id);
    }
  }, [activeChannel?.id, conversation, markAsRead]);

  // Message handlers
  const handleSendMessage = useCallback(
    async (content: string, replyToId?: string) => {
      if (!activeChannel?.id) return;

      await sendMessage.mutateAsync({
        content,
        message_type: 'text',
        ...(replyToId ? { reply_to_id: replyToId } : {}),
      });

      // Clear reply on success
      setReplyTarget(null);
    },
    [activeChannel?.id, sendMessage],
  );

  const handleReplyCancel = useCallback(() => {
    setReplyTarget(null);
  }, []);

  // Handle errors with toast notifications
  useEffect(() => {
    if (error) {
      toast('Could not load conversations', { type: 'error' });
    }
  }, [error, toast]);

  // Reset active channel when tenant changes
  useEffect(() => {
    setActiveChannel(null);
  }, [currentTenant?.tenant_id]);

  // Auto-select first available channel/conversation
  useEffect(() => {
    if (activeChannel || isLoading) return;

    // For personal tenant, prefer direct conversations
    if (
      currentTenant?.is_personal &&
      conversations &&
      conversations.length > 0
    ) {
      const firstConversation = conversations[0];
      setActiveChannel({
        id: firstConversation.id,
        title: firstConversation.title,
        type: firstConversation.type,
        tenant_id: null, // Direct messages don't have tenant_id
      });
      return;
    }

    // For collective tenant, prefer channels
    if (!currentTenant?.is_personal && channels && channels.length > 0) {
      const firstChannel = channels[0];
      setActiveChannel({
        id: firstChannel.id,
        title: firstChannel.title,
        type: firstChannel.type,
        tenant_id: firstChannel.tenant_id,
      });
    }
  }, [currentTenant, conversations, channels, activeChannel, isLoading]);

  // Memoize typing indicator text
  const typingIndicatorText = useMemo(() => {
    if (!activeChannel?.id) return null;

    const channelTypingUsers = typingUsers.get(activeChannel.id);
    if (!channelTypingUsers || channelTypingUsers.length === 0) return null;

    const filteredUsers = channelTypingUsers.filter(
      (u) => u.user_id !== user?.id,
    );
    if (filteredUsers.length === 0) return null;

    const userNames = filteredUsers
      .map((u) => u.username ?? 'Someone')
      .join(', ');

    return `${userNames} ${filteredUsers.length === 1 ? 'is' : 'are'} typing...`;
  }, [typingUsers, user?.id, activeChannel?.id]);

  // Handler for channel/conversation selection
  const handleChannelSelect = useCallback(
    (channelData: {
      id: string;
      title: string | null;
      type: string;
      tenant_id?: string | null;
    }): void => {
      const channel: ActiveChannel = {
        id: channelData.id,
        title: channelData.title,
        type: channelData.type,
        tenant_id: channelData.tenant_id || null,
      };
      setActiveChannel(channel);
    },
    [],
  );

  const deleteConversation = useDeleteConversation();

  // Track active channel changes for debugging purposes

  if (isLoading && !activeChannel) {
    return <CenteredSpinner label="Loading chat interface..." />;
  }

  if (!currentTenant) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">No Tenant Selected</p>
          <p className="text-sm text-muted-foreground">
            Please select a tenant to access chat features
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full">
      {/* Center-Left: Channels/Conversations Sidebar */}
      <TenantChannelsSidebar
        selectedChannelId={activeChannel?.id}
        onSelectChannel={handleChannelSelect}
      />

      {/* Right: Main Chat Area */}
      <div className="flex flex-1 flex-col bg-background min-h-0">
        {activeChannel ? (
          <>
            {/* Channel Header */}
            <header
              className={`${CHAT_HEADER_HEIGHT} px-4 flex items-center justify-between border-b border-border/40 bg-background/95 backdrop-blur-sm`}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold">
                    <span className="flex items-center gap-2">
                      <ChannelIcon type={activeChannel.type} />
                      {activeChannel.title}
                    </span>
                  </h2>

                  {/* Typing indicator */}
                  {typingIndicatorText && (
                    <p
                      className="text-sm text-muted-foreground mt-1"
                      aria-live="polite"
                    >
                      {typingIndicatorText}
                    </p>
                  )}
                </div>

                {/* Channel type and tenant info */}
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground">
                    {activeChannel.type}
                  </span>
                  {currentTenant.tenant_type === 'collective' && (
                    <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-blue-700 dark:text-blue-300">
                      {currentTenant.tenant_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Channel actions */}
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-2 rounded-md hover:bg-muted transition-colors"
                      aria-label="Channel options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={4}
                    className="p-1 bg-white dark:bg-gray-900 rounded-md border shadow-md"
                  >
                    <DropdownMenuItem
                      onSelect={() =>
                        deleteConversation.mutate(activeChannel.id)
                      }
                      className="text-red-600 focus:bg-red-50 dark:focus:bg-red-600/20"
                    >
                      {activeChannel.type === 'direct'
                        ? 'Delete conversation'
                        : 'Leave channel'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {/* Chat Panel */}
            <ChatPanel
              conversationId={activeChannel.id}
              messages={messages}
              isLoading={messagesLoading}
              hasNextPage={hasNextPage}
              fetchNextPage={fetchNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onSendMessage={handleSendMessage}
              replyTarget={replyTarget}
              onReplyCancel={handleReplyCancel}
              currentUserId={user?.id ?? ''}
              className="flex-1"
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-lg font-medium mb-2">
                {currentTenant?.tenant_type === 'personal'
                  ? 'Direct Messages'
                  : `${currentTenant?.tenant_name ?? 'Collective'} Channels`}
              </p>
              <p className="text-sm text-muted-foreground">
                {currentTenant?.tenant_type === 'personal'
                  ? 'Start a conversation with someone'
                  : 'Choose a channel from the sidebar to begin messaging'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
