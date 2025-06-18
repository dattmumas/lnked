'use client';

import { useEffect, useState } from 'react';

import { useCollectiveMemberships } from '@/hooks/posts/useCollectiveMemberships';
import { useUser } from '@/hooks/useUser';

import CollectiveSwitcher from './collective-switcher';
import { ConversationPanel } from './conversation-panel';
import { Sidebar } from './sidebar';


interface ChatInterfaceProps {
  userId: string;
}

type Channel = {
  id: string;
  title: string | null;
  isAnnouncement?: boolean | null;
  type: string;
};

export default function ChatInterface({ userId }: ChatInterfaceProps) {
  const { user } = useUser();
  const { data: memberships = [], isLoading: loadingMemberships } =
    useCollectiveMemberships(true);

  const [activeCollectiveId, setActiveCollectiveId] = useState<string | null>(
    null,
  );
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);

  // Pick the first collective membership as default once loaded
  useEffect((): void => {
    if (!activeCollectiveId && memberships.length > 0) {
      setActiveCollectiveId(memberships[0].id);
    }
  }, [memberships, activeCollectiveId]);

  // reset channel when collective switches
  useEffect((): void => {
    setActiveChannel(null);
  }, [activeCollectiveId]);

  // Auto-select first channel for collective if none active
  useEffect((): void => {
    if (!activeCollectiveId || activeChannel) return;
    (async () => {
      try {
        const res = await fetch(
          `/api/collectives/${activeCollectiveId}/channels?limit=1`,
          { next: { revalidate: 30 } },
        );
        if (!res.ok) return;
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          setActiveChannel({
            id: list[0].id,
            title: list[0].title,
            type: list[0].type,
          });
        }
      } catch (err: unknown) {
        console.error(err);
      }
    })();
  }, [activeCollectiveId, activeChannel]);

  if (loadingMemberships && memberships.length === 0 && !activeChannel) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  const collectiveList = memberships.map((m) => ({ id: m.id, name: m.name }));

  return (
    <div className="flex w-full h-full">
      <CollectiveSwitcher
        collectives={collectiveList}
        activeCollectiveId={activeCollectiveId}
        onSelectCollective={setActiveCollectiveId}
      />

      <Sidebar
        collectiveId={activeCollectiveId}
        collectives={collectiveList}
        selectedChannelId={activeChannel?.id}
        onSelectChannel={(ch: { id: string; title: string | null }) =>
          setActiveChannel(ch as Channel)
        }
        onSelectCollective={setActiveCollectiveId}
      />

      <div className="flex flex-1 flex-col overflow-y-hidden bg-background">
        {activeChannel ? (
          <>
            <div className="h-16 px-4 flex items-center justify-between border-b border-border/40">
              <h2 className="text-lg font-semibold">
                {activeChannel.type === 'direct' ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    {activeChannel.title}
                  </span>
                ) : activeChannel.type === 'group' ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    {activeChannel.title}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="text-muted-foreground">#</span>
                    {activeChannel.title}
                  </span>
                )}
              </h2>
            </div>
            <ConversationPanel
              channelId={activeChannel.id}
              className="flex-1 overflow-hidden"
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            Select a channel from the sidebar to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
