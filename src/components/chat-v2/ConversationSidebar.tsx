'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquare,
  Users,
  Hash,
  AlertCircle,
  Plus,
  Search,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useTenantStore } from '@/stores/tenant-store';
import { ChatConversation } from '@/types/chat-v2';

// Lazy load the UserSearchDialog since it's only used when creating conversations
const UserSearchDialog = dynamic(
  () =>
    import('./UserSearchDialog').then((mod) => ({
      default: mod.UserSearchDialog,
    })),
  {
    loading: () => null, // No loading state needed for dialog
    ssr: false,
  },
);

// Lazy load the ChannelCreationDialog for collective tenants
const ChannelCreationDialog = dynamic(
  () =>
    import('./ChannelCreationDialog').then((mod) => ({
      default: mod.ChannelCreationDialog,
    })),
  {
    loading: () => null, // No loading state needed for dialog
    ssr: false,
  },
);

interface ConversationSidebarProps {
  conversations: ChatConversation[];
  currentConversationId: string;
  isLoading: boolean;
  error: Error | null;
  onSelectConversation: (conversationId: string) => void;
  isExpanded: boolean;
}

export function ConversationSidebar({
  conversations,
  currentConversationId,
  isLoading,
  error,
  onSelectConversation,
  isExpanded,
}: ConversationSidebarProps): React.JSX.Element {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);
  const [isChannelCreationOpen, setIsChannelCreationOpen] = useState(false);

  const { currentTenant } = useTenantStore();

  // Check if this is a personal tenant
  const isPersonalTenant = Boolean(
    currentTenant?.is_personal === true ||
      currentTenant?.tenant_type === 'personal' ||
      currentTenant?.type === 'personal',
  );

  // Filter conversations based on tenant type and search query
  const filteredConversations = useMemo(() => {
    // First filter by tenant type
    let typeFiltered = conversations;

    if (isPersonalTenant) {
      // Personal tenants: only show direct messages
      typeFiltered = conversations.filter((conv) => conv.type === 'direct');
    } else {
      // Collective tenants: only show channels and groups
      typeFiltered = conversations.filter(
        (conv) => conv.type === 'channel' || conv.type === 'group',
      );
    }

    // Then apply search filter
    if (!searchQuery.trim()) return typeFiltered;

    return typeFiltered.filter(
      (conv) =>
        conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.last_message?.content
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()),
    );
  }, [conversations, searchQuery, isPersonalTenant]);

  const handleConversationClick = (conversationId: string): void => {
    if (conversationId !== currentConversationId) {
      onSelectConversation(conversationId);
    }
  };

  const handleCreateConversation = (): void => {
    if (isPersonalTenant) {
      // For personal tenants, open user search dialog to create direct messages
      setIsUserSearchOpen(true);
    } else {
      // For collective tenants, open channel creation dialog
      setIsChannelCreationOpen(true);
    }
  };

  const handleConversationCreated = (conversationId: string): void => {
    // Navigate to the newly created conversation
    onSelectConversation(conversationId);
  };

  const handleChannelCreated = (channelId: string): void => {
    // Navigate to the newly created channel
    onSelectConversation(channelId);
  };

  const getConversationIcon = (
    conversation: ChatConversation,
  ): React.JSX.Element => {
    // For direct messages, use the other participant's avatar if available
    if (conversation.type === 'direct') {
      const initials = (conversation.title?.charAt(0) || '?').toUpperCase();

      return (
        <Avatar className="h-6 w-6">
          {conversation.display_avatar_url ? (
            <AvatarImage
              src={conversation.display_avatar_url}
              alt={conversation.title || 'Avatar'}
            />
          ) : (
            <AvatarFallback className="text-xs font-medium">
              {initials}
            </AvatarFallback>
          )}
        </Avatar>
      );
    }

    // Channel or group icons with better styling
    switch (conversation.type) {
      case 'channel':
        return (
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            <Hash className="h-3.5 w-3.5 text-primary" />
          </div>
        );
      case 'group':
        return (
          <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
            <Users className="h-3.5 w-3.5 text-blue-600" />
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        );
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    conversationId: string,
  ): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleConversationClick(conversationId);
    }
  };

  if (error) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Failed to load conversations</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search and Actions */}
      <div className="p-3 space-y-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          className={cn(
            'w-full',
            isExpanded ? 'justify-start' : 'justify-center p-2',
          )}
          onClick={handleCreateConversation}
        >
          <Plus className={cn('h-4 w-4', isExpanded && 'mr-2')} />
          {isExpanded &&
            (isPersonalTenant ? 'New Direct Message' : 'New Channel')}
        </Button>
      </div>

      {/* User Search Dialog for Personal Tenants */}
      <UserSearchDialog
        open={isUserSearchOpen}
        onOpenChange={setIsUserSearchOpen}
        onConversationCreated={handleConversationCreated}
      />

      {/* Channel Creation Dialog for Collective Tenants */}
      <ChannelCreationDialog
        open={isChannelCreationOpen}
        onOpenChange={setIsChannelCreationOpen}
        onChannelCreated={handleChannelCreated}
      />

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {Array.from(
              { length: 5 },
              (_, i) => `loading-conversation-${i}`,
            ).map((skeletonId) => (
              <div key={skeletonId} className="animate-pulse">
                <div className="flex items-center gap-3 p-3 rounded-lg">
                  <div className="w-4 h-4 bg-muted rounded" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-3/4 mb-1" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4">
            <div className="text-center text-muted-foreground">
              {searchQuery ? (
                <>
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations found</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </>
              ) : (
                <>
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {isPersonalTenant
                      ? 'No direct messages'
                      : 'No channels yet'}
                  </p>
                  <p className="text-xs mt-1">
                    {isPersonalTenant
                      ? 'Start a direct message to begin chatting'
                      : 'Create a channel to start collaborating'}
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredConversations.map((conversation, index) => {
              const isActive = conversation.id === currentConversationId;
              const lastMessageTime = conversation.last_message?.created_at
                ? formatDistanceToNow(
                    new Date(conversation.last_message.created_at),
                    {
                      addSuffix: true,
                    },
                  )
                : null;

              return (
                <button
                  key={conversation.id}
                  type="button"
                  className={cn(
                    'group w-full cursor-pointer rounded-lg p-3 text-left transition-all duration-200',
                    'hover:bg-accent/50 focus:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                    isActive && 'bg-accent text-accent-foreground shadow-sm',
                  )}
                  onClick={() => handleConversationClick(conversation.id)}
                  onKeyDown={(e) => handleKeyDown(e, conversation.id)}
                  aria-label={`Conversation: ${conversation.title || 'Untitled'}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className="flex items-start w-full gap-3">
                    {/* Icon / Avatar */}
                    <div
                      className={cn(
                        'mt-0.5 transition-colors duration-200 flex items-center justify-center',
                        isActive
                          ? 'text-accent-foreground'
                          : 'text-muted-foreground group-hover:text-foreground',
                      )}
                    >
                      {getConversationIcon(conversation)}
                    </div>

                    {/* Only show text when sidebar is expanded */}
                    {isExpanded && (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4
                            className={cn(
                              'font-medium text-sm truncate transition-colors duration-200',
                              isActive
                                ? 'text-accent-foreground'
                                : 'text-foreground',
                            )}
                          >
                            {conversation.title || 'Untitled'}
                          </h4>
                          {conversation.unread_count !== undefined &&
                            conversation.unread_count > 0 && (
                              <Badge
                                variant="destructive"
                                className="text-xs px-1.5 py-0.5 ml-2 animate-pulse"
                              >
                                {conversation.unread_count > 99
                                  ? '99+'
                                  : conversation.unread_count}
                              </Badge>
                            )}
                        </div>

                        {conversation.last_message && (
                          <p
                            className={cn(
                              'text-xs truncate transition-colors duration-200',
                              isActive
                                ? 'text-accent-foreground/70'
                                : 'text-muted-foreground',
                            )}
                          >
                            {conversation.last_message.content}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-1">
                          {lastMessageTime && (
                            <span
                              className={cn(
                                'text-xs transition-colors duration-200',
                                isActive
                                  ? 'text-accent-foreground/60'
                                  : 'text-muted-foreground',
                              )}
                            >
                              {lastMessageTime}
                            </span>
                          )}
                          {conversation.participant_count !== undefined &&
                            conversation.participant_count > 2 && (
                              <span
                                className={cn(
                                  'text-xs transition-colors duration-200',
                                  isActive
                                    ? 'text-accent-foreground/60'
                                    : 'text-muted-foreground',
                                )}
                              >
                                {conversation.participant_count} members
                              </span>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface ConversationItemProps {
  conversation: ChatConversation;
  isSelected: boolean;
  onSelect: (id: string) => void;
  isExpanded: boolean;
}

function ConversationItem({
  conversation,
  isSelected,
  onSelect,
  isExpanded,
}: ConversationItemProps) {
  const { title, last_message, type } = conversation;
  const last_message_at = last_message?.created_at;
  const displayName = title;
  const fallbackName = displayName?.charAt(0).toUpperCase() || '?';

  return (
    <button
      type="button"
      className={cn(
        'group w-full cursor-pointer rounded-lg p-2 text-left transition-all duration-200',
        isSelected ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-accent/50',
        'focus:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        !isExpanded && 'flex items-center justify-center',
      )}
      onClick={() => onSelect(conversation.id)}
      aria-label={`Conversation: ${displayName}`}
    >
      {isExpanded ? (
        <div className="flex items-center gap-3 w-full">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback>{fallbackName}</AvatarFallback>
          </Avatar>
          <h4
            className={cn(
              'font-medium text-sm truncate flex-1',
              isSelected ? 'text-foreground' : 'text-foreground/90',
            )}
          >
            {displayName}
          </h4>
          {last_message_at && (
            <span
              className={cn(
                'text-xs whitespace-nowrap',
                isSelected
                  ? 'text-muted-foreground'
                  : 'text-muted-foreground/80',
              )}
            >
              {formatDistanceToNow(new Date(last_message_at), {
                addSuffix: true,
              })}
            </span>
          )}
        </div>
      ) : (
        <Avatar className="h-8 w-8 mx-auto">
          <AvatarFallback>{fallbackName}</AvatarFallback>
        </Avatar>
      )}
    </button>
  );
}
