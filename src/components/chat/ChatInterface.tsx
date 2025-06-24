/* eslint-disable import/order */
'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';

import { useCollectiveMemberships } from '@/hooks/posts/useCollectiveMemberships';
import { useFirstChannel } from '@/hooks/useFirstChannel';
import { useToast } from '@/hooks/useToast';
import { useUser } from '@/hooks/useUser';
import { CHAT_HEADER_HEIGHT } from '@/lib/constants/chat';
import { useChatUIStore } from '@/lib/stores/chat-ui-store';

import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { CenteredSpinner } from '../ui/CenteredSpinner';
import { useDeleteConversation } from '@/lib/hooks/chat/use-conversations';

import { ChannelIcon } from './ChannelIcon';
import { ChatPanel } from './chat-panel';
import { CollectiveChannelsSidebar } from './collective-channels-sidebar';
import { CollectiveIconsSidebar } from './collective-icons-sidebar';

interface ChatInterfaceProps {
  userId: string;
}

type Channel = {
  id: string;
  title: string | null;
  type: string;
};

export default function ChatInterface({
  userId: _userId,
}: ChatInterfaceProps): React.ReactElement {
  const { user } = useUser();
  const { toast } = useToast();
  const { data: memberships = [], isLoading: loadingMemberships } =
    useCollectiveMemberships(true);

  const [activeCollectiveId, setActiveCollectiveId] = useState<string | null>(
    null,
  );
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);

  // Use custom hook for first channel fetching
  const { channel: firstChannel, error: firstChannelError } =
    useFirstChannel(activeCollectiveId);

  // Get chat state for typing indicators using new store
  const typingUsers = useChatUIStore((state) => state.typingUsers);

  // Handle first channel fetch errors with toast notifications
  useEffect(() => {
    if (firstChannelError !== null && firstChannelError !== undefined) {
      toast('Could not load channel list', { type: 'error' });
    }
  }, [firstChannelError, toast]);

  // Auto-select first channel for collective if none active
  useEffect(() => {
    if (
      activeCollectiveId === null ||
      activeCollectiveId === undefined ||
      activeChannel !== null ||
      firstChannel === null ||
      firstChannel === undefined
    )
      return;

    setActiveChannel(firstChannel);
  }, [activeCollectiveId, activeChannel, firstChannel]);

  // Reset channel when collective switches
  useEffect(() => {
    setActiveChannel(null);
  }, [activeCollectiveId]);

  // Memoize typing indicator text to prevent unnecessary re-renders
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

  // Memoize collective list transformation
  const collectiveList = useMemo(
    () =>
      memberships.map((m) => ({
        id: m.id,
        name: m.name,
        logo_url: m.logo_url,
        slug: m.slug,
      })),
    [memberships],
  );

  // Handler for channel selection with proper typing
  const handleChannelSelect = useCallback(
    (channelData: { id: string; title: string | null; type: string }): void => {
      const channel: Channel = {
        id: channelData.id,
        title: channelData.title,
        type: channelData.type,
      };
      setActiveChannel(channel);
    },
    [],
  );

  // Handler for collective selection
  const handleCollectiveSelect = useCallback(
    (collectiveId: string | null): void => {
      setActiveCollectiveId(collectiveId);
    },
    [],
  );

  const deleteConversation = useDeleteConversation();

  if (loadingMemberships && memberships.length === 0 && !activeChannel) {
    return <CenteredSpinner label="Loading chat interface..." />;
  }

  return (
    <div className="flex w-full h-full">
      {/* Left: Collective Icons Sidebar */}
      <CollectiveIconsSidebar
        collectives={collectiveList}
        activeCollectiveId={activeCollectiveId}
        onSelectCollective={handleCollectiveSelect}
      />

      {/* Center-Left: Channels Sidebar */}
      <CollectiveChannelsSidebar
        collectiveId={activeCollectiveId}
        collectives={collectiveList}
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
                  {typingIndicatorText !== null &&
                    typingIndicatorText !== undefined && (
                      <p
                        className="text-sm text-muted-foreground mt-1"
                        aria-live="polite"
                      >
                        {typingIndicatorText}
                      </p>
                    )}
                </div>

                {/* Channel type badge */}
                <span className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground">
                  {activeChannel.type}
                </span>
              </div>

              {/* Optional: Channel actions */}
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-2 rounded-md hover:bg-muted transition-colors"
                      aria-label="Channel options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
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
                      Delete chat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {/* Chat Panel */}
            <ChatPanel conversationId={activeChannel.id} className="flex-1" />
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
              <p className="text-lg font-medium mb-2">Collective Channels</p>
              <p className="text-sm text-muted-foreground">
                Choose a conversation from the sidebar to begin messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
