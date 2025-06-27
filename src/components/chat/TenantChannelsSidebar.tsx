'use client';

import {
  Plus,
  Search,
  Hash,
  MessageCircle,
  MoreHorizontal,
} from 'lucide-react';
import Image from 'next/image';
import React, { useState, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useCreateTenantChannel } from '@/hooks/chat/useCreateTenantChannel';
import { useTenantConversations } from '@/hooks/chat/useTenantConversations';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import { useUser } from '@/hooks/useUser';
import { useDeleteConversation } from '@/lib/hooks/chat/use-conversations';
import { cn } from '@/lib/utils/cn';
import { useTenant } from '@/providers/TenantProvider';

import { UserSearchDialog } from './UserSearchDialog';

import type { ConversationWithParticipants } from '@/lib/chat/types';

// Constants
const UNREAD_BADGE_MAX = 9;
const SEARCH_DEBOUNCE_MS = 300;

interface TenantChannelsSidebarProps {
  selectedChannelId?: string;
  onSelectChannel: (channel: {
    id: string;
    title: string | null;
    type: string;
    tenant_id?: string | null;
  }) => void;
  currentUserId: string;
}

export function TenantChannelsSidebar({
  selectedChannelId,
  onSelectChannel,
  currentUserId,
}: TenantChannelsSidebarProps): React.JSX.Element {
  const { currentTenant } = useTenant();
  const { data: allConversations, isLoading } = useTenantConversations();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, SEARCH_DEBOUNCE_MS);
  const { user } = useUser();

  // Derive and filter conversations based on search
  const { channels, directMessages } = useMemo(() => {
    if (!allConversations || !user) return { channels: [], directMessages: [] };

    const lowercasedFilter = debouncedSearchTerm.toLowerCase();
    const filtered = allConversations.filter((conv) => {
      const { title, otherParticipant } = getConversationDisplay(conv, user.id);
      return (
        title?.toLowerCase().includes(lowercasedFilter) ||
        otherParticipant?.full_name?.toLowerCase().includes(lowercasedFilter) ||
        otherParticipant?.username?.toLowerCase().includes(lowercasedFilter)
      );
    });

    const channels = filtered.filter(
      (c) => c.type === 'channel' || c.type === 'group',
    );
    const directMessages = filtered.filter((c) => c.type === 'direct');

    return { channels, directMessages };
  }, [allConversations, debouncedSearchTerm, user]);

  if (isLoading || !user) {
    return (
      <aside className="w-80 flex-shrink-0 bg-muted/50 p-4">
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
        <div className="mt-6 h-6 w-32 animate-pulse rounded-md bg-muted" />
        <div className="mt-4 space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-12 w-full animate-pulse rounded-md bg-muted"
            />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 flex-shrink-0 p-2 border-r border-border">
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background focus:bg-background/90"
          />
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-2">
        {currentTenant?.is_personal && (
          <ConversationSection
            title="Direct Messages"
            conversations={directMessages}
            selectedChannelId={selectedChannelId}
            onSelectChannel={onSelectChannel}
            isDM
            currentUserId={currentUserId}
          />
        )}
        {!currentTenant?.is_personal && (
          <ConversationSection
            title="Channels"
            conversations={channels}
            selectedChannelId={selectedChannelId}
            onSelectChannel={onSelectChannel}
            currentUserId={currentUserId}
          />
        )}
      </div>
    </aside>
  );
}

// Helper to derive display information for a conversation
const getConversationDisplay = (
  conversation: ConversationWithParticipants,
  currentUserId: string,
): {
  title: string | null;
  avatarUrl: string | null;
  otherParticipant?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    email?: string | null;
  } | null;
} => {
  if (conversation.type === 'direct') {
    const otherParticipant = conversation.participants.find(
      (p) => p.user_id !== currentUserId,
    )?.user;
    return {
      title: otherParticipant?.full_name ?? otherParticipant?.username ?? null,
      avatarUrl: otherParticipant?.avatar_url ?? null,
      ...(otherParticipant ? { otherParticipant } : {}),
    };
  }
  return {
    title: conversation.title,
    avatarUrl: null,
  };
};

interface ConversationSectionProps {
  title: string;
  conversations: ConversationWithParticipants[];
  selectedChannelId: string | undefined;
  onSelectChannel: (channel: {
    id: string;
    title: string | null;
    type: string;
    tenant_id?: string | null;
  }) => void;
  isDM?: boolean;
  currentUserId: string;
}

function ConversationSection({
  title,
  conversations,
  selectedChannelId,
  onSelectChannel,
  isDM = false,
  currentUserId,
}: ConversationSectionProps) {
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);

  const handleConversationCreated = (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (conversation) {
      onSelectChannel({
        id: conversation.id,
        title: conversation.title,
        type: conversation.type,
        tenant_id: conversation.tenant_id,
      });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between px-2 mb-2">
        <h2 className="text-xs font-bold uppercase text-muted-foreground">
          {title}
        </h2>
        {isDM ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsUserSearchOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <UserSearchDialog
              open={isUserSearchOpen}
              onOpenChange={setIsUserSearchOpen}
              onConversationCreated={handleConversationCreated}
            />
          </>
        ) : (
          <NewChannelDialog onChannelCreated={onSelectChannel}>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Plus className="h-4 w-4" />
            </Button>
          </NewChannelDialog>
        )}
      </div>
      <div className="space-y-1">
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isSelected={selectedChannelId === conversation.id}
            onSelect={() =>
              onSelectChannel({
                id: conversation.id,
                title: conversation.title,
                type: conversation.type,
                tenant_id: conversation.tenant_id,
              })
            }
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}

interface ConversationItemProps {
  conversation: ConversationWithParticipants;
  isSelected: boolean;
  onSelect: () => void;
  currentUserId: string;
}

function ConversationItem({
  conversation,
  isSelected,
  onSelect,
  currentUserId,
}: ConversationItemProps) {
  const { title, avatarUrl } = getConversationDisplay(
    conversation,
    currentUserId,
  );
  const unreadCount = conversation.unread_count ?? 0;
  const hasUnread = unreadCount > 0;

  return (
    <div
      className={cn(
        'group w-full flex items-center gap-3 rounded-md p-2 text-left text-sm transition-colors relative',
        isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/80',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-1 items-center gap-3 min-w-0"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={title || 'Avatar'}
            width={32}
            height={32}
            className="rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            {conversation.type === 'direct' ? (
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Hash className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        )}
        <span className="truncate font-semibold text-base">
          {title || 'Unnamed Conversation'}
        </span>
        {hasUnread && (
          <div className="w-5 h-5 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > UNREAD_BADGE_MAX
              ? `${UNREAD_BADGE_MAX}+`
              : unreadCount}
          </div>
        )}
      </button>

      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ItemActions conversation={conversation} />
      </div>
    </div>
  );
}

function ItemActions({
  conversation,
}: {
  conversation: ConversationWithParticipants;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const deleteConversation = useDeleteConversation();

  const handleDelete = () => {
    deleteConversation.mutate(conversation.id);
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onSelect={() => setIsDeleteDialogOpen(true)}
            className="text-red-600"
          >
            {conversation.type === 'direct' ? 'Delete' : 'Leave'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {conversation.type === 'direct'
                ? 'Delete Conversation?'
                : 'Leave Channel?'}
            </DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NewChannelDialog({
  children,
  onChannelCreated,
}: {
  children: React.ReactNode;
  onChannelCreated: (channel: {
    id: string;
    title: string | null;
    type: string;
    tenant_id?: string | null;
  }) => void;
}) {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const createChannel = useCreateTenantChannel();

  const handleCreate = async () => {
    if (!title.trim()) return;

    try {
      const newChannel = await createChannel.mutateAsync({
        title: title.trim(),
        type: 'channel',
      });
      toast(`Channel "${newChannel.title}" created successfully!`);
      onChannelCreated(newChannel);
      setTitle('');
      setIsOpen(false);
    } catch (error) {
      toast(
        `Failed to create channel: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new channel</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Enter channel name..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={createChannel.isPending}
          />
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={createChannel.isPending || !title.trim()}
          >
            {createChannel.isPending ? 'Creating...' : 'Create Channel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
