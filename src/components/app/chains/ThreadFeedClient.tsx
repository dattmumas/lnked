'use client';

import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { Virtuoso } from 'react-virtuoso';

import { loadOlder } from '@/app/actions/threadActions';
import { useRealtimeChain } from '@/hooks/chains/useRealtimeChain';

import ChainCardRenderer from './ChainCardRenderer';
import ChainComposer from './ChainComposer';

import type { UserProfile } from './ChainComposer';
import type { ChainWithAuthor } from '@/lib/data-access/schemas/chain.schema';
import type { Database } from '@/lib/database.types';

interface ThreadFeedClientProps {
  rootId: string;
  initial: ChainWithAuthor[]; // newest → oldest array
  currentUserId: string;
  profile: UserProfile | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createItemRenderer(
  uid: string,
): (_index: number, item: ChainWithAuthor) => ReactElement {
  const Renderer = (_index: number, item: ChainWithAuthor): ReactElement => (
    <ChainCardRenderer item={item} currentUserId={uid} />
  );
  Renderer.displayName = 'ChainItemRenderer';
  return Renderer;
}

export default function ThreadFeedClient({
  rootId,
  initial,
  currentUserId,
  profile,
}: ThreadFeedClientProps): React.ReactElement {
  const [items, setItems] = useState<ChainWithAuthor[]>(initial);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const oldestTimestamp = useMemo(
    () => items[items.length - 1]?.created_at,
    [items],
  );

  // Merge realtime deltas (new replies) at the top if not dup.
  const handleDelta = useCallback(
    (row: Database['public']['Tables']['chains']['Row']): void => {
      const item = row as unknown as ChainWithAuthor;
      setItems((prev) => {
        if (prev.some((c) => c.id === item.id)) return prev;
        return [item, ...prev];
      });
    },
    [],
  );

  useRealtimeChain(rootId, handleDelta);

  const loadOlderBatch = useCallback(async (): Promise<void> => {
    if (isLoadingOlder || !oldestTimestamp) return;
    setIsLoadingOlder(true);
    try {
      const older = await loadOlder(rootId, oldestTimestamp);
      if (older.length > 0) {
        setItems((prev) => [...prev, ...older.map((o) => o)]);
      }
    } finally {
      setIsLoadingOlder(false);
    }
  }, [rootId, oldestTimestamp, isLoadingOlder]);

  const handleCreated = useCallback((row: ChainWithAuthor): void => {
    setItems((prev) => [row, ...prev]);
  }, []);

  // Stable item renderer generated once per user id
  const itemContent = useMemo(
    () => createItemRenderer(currentUserId),
    [currentUserId],
  );

  return (
    <div className="flex flex-col h-full">
      <Virtuoso<ChainWithAuthor>
        style={{ height: '100%', width: '100%' }}
        data={items}
        endReached={loadOlderBatch}
        itemContent={itemContent}
      />
      <div className="border-t border-border bg-background">
        <ChainComposer
          user={{ id: currentUserId }}
          profile={profile}
          onCreated={handleCreated}
        />
      </div>
    </div>
  );
}
