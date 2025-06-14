'use client';

import { useState } from 'react';
import { useChat } from '@/lib/hooks/use-chat';
import { ConversationList } from './conversation-list';
import { ChatWindow } from './chat-window';
import { CreateConversationModal } from './create-conversation-modal';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Main chat interface component
 * Features responsive design with collapsible sidebar
 */

interface ChatInterfaceProps {
  className?: string;
  userId: string;
}

export function ChatInterface({ className, userId }: ChatInterfaceProps) {
  const chat = useChat();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleConversationSelect = (conversationId: string) => {
    chat.setActiveConversation(conversationId);

    // Close sidebar on mobile after selecting conversation
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleCreateConversation = async (data: {
    title?: string;
    type: 'direct' | 'group' | 'channel';
    description?: string;
    is_private?: boolean;
    participant_ids: string[];
  }) => {
    try {
      const conversation = await chat.createConversation(data);
      if (
        conversation &&
        typeof conversation === 'object' &&
        'id' in conversation &&
        typeof (conversation as { id: unknown }).id === 'string'
      ) {
        setShowCreateModal(false);
        // Auto-select the new conversation
        chat.setActiveConversation((conversation as { id: string }).id);
      }
    } catch (error) {
      // Error will be handled by the modal or useChat hook
      console.error('Failed to create conversation:', error);
    }
  };

  return (
    <div className={cn('flex h-full', className)}>
      {/* Sidebar */}
      <div
        className={cn(
          'flex flex-col border-r transition-all duration-300',
          sidebarOpen ? 'w-80' : 'w-0',
          'md:relative absolute inset-y-0 left-0 z-40 md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">Messages</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="h-8 w-8 p-0"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="h-8 w-8 p-0 md:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-hidden">
          <ConversationList
            conversations={chat.conversations}
            activeConversation={chat.activeConversation}
            onSelectConversation={handleConversationSelect}
            getUnreadCount={chat.getUnreadCount}
            isUserOnline={chat.isUserOnline}
            currentUserId={userId}
          />
        </div>

        {/* Error display */}
        {chat.error && (
          <div className="p-4 border-t">
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {chat.error}
              <Button
                variant="ghost"
                size="sm"
                onClick={chat.clearError}
                className="ml-2 h-auto p-0 text-xs underline"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="flex items-center p-3 border-b md:hidden bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="h-8 w-8 p-0 mr-3"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Chat</span>
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 min-h-0">
          {chat.activeConversation ? (
            <ChatWindow
              conversationId={chat.activeConversation}
              conversation={chat.conversations.find(
                (c) => c.id === chat.activeConversation,
              )}
              messages={chat.messages}
              typingUsers={chat.typingUsers}
              onSendMessage={chat.sendMessage}
              onStartTyping={chat.startTyping}
              onStopTyping={chat.stopTyping}
              onAddReaction={chat.addReaction}
              onRemoveReaction={chat.removeReaction}
              currentUserId={userId}
              isUserOnline={chat.isUserOnline}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground bg-muted/20">
              <div className="text-center p-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <MessageSquarePlus className="h-8 w-8 text-muted-foreground/70" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  Welcome to Chat
                </h3>
                <p className="text-sm mb-4 max-w-sm">
                  Select an existing conversation or start a new one to begin
                  messaging
                </p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  size="sm"
                  className="min-w-[140px]"
                >
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  New Conversation
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create conversation modal */}
      <CreateConversationModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreateConversation={handleCreateConversation}
        currentUserId={userId}
      />

      {/* Loading overlay */}
      {chat.isLoading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-50">
          <div className="flex items-center gap-2 bg-background p-4 rounded-lg shadow-lg">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            <span className="text-sm">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
}
