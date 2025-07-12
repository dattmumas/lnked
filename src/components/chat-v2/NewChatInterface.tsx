'use client';

import { AlertCircle } from 'lucide-react';
import { Suspense, useCallback } from 'react';

import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useConversationMessages } from '@/hooks/chat-v2/useConversationMessages';
import { useRealtimeChat } from '@/hooks/chat-v2/useRealtimeChat';
import { useTenantConversations } from '@/hooks/chat-v2/useTenantConversations';
import { useTenantStore } from '@/stores/tenant-store';
import { ChatConversation } from '@/types/chat-v2';

import { ConversationSidebar } from './ConversationSidebar';
import { MessageComposer } from './MessageComposer';
import { MessageList } from './MessageList';

interface NewChatInterfaceProps {
  conversationId: string;
  initialConversation?: ChatConversation;
}

export function NewChatInterface({
  conversationId,
  initialConversation,
}: NewChatInterfaceProps): React.JSX.Element {
  const { currentTenant, isLoading: tenantLoading } = useTenantStore();

  const {
    data: conversationsData,
    isLoading: conversationsLoading,
    error: conversationsError,
  } = useTenantConversations(currentTenant?.id ?? null, {
    enabled: Boolean(currentTenant?.id),
  });

  const {
    data: messagesData,
    isLoading: messagesLoading,
    error: messagesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConversationMessages(conversationId, {
    enabled: Boolean(conversationId),
  });

  // Set up realtime connection
  const { presence, isConnected, broadcastMessage, sendTypingIndicator } =
    useRealtimeChat({
      conversationId,
      enabled: Boolean(conversationId) && Boolean(currentTenant),
    });

  // Handle conversation selection
  const handleSelectConversation = useCallback((conversationId: string) => {
    // In a real app, this would navigate to the conversation
    // For now, we'll just log it
    console.log('Selected conversation:', conversationId);
  }, []);

  // Show loading state while tenant is being initialized
  if (tenantLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  // Show error if no tenant context
  if (!currentTenant) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-center text-muted-foreground">
          <AlertCircle className="h-5 w-5" />
          <span>No tenant context available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Conversation Sidebar */}
      <div className="w-80 border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {currentTenant.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {currentTenant.type === 'personal' ? 'Personal' : 'Collective'} Chat
          </p>
        </div>

        <Suspense
          fallback={<div className="p-4">Loading conversations...</div>}
        >
          <ConversationSidebar
            conversations={conversationsData?.conversations ?? []}
            currentConversationId={conversationId}
            isLoading={conversationsLoading}
            error={conversationsError}
            onSelectConversation={handleSelectConversation}
            isExpanded
          />
        </Suspense>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-border bg-card">
          <h3 className="font-medium text-foreground">
            {initialConversation?.title || 'Chat'}
          </h3>
          {initialConversation?.type && (
            <p className="text-sm text-muted-foreground capitalize">
              {initialConversation.type} conversation
            </p>
          )}
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-hidden">
          <Suspense fallback={<div className="p-4">Loading messages...</div>}>
            <MessageList
              messagesData={messagesData}
              isLoading={messagesLoading}
              error={messagesError}
              fetchNextPage={fetchNextPage}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              activeConversationId={conversationId}
              presence={presence}
            />
          </Suspense>
        </div>

        {/* Message Composer */}
        <div className="border-t border-border bg-card">
          <MessageComposer
            conversationId={conversationId}
            tenantId={currentTenant.id}
            onMessageSent={broadcastMessage}
            onTypingChange={sendTypingIndicator}
          />
        </div>
      </div>
    </div>
  );
}
