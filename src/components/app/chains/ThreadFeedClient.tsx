'use client';

import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useMemo,
  useState,
  type ReactElement,
  useEffect,
} from 'react';
import { Virtuoso } from 'react-virtuoso';

import { loadOlder } from '@/app/actions/threadActions';
import { useChainReactions } from '@/hooks/chains/useChainReactions';
import { useRealtimeChain } from '@/hooks/chains/useRealtimeChain';

import ChainCardRenderer from './ChainCardRenderer';
import ChainComposer from './ChainComposer';

import type { ChainCardInteractions } from './ChainCard';
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
  interactions: ChainCardInteractions,
): (_index: number, item: ChainWithAuthor) => ReactElement {
  const Renderer = (_index: number, item: ChainWithAuthor): ReactElement => (
    <ChainCardRenderer
      item={item}
      currentUserId={uid}
      interactions={interactions}
    />
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
  const isThread = rootId !== '';
  // Arrange replies below root in thread view only
  const initialSorted = isThread ? [...initial].reverse() : initial;
  const [items, setItems] = useState<ChainWithAuthor[]>(initialSorted);
  const [replyingTo, setReplyingTo] = useState<string | undefined>(undefined);
  const router = useRouter();
  // keep items in sync when rootId or initial data changes
  useEffect(() => {
    setItems(isThread ? [...initial].reverse() : initial);
  }, [initial, isThread]);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const oldestTimestamp = useMemo(() => {
    return isThread
      ? items[0]?.created_at // earliest in thread (for prepend)
      : items[items.length - 1]?.created_at; // latest currently loaded in timeline
  }, [items, isThread]);

  // Reaction state for current user
  const reactions = useChainReactions(currentUserId);

  // Merge realtime deltas (new replies) at the top if not dup.
  const handleDelta = useCallback(
    (row: Database['public']['Tables']['chains']['Row']): void => {
      const item = row as unknown as ChainWithAuthor;
      setItems((prev) => {
        const idx = prev.findIndex((c) => c.id === item.id);
        if (idx === -1) {
          // New insert
          return [item, ...prev];
        }
        // Update existing (immutably)
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...item };
        return copy;
      });
      reactions.clearDelta(item.id);
    },
    [reactions],
  );

  useRealtimeChain(rootId, handleDelta);

  const loadOlderBatch = useCallback(async (): Promise<void> => {
    if (isLoadingOlder || !oldestTimestamp) return;
    setIsLoadingOlder(true);
    try {
      if (!isThread) return; // loadOlder is only for thread pagination for now
      const older = await loadOlder(rootId, oldestTimestamp);
      if (older.length > 0) {
        const deduped = older.filter((o) => !items.find((p) => p.id === o.id));
        setItems((prev) => [...deduped.reverse(), ...prev]);
      }
    } finally {
      setIsLoadingOlder(false);
    }
  }, [rootId, oldestTimestamp, isLoadingOlder, isThread, items]);

  const handleCreated = useCallback(
    (row: ChainWithAuthor): void => {
      setItems((prev) => (isThread ? [...prev, row] : prev));
      setReplyingTo(undefined);
    },
    [isThread],
  );

  // interactions for ChainCards
  const interactionsFactory = useMemo(() => {
    return {
      likedChains: reactions.likedChains,
      dislikedChains: reactions.dislikedChains,
      toggleLike: reactions.toggleLike,
      toggleDislike: reactions.toggleDislike,
      getDeltas: reactions.getDeltas,
      startReply: (id: string): void => setReplyingTo(id),
      cancelReply: (): void => setReplyingTo(undefined),
      replyingTo,
      replyContent: '',
      setReplyContent: () => {},
      isPosting: false,
      submitReply: () => {},
      shareChain: () => {},
    } as ChainCardInteractions;
  }, [reactions, replyingTo]);

  // Stable item renderer generated once per user id
  const itemContent = useMemo(
    () => createItemRenderer(currentUserId, interactionsFactory),
    [currentUserId, interactionsFactory],
  );

  return (
    <div className="flex flex-col h-full">
      {rootId && (
        <button
          type="button"
          onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.delete('thread');
            router.push(`${url.pathname}${url.search}`);
          }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-accent px-3 py-1 my-1 self-start ml-6"
        >
          <ChevronLeft className="w-3 h-3" /> Timeline
        </button>
      )}
      <Virtuoso<ChainWithAuthor>
        style={{ height: '100%', width: '100%' }}
        data={items}
        endReached={loadOlderBatch}
        itemContent={itemContent}
      />
      <div className="bg-background">
        <ChainComposer
          user={{ id: currentUserId }}
          profile={profile}
          rootId={rootId}
          {...(replyingTo ? { parentId: replyingTo } : {})}
          onCreated={handleCreated}
        />
      </div>
    </div>
  );
}
