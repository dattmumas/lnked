'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { type ReactElement } from 'react';

interface Collective {
  id: string;
  name: string;
  logo_url?: string | null;
  slug?: string;
}

interface Channel {
  id: string;
  title: string | null;
  category?: string | null;
  isAnnouncement?: boolean | null;
  type?: string;
  created_at?: string;
}

interface DMConversation {
  id: string;
  last_message_at: string;
  user: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

interface CollectiveChannelsSidebarProps {
  collectiveId: string | null;
  collectives: Collective[];
  selectedChannelId?: string;
  onSelectChannel: (ch: {
    id: string;
    title: string | null;
    type: string;
  }) => void;
  className?: string;
}

export function CollectiveChannelsSidebar({
  collectiveId,
  collectives,
  selectedChannelId,
  onSelectChannel,
  className: _className,
}: CollectiveChannelsSidebarProps): ReactElement {
  const selectedCollective =
    collectiveId !== null
      ? collectives.find((c) => c.id === collectiveId)
      : null;

  // Fetch channels for the selected collective
  const { data: channels = [] } = useQuery({
    queryKey: ['collective-channels', collectiveId],
    queryFn: async (): Promise<Channel[]> => {
      if (collectiveId === null) return [];
      const res = await fetch(
        `/api/collectives/${collectiveId}/channels?limit=100`,
      );
      if (!res.ok) throw new Error('Failed to load channels');
      return res.json() as Promise<Channel[]>;
    },
    enabled: collectiveId !== null,
  });

  // Fetch direct conversations when no collective is selected
  const { data: dms = [] } = useQuery({
    queryKey: ['direct-conversations'],
    queryFn: async (): Promise<DMConversation[]> => {
      const res = await fetch('/api/chat/direct?limit=100');
      if (!res.ok) throw new Error('Failed to load DMs');
      return res.json() as Promise<DMConversation[]>;
    },
    enabled: collectiveId === null,
  });

  const handleChannelSelect = (channel: Channel): void => {
    onSelectChannel({
      id: channel.id,
      title: channel.title,
      type: channel.type ?? 'channel',
    });
  };

  const handleDMSelect = (dm: DMConversation): void => {
    const displayName = dm.user.full_name ?? dm.user.username ?? 'Unknown User';
    onSelectChannel({
      id: dm.id,
      title: displayName,
      type: 'direct',
    });
  };

  const getAvatarFallback = (user: {
    username: string | null;
    full_name: string | null;
  }): string => {
    if (user.username !== null && user.username.length > 0) {
      return user.username[0].toUpperCase();
    }
    if (user.full_name !== null && user.full_name.length > 0) {
      return user.full_name[0].toUpperCase();
    }
    return 'U';
  };

  const getDisplayName = (user: {
    full_name: string | null;
    username: string | null;
  }): string => {
    if (user.full_name !== null && user.full_name.trim().length > 0) {
      return user.full_name;
    }
    if (user.username !== null && user.username.trim().length > 0) {
      return user.username;
    }
    return 'Unknown User';
  };

  const getCollectiveFallback = (name: string): string => {
    return name.length > 0 ? name[0].toUpperCase() : 'C';
  };

  const handleChannelClick = (channel: Channel) => (): void => {
    handleChannelSelect(channel);
  };

  const handleDMClick = (dm: DMConversation) => (): void => {
    handleDMSelect(dm);
  };

  return (
    <div className="flex flex-col h-full w-64 bg-muted/20 border-r border-border/40">
      {/* Header */}
      <div className="p-4 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        {selectedCollective ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {selectedCollective.logo_url !== null &&
              selectedCollective.logo_url !== undefined ? (
                <Image
                  src={selectedCollective.logo_url}
                  alt={selectedCollective.name}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                  {getCollectiveFallback(selectedCollective.name)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg truncate">
                {selectedCollective.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                {channels.length} channel{channels.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
              <div className="w-full h-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg">Direct Messages</h2>
              <p className="text-xs text-muted-foreground">
                {dms.length} conversation{dms.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedCollective ? (
          <div className="p-3 space-y-1">
            {/* Text Channels */}
            <div className="mb-4">
              <div className="flex items-center justify-between px-2 py-1 mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Text Channels
                </h3>
                <button className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              {channels.length > 0 ? (
                <div className="space-y-0.5">
                  {channels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={handleChannelClick(channel)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                        selectedChannelId === channel.id
                          ? 'bg-muted text-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <span className="w-4 h-4 flex-shrink-0 text-muted-foreground">
                        {channel.isAnnouncement === true ? (
                          <svg fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <span className="font-bold">#</span>
                        )}
                      </span>
                      <span className="truncate">
                        {channel.title ?? 'Unnamed Channel'}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-2 py-8 text-center">
                  <div className="text-muted-foreground mb-2">
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
                        d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m10 0v10a2 2 0 01-2 2H9a2 2 0 01-2-2V8m10 0H7"
                      />
                    </svg>
                    <p className="text-sm">No channels yet</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Direct Messages */
          <div className="p-3 space-y-1">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Direct Messages
              </h3>
              <button className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {dms.length > 0 ? (
              <div className="space-y-0.5">
                {dms.map((dm) => (
                  <button
                    key={dm.id}
                    onClick={handleDMClick(dm)}
                    className={`w-full flex items-center gap-3 px-2 py-2 rounded text-sm transition-colors ${
                      selectedChannelId === dm.id
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
                      {dm.user.avatar_url !== null ? (
                        <Image
                          src={dm.user.avatar_url}
                          alt={getDisplayName(dm.user)}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-semibold text-xs">
                          {getAvatarFallback(dm.user)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="truncate font-medium">
                        {getDisplayName(dm.user)}
                      </p>
                      {dm.last_message_at.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                          {new Date(dm.last_message_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-2 py-8 text-center">
                <div className="text-muted-foreground mb-2">
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
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <p className="text-sm">No conversations yet</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
