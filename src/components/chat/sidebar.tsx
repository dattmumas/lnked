'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ChannelSidebar } from './channel-sidebar';

interface SidebarProps {
  collectiveId: string | null;
  collectives: Array<{ id: string; name: string }>;
  selectedChannelId?: string;
  onSelectChannel: (ch: {
    id: string;
    title: string | null;
    type: string;
  }) => void;
  onSelectCollective: (id: string) => void;
  className?: string;
}

export function Sidebar({
  collectiveId,
  collectives,
  selectedChannelId,
  onSelectChannel,
  onSelectCollective,
  className,
}: SidebarProps) {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  // Fetch direct conversations
  const {
    data: dms = [],
    isLoading: loadingDms,
    error: dmError,
  } = useQuery({
    queryKey: ['direct-conversations'],
    queryFn: async (): Promise<
      Array<{
        id: string;
        last_message_at: string;
        user: {
          id: string;
          full_name: string | null;
          username: string | null;
          avatar_url: string | null;
        };
      }>
    > => {
      const res = await fetch('/api/chat/direct?limit=100', {
        next: { revalidate: 30 },
      });
      if (!res.ok) throw new Error('Failed to load DMs');
      return res.json();
    },
  });

  const { data: userMatches = [] } = useQuery({
    queryKey: ['user-search', search],
    queryFn: async () => {
      if (!search.trim()) return [];
      const res = await fetch(
        `/api/search/users?q=${encodeURIComponent(search)}&limit=8`,
      );
      if (!res.ok) throw new Error('search failed');
      return res.json();
    },
    enabled: search.trim().length > 0,
  });

  const startDM = async (userId: string) => {
    try {
      const resp = await fetch('/api/chat/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: userId }),
      });
      const { conversationId } = await resp.json();
      // invalidate/direct list
      await queryClient.invalidateQueries({
        queryKey: ['direct-conversations'],
      });
      onSelectChannel({ id: conversationId, title: '', type: 'direct' });
      setSearch('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <aside
      className={clsx(
        'flex h-full w-64 flex-col border-r border-border bg-muted/50',
        className,
      )}
    >
      {/* Collective Switcher moved to dedicated component */}

      {/* SearchBar */}
      <div className="p-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users or collectives…"
          className="w-full rounded border bg-background px-2 py-1 text-sm focus:outline-none"
        />
      </div>

      {/* User search suggestions */}
      {search.trim() && userMatches.length > 0 && (
        <div className="border-b border-border pb-1">
          {userMatches.map((u: any) => (
            <button
              key={u.id}
              className="block w-full px-3 py-1 text-left hover:bg-accent"
              onClick={() => startDM(u.id)}
            >
              {u.username ?? u.full_name}
            </button>
          ))}
        </div>
      )}

      {/* DM List */}
      {loadingDms ? (
        <div className="px-3 py-2 text-sm text-muted-foreground">
          Loading DMs…
        </div>
      ) : dmError ? (
        <div className="px-3 py-2 text-sm text-destructive">
          Failed to load DMs
        </div>
      ) : dms.length > 0 ? (
        <div className="mb-2">
          <div className="px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
            Direct Messages
          </div>
          {dms.map((dm) => (
            <button
              key={dm.id}
              type="button"
              className={clsx(
                'flex w-full items-center gap-2 px-3 py-1 text-left hover:bg-accent hover:text-accent-foreground',
                dm.id === selectedChannelId &&
                  'bg-accent text-accent-foreground font-semibold',
              )}
              onClick={() =>
                onSelectChannel({
                  id: dm.id,
                  title: dm.user.username ?? dm.user.full_name ?? 'DM',
                  type: 'direct',
                })
              }
            >
              <span className="truncate">
                {dm.user.username ?? dm.user.full_name ?? 'Unnamed'}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {/* Selected collective label */}
      {collectiveId && (
        <div className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground border-t border-border">
          {collectives.find((c) => c.id === collectiveId)?.name ?? ''}
        </div>
      )}

      {/* Channels */}
      <div className="flex-1 overflow-y-auto">
        {collectiveId && (
          <ChannelSidebar
            collectiveId={collectiveId}
            selectedChannelId={selectedChannelId}
            onSelectChannel={onSelectChannel as any}
            search={search}
            className=""
          />
        )}
      </div>
    </aside>
  );
}
