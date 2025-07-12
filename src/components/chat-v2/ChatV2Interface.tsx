'use client';

import { useQueryClient, InfiniteData } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Menu,
  X,
  Users,
  Maximize2,
  Minimize2,
  MessageSquare,
  Hash,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useConversationMessages } from '@/hooks/chat-v2/useConversationMessages';
import { useRealtimeChat } from '@/hooks/chat-v2/useRealtimeChat';
import { useTenantConversations } from '@/hooks/chat-v2/useTenantConversations';
import { useUser } from '@/hooks/useUser';
import {
  mergeMessageIntoCache,
  updateConversationLastMessage,
  type AnyConversationsCache,
} from '@/lib/chat-v2/cache-utils';
import { cn } from '@/lib/utils';
import { useTenantStore } from '@/stores/tenant-store';

import { ConversationSidebar } from './ConversationSidebar';
import { MessageList } from './MessageList';

import type { ChatMessage, MessagesResponse } from '@/types/chat-v2';

// Dynamic imports for heavy components
const MessageComposer = dynamic(
  () =>
    import('./MessageComposer').then((mod) => ({
      default: mod.MessageComposer,
    })),
  {
    loading: () => (
      <div className="border-t border-border/50 bg-background/95 backdrop-blur-sm flex-shrink-0 p-4">
        <div className="animate-pulse bg-muted rounded-lg h-12" />
      </div>
    ),
    ssr: false,
  },
);

interface ChatV2InterfaceProps {
  initialConversationId?: string;
}

// Move ClosedSidebar outside of the main component to avoid nested component definition
const ClosedSidebar = ({
  onMouseEnter,
  onClick,
}: {
  onMouseEnter: () => void;
  onClick: () => void;
}) => (
  <button
    type="button"
    className="fixed left-0 top-0 h-full w-4 bg-transparent border-none p-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
    onMouseEnter={onMouseEnter}
    onClick={onClick}
    aria-label="Open sidebar"
  />
);

export function ChatV2Interface({
  initialConversationId,
}: ChatV2InterfaceProps): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { currentTenant } = useTenantStore();
  const { user } = useUser();

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Get active conversation ID from URL or props
  const activeConversationId = useMemo(() => {
    return searchParams.get('c') || initialConversationId || null;
  }, [searchParams, initialConversationId]);

  // Default to collapsed on desktop, closed on mobile
  useEffect(() => {
    const checkMobile = (): void => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsSidebarOpen(false); // Always start closed/collapsed
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-close sidebar on mobile after conversation selection
  useEffect(() => {
    if (isMobile && activeConversationId) {
      setIsSidebarOpen(false);
    }
  }, [isMobile, activeConversationId]);

  // Sidebar width constants
  const SIDEBAR_WIDTH = 320; // 20rem
  const VISIBLE_STRIP = 4; // px left visible when closed
  const CLOSED_X = -(SIDEBAR_WIDTH - VISIBLE_STRIP); // -316px

  // Hover logic for desktop – open when pointer enters trigger or sidebar, close when leaves
  const handleSidebarMouseEnter = useCallback(() => {
    if (!isMobile) {
      setIsSidebarOpen(true);
    }
  }, [isMobile]);

  const handleSidebarMouseLeave = useCallback(() => {
    if (!isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  // Stable callback for handling realtime messages
  const handleNewRealtimeMessage = useCallback(
    (message: ChatMessage) => {
      console.log('🎯 [ChatV2Interface] Received realtime message:', {
        messageId: message.id,
        conversationId: message.conversation_id,
        senderId: message.sender_id,
        isForActiveConversation:
          message.conversation_id === activeConversationId,
      });

      if (!currentTenant?.id) {
        console.log('⏭️ [ChatV2Interface] Skipping - missing tenant context');
        return;
      }

      // Always update conversations cache (sidebar) regardless of active conversation
      queryClient.setQueryData(
        ['tenants', currentTenant.id, 'conversations'],
        (old: AnyConversationsCache) => {
          if (!message.conversation_id) return old;

          return updateConversationLastMessage(
            old,
            message.conversation_id,
            message,
            user?.id,
            message.conversation_id === activeConversationId,
          );
        },
      );

      // Only update messages cache if this is for the active conversation
      if (message.conversation_id === activeConversationId) {
        queryClient.setQueryData(
          ['conversations', activeConversationId, 'messages'],
          (old: InfiniteData<MessagesResponse> | undefined) => {
            const result = mergeMessageIntoCache(old, message);
            if (result.updated) {
              console.log(
                '✅ [ChatV2Interface] Messages cache updated successfully',
              );
            }
            return result.cache;
          },
        );
      }
    },
    [activeConversationId, currentTenant?.id, user?.id, queryClient],
  );

  // Data fetching
  const {
    data: conversationsData,
    isLoading: conversationsLoading,
    error: conversationsError,
  } = useTenantConversations(currentTenant?.id ?? null);

  const {
    data: messagesData,
    isLoading: messagesLoading,
    error: messagesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConversationMessages(activeConversationId);

  // Realtime chat functionality with stable callback
  const { isConnected, broadcastMessage, sendTypingIndicator, presence } =
    useRealtimeChat({
      conversationId: activeConversationId,
      enabled: Boolean(activeConversationId),
      onNewMessage: handleNewRealtimeMessage,
    });

  // Find current conversation
  const currentConversation = useMemo(() => {
    return conversationsData?.conversations?.find(
      (conv) => conv.id === activeConversationId,
    );
  }, [conversationsData?.conversations, activeConversationId]);

  // Event handlers
  const handleSidebarToggle = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const handleFullscreenToggle = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      const params = new URLSearchParams(searchParams);
      params.set('c', conversationId);
      router.push(`/chat?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="flex h-full bg-background">
      {/* Mobile overlay for sidebar, used when it's a full-screen drawer */}
      {isMobile && isSidebarOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleSidebarToggle}
        />
      )}

      {/* Sidebar - animates width on desktop, slides on mobile */}
      <motion.div
        className={cn(
          'flex-shrink-0 bg-muted/50 border-r border-border/50 flex flex-col',
          isMobile
            ? 'fixed top-0 bottom-0 left-0 z-50 h-full'
            : 'relative h-full',
        )}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        animate={{
          width: isSidebarOpen ? '20rem' : isMobile ? '20rem' : '4rem',
          x: isMobile ? (isSidebarOpen ? '0%' : '-100%') : '0%',
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {/* Sidebar content is now passed `isExpanded` */}
        <ConversationSidebar
          conversations={conversationsData?.conversations ?? []}
          currentConversationId={activeConversationId ?? ''}
          isLoading={conversationsLoading}
          error={conversationsError}
          onSelectConversation={handleSelectConversation}
          isExpanded={isSidebarOpen}
        />
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 bg-background/95 backdrop-blur-sm px-4 py-3 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSidebarToggle}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 h-8 w-8 p-0"
            >
              {isSidebarOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>

            {/* Current conversation info */}
            {currentConversation && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  {currentConversation.type === 'direct' ? (
                    <MessageSquare className="h-4 w-4 text-primary" />
                  ) : currentConversation.type === 'channel' ? (
                    <Hash className="h-4 w-4 text-primary" />
                  ) : (
                    <Users className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    {currentConversation.title || 'Untitled'}
                  </h3>
                  {currentConversation.participant_count && (
                    <p className="text-xs text-muted-foreground">
                      {currentConversation.participant_count} member
                      {currentConversation.participant_count !== 1 ? 's' : ''}
                      {Object.keys(presence).length} online
                      {currentConversation.type === 'direct' &&
                        ' • Direct Message'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFullscreenToggle}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/50 h-8 w-8 p-0"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-h-0 max-h-full overflow-hidden bg-gradient-to-b from-background to-muted/20">
          {activeConversationId ? (
            <MessageList
              messagesData={messagesData}
              isLoading={messagesLoading}
              error={messagesError}
              fetchNextPage={fetchNextPage}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              activeConversationId={activeConversationId}
              presence={presence}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center max-w-sm mx-auto p-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <MessageSquare className="h-10 w-10 text-primary/70" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  Welcome to Chat
                </h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  {conversationsData?.conversations?.length === 0
                    ? 'No conversations yet. Start a new conversation to begin chatting with your team.'
                    : 'Select a conversation from the sidebar to start chatting'}
                </p>
                {!isSidebarOpen && (
                  <Button
                    variant="outline"
                    onClick={handleSidebarToggle}
                    className="gap-2"
                  >
                    <Users className="h-4 w-4" />
                    View Conversations
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        {activeConversationId && (
          <MessageComposer
            conversationId={activeConversationId}
            tenantId={currentTenant?.id ?? ''}
            onMessageSent={broadcastMessage}
            onTypingChange={sendTypingIndicator}
          />
        )}
      </div>
    </div>
  );
}
