'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { ChannelSidebar } from './channel-sidebar';

interface SidebarProps {
  collectiveId: string;
  selectedChannelId?: string;
  onSelectChannel: (ch: { id: string; title: string | null }) => void;
  className?: string;
}

export function Sidebar({
  collectiveId,
  selectedChannelId,
  onSelectChannel,
  className,
}: SidebarProps) {
  const [search, setSearch] = useState('');

  // Placeholder DM list
  const dms: Array<{ id: string; title: string }> = [];

  return (
    <aside
      className={clsx(
        'flex h-full w-64 flex-col border-r border-border bg-muted/50',
        className,
      )}
    >
      {/* SearchBar */}
      <div className="p-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users or collectives…"
          className="w-full rounded border bg-background px-2 py-1 text-sm focus:outline-none"
        />
      </div>

      {/* DM List placeholder */}
      {dms.length > 0 && (
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
              onClick={() => onSelectChannel({ id: dm.id, title: dm.title })}
            >
              <span className="truncate">{dm.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Channels */}
      <div className="flex-1 overflow-y-auto">
        <ChannelSidebar
          collectiveId={collectiveId}
          selectedChannelId={selectedChannelId}
          onSelectChannel={onSelectChannel as any}
          className=""
        />
      </div>
    </aside>
  );
}
