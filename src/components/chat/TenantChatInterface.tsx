'use client';

import { useQueryClient } from '@tanstack/react-query';
import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';

import { CenteredSpinner } from '@/components/ui/CenteredSpinner';
import { useTenantConversations } from '@/hooks/chat/useTenantConversations';
import { useToast } from '@/hooks/useToast';
import { useUser } from '@/hooks/useUser';
import { selectAdapter } from '@/lib/chat/realtime-adapter';
import { useMarkAsRead } from '@/lib/hooks/chat/use-conversations';
import {
  useMessages,
  useSendMessage,
  messageKeys,
} from '@/lib/hooks/chat/use-messages';
import { useChatUIStore } from '@/lib/stores/chat-ui-store';
import { useTenant } from '@/providers/TenantProvider';

import { ChatPanel } from './chat-panel';
import { TenantChannelsSidebar } from './TenantChannelsSidebar';

import type { MessageWithSender } from '@/lib/chat/types';

type ActiveChannel = {
  id: string;
  title: string | null;
  type: string;
  tenant_id: string | null;
};

export default function TenantChatInterface(): React.JSX.Element {
  const { user } = useUser();
  const { toast } = useToast();
  const { currentTenant } = useTenant();
  const {
    data: allConversations = [],
    isLoading: conversationsLoading,
    error: conversationsError,
  } = useTenantConversations();

  // Derive and sort channels and direct messages from the single source
  const { channels, directMessages } = useMemo(() => {
    // Ensure allConversations is an array before spreading
    if (!Array.isArray(allConversations)) {
      return { channels: [], directMessages: [] };
    }

    const allSorted = [...allConversations].sort((a, b) => {
      const dateA = new Date(a.updated_at ?? 0).getTime();
      const dateB = new Date(b.updated_at ?? 0).getTime();
      return dateB - dateA; // Sort descending (most recent first)
    });

    const channels = allSorted.filter(
      (c) => c.type === 'channel' || c.type === 'group',
    );
    const directMessages = allSorted.filter((c) => c.type === 'direct');
    return { channels, directMessages };
  }, [allConversations]);

  const isLoading = conversationsLoading;
  const error = conversationsError;

  const [activeChannel, setActiveChannel] = useState<ActiveChannel | null>(
    null,
  );
  const [replyTarget, setReplyTarget] = useState<MessageWithSender | null>(
    null,
  );

  // Get the setter for the global store
  const setActiveConversation = useChatUIStore(
    (state) => state.setActiveConversation,
  );

  // Ref to track subscription state and prevent multiple subscriptions
  const subscriptionRef = useRef<{
    conversationId: string | null;
    unsubscribe: (() => void) | null;
    isSubscribing: boolean; // Track if subscription is in progress
  }>({ conversationId: null, unsubscribe: null, isSubscribing: false });

  // Get active conversation from the cached list
  const conversation = useMemo(
    () => allConversations.find((c) => c.id === activeChannel?.id),
    [allConversations, activeChannel?.id],
  );

  // Sync local active channel with the global store
  useEffect(() => {
    setActiveConversation(activeChannel?.id);
  }, [activeChannel, setActiveConversation]);

  // Chat data for active conversation
  const {
    messages,
    isLoading: messagesLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useMessages(activeChannel?.id || '');
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const queryClient = useQueryClient();

  // Get chat state for typing indicators
  const typingUsers = useChatUIStore((state) => state.typingUsers);

  // SINGLE REALTIME SUBSCRIPTION
  useEffect(() => {
    if (!activeChannel?.id) {
      // Clean up any existing subscription when no active channel
      if (subscriptionRef.current.unsubscribe) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = {
          conversationId: null,
          unsubscribe: null,
          isSubscribing: false,
        };
      }
      return;
    }

    // Prevent duplicate subscriptions to the same conversation
    if (
      subscriptionRef.current.conversationId === activeChannel.id ||
      subscriptionRef.current.isSubscribing
    ) {
      console.log(
        `🔄 Already subscribed/subscribing to ${activeChannel.id}, skipping`,
      );
      return;
    }

    // Clean up previous subscription if switching channels
    if (subscriptionRef.current.unsubscribe) {
      console.log(
        `🧹 Cleaning up previous subscription for ${subscriptionRef.current.conversationId}`,
      );
      subscriptionRef.current.unsubscribe();
    }

    const setupSubscription = async () => {
      try {
        console.log(`🎯 Setting up new subscription for ${activeChannel.id}`);

        subscriptionRef.current = {
          conversationId: activeChannel.id,
          unsubscribe: null,
          isSubscribing: true,
        };

        const adapter = selectAdapter('supabase');
        const unsub = await adapter.subscribe(activeChannel.id, {
          onMessage: (newMessage: unknown) => {
            const message = newMessage as MessageWithSender;
            queryClient.setQueryData(
              messageKeys.conversation(activeChannel.id),
              (
                oldData:
                  | { pages: MessageWithSender[][]; pageParams: unknown[] }
                  | undefined,
              ) => {
                if (!oldData) {
                  return { pages: [[message]], pageParams: [undefined] };
                }
                const newPages = [...oldData.pages];
                if (newPages[0]?.some((m) => m.id === message.id)) {
                  return oldData;
                }
                newPages[0] = [message, ...(newPages[0] || [])];
                return {
                  ...oldData,
                  pages: newPages,
                };
              },
            );
          },
        });

        // Store the subscription details
        subscriptionRef.current = {
          conversationId: activeChannel.id,
          unsubscribe: unsub,
          isSubscribing: false,
        };

        return unsub;
      } catch (error) {
        console.error('Failed to set up realtime subscription:', error);
        subscriptionRef.current = {
          conversationId: null,
          unsubscribe: null,
          isSubscribing: false,
        };
        return () => {};
      }
    };

    void setupSubscription();

    return () => {
      // Note: We don't clean up here to prevent race conditions during Fast Refresh
      // Cleanup happens when switching channels or component unmount
    };
  }, [activeChannel?.id, queryClient]);

  // Cleanup subscription on component unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current.unsubscribe) {
        console.log(
          `🧹 Component unmount: cleaning up subscription for ${subscriptionRef.current.conversationId}`,
        );
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = {
          conversationId: null,
          unsubscribe: null,
          isSubscribing: false,
        };
      }
    };
  }, []);

  // Mark conversation as read when viewing
  useEffect(() => {
    if (activeChannel?.id) {
      markAsRead.mutate(activeChannel.id);
    }
  }, [activeChannel?.id]);

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
      directMessages &&
      directMessages.length > 0
    ) {
      const firstConversation = directMessages[0];
      if (firstConversation) {
        setActiveChannel({
          id: firstConversation.id,
          title: firstConversation.title,
          type: firstConversation.type,
          tenant_id: null, // Direct messages don't have tenant_id
        });
        return;
      }
    }

    // For collective tenant, prefer channels
    if (!currentTenant?.is_personal && channels && channels.length > 0) {
      const firstChannel = channels[0];
      if (firstChannel) {
        setActiveChannel({
          id: firstChannel.id,
          title: firstChannel.title,
          type: firstChannel.type,
          tenant_id: firstChannel.tenant_id,
        });
      }
    }
  }, [currentTenant, directMessages, channels, activeChannel, isLoading]);

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

  // Show a loading spinner if the user is not yet available
  if (!user) {
    return <CenteredSpinner label="Loading user..." />;
  }

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
    <div className="flex flex-1 w-full h-full bg-background text-foreground min-h-0">
      <TenantChannelsSidebar
        selectedChannelId={activeChannel?.id || ''}
        onSelectChannel={handleChannelSelect}
        currentUserId={user.id}
      />
      <div className="flex flex-1 flex-col bg-background min-h-0">
        {activeChannel ? (
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
            className="flex-1 min-h-0"
          />
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
