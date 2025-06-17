'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';

interface Channel {
  id: string;
  title: string | null;
  category?: string | null;
  isAnnouncement?: boolean | null;
  type?: string;
}

interface ChannelSidebarProps {
  collectiveId?: string | null;
  selectedChannelId?: string;
  onSelectChannel: (channel: Channel & { type: string }) => void;
  search?: string;
  className?: string;
}

async function fetchChannels(collectiveId: string): Promise<Channel[]> {
  const res = await fetch(
    `/api/collectives/${collectiveId}/channels?limit=100`,
    {
      next: { revalidate: 60 },
    },
  );
  if (!res.ok) {
    throw new Error('Failed to load channels');
  }
  return res.json();
}

export function ChannelSidebar({
  collectiveId,
  selectedChannelId,
  onSelectChannel,
  search = '',
  className,
}: ChannelSidebarProps) {
  if (!collectiveId) {
    return null;
  }

  const {
    data: channels = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['collective-channels', collectiveId],
    queryFn: () => fetchChannels(collectiveId),
  });

  const grouped = useMemo(() => {
    const lower = search.toLowerCase();
    const map = new Map<string, Channel[]>();
    for (const ch of search.trim()
      ? channels.filter((c) => c.title?.toLowerCase().includes(lower))
      : channels) {
      const key = ch.category ?? '';
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(ch);
    }
    return Array.from(map.entries());
  }, [channels]);

  if (isLoading) {
    return (
      <div className={clsx('p-4 text-sm text-muted-foreground', className)}>
        Loading channels…
      </div>
    );
  }

  if (error) {
    return (
      <div className={clsx('p-4 text-sm text-destructive', className)}>
        Failed to load channels
      </div>
    );
  }

  return (
    <nav
      className={clsx(
        'flex flex-col gap-1 overflow-y-auto border-r border-border bg-muted/40 p-2 text-sm',
        className,
      )}
    >
      {grouped.map(([category, items]) => (
        <div key={category ?? 'uncategorised'} className="mb-2">
          {category && (
            <div className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">
              {category}
            </div>
          )}
          {items.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() =>
                onSelectChannel({ ...ch, type: ch.type || 'channel' })
              }
              className={clsx(
                'group flex w-full items-center gap-1 rounded px-2 py-1 text-left hover:bg-accent hover:text-accent-foreground',
                selectedChannelId === ch.id &&
                  'bg-accent text-accent-foreground font-semibold',
              )}
            >
              <span className="truncate">{ch.title ?? 'Untitled'}</span>
              {ch.isAnnouncement && <span className="text-xs">📢</span>}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}
