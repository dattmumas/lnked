'use client';

import { ChevronLeft, Sparkles, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useMemo,
  useState,
  type ReactElement,
  useEffect,
} from 'react';
import { Virtuoso } from 'react-virtuoso';

import { loadOlder, fetchChainsByIds } from '@/app/actions/threadActions';
import { Button } from '@/components/ui/button';
import { useChainReactions } from '@/hooks/chains/useChainReactions';
import { useRealtimeChain } from '@/hooks/chains/useRealtimeChain';

import ChainCardRenderer from './ChainCardRenderer';
import ChainComposer from './ChainComposer';

import type { ChainCardInteractions } from './ChainCard';
import type { UserProfile } from './ChainComposer';
import type { ChainWithAuthor } from '@/lib/data-access/schemas/chain.schema';

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
  onDelete?: (id: string) => void,
): (_index: number, item: ChainWithAuthor) => ReactElement {
  const Renderer = (_index: number, item: ChainWithAuthor): ReactElement => (
    <ChainCardRenderer
      item={item}
      currentUserId={uid}
      interactions={interactions}
      {...(onDelete && { onDelete })}
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
  const [liveBuffer, setLiveBuffer] = useState<ChainWithAuthor[]>([]);
  const [isLoadingNew, setIsLoadingNew] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | undefined>(undefined);
  const [replyContent, setReplyContent] = useState('');
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

  const handleDelete = useCallback(async (chainId: string) => {
    // Optimistically remove the chain from the UI
    setItems((prev) => prev.filter((item) => item.id !== chainId));

    try {
      const response = await fetch(`/api/chains/${chainId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // If the API call fails, revert the optimistic update (optional)
        // For now, we'll just log the error. A more robust implementation
        // would involve a toast notification and re-adding the item.
        console.error('Failed to delete chain');
      }
    } catch (error) {
      console.error('An error occurred while deleting the chain:', error);
    }
  }, []);

  const handleDelta = useCallback(
    (payload: unknown): void => {
      // In thread mode, payload is the full ChainRow
      if (isThread) {
        const newItem = payload as ChainWithAuthor;
        setItems((prev) => {
          const idx = prev.findIndex((c) => c.id === newItem.id);
          if (idx === -1) return [...prev, newItem];
          const next = [...prev];
          next[idx] = { ...next[idx], ...newItem };
          return next;
        });
        reactions.clearDelta(newItem.id);
      } else {
        // In timeline mode, payload is { event: 'new_chain', payload: { id: '...' } }
        const typedPayload = payload as { payload?: { id: string } };
        const newChainId = typedPayload.payload?.id;
        if (newChainId) {
          setLiveBuffer((prev) => {
            // Avoid adding duplicates
            if (prev.some((c) => c.id === newChainId)) return prev;
            // We just need a placeholder; the full data isn't needed for the button
            return [{ id: newChainId } as ChainWithAuthor, ...prev];
          });
        }
      }
    },
    [reactions, isThread],
  );

  // Subscribe to the correct real-time channel based on the view mode
  useRealtimeChain(
    isThread ? 'thread' : 'timeline',
    isThread ? rootId : null,
    handleDelta,
  );

  const showNewChains = useCallback(async () => {
    if (liveBuffer.length === 0 || isLoadingNew) return;

    setIsLoadingNew(true);
    try {
      const newChainIds = liveBuffer.map((c) => c.id);
      const newChains = await fetchChainsByIds(newChainIds);

      // Prepend the new, fully-loaded chains to the main feed
      setItems((prev) => [...newChains, ...prev]);
      setLiveBuffer([]);
    } catch (error) {
      console.error('Failed to fetch new chains:', error);
    } finally {
      setIsLoadingNew(false);
    }
  }, [liveBuffer, isLoadingNew]);

  const loadOlderBatch = useCallback(async (): Promise<void> => {
    if (isLoadingOlder || !oldestTimestamp) return;
    setIsLoadingOlder(true);
    try {
      if (!isThread) return; // loadOlder is only for thread pagination for now
      const older = await loadOlder(rootId, oldestTimestamp);
      if (older.length > 0) {
        const existingIds = new Set(items.map((p) => p.id));
        const deduped = older.filter((o) => !existingIds.has(o.id));
        setItems((prev) => [...deduped.reverse(), ...prev]);
      }
    } finally {
      setIsLoadingOlder(false);
    }
  }, [rootId, oldestTimestamp, isLoadingOlder, isThread, items]);

  const handleCreated = useCallback(
    (row: ChainWithAuthor): void => {
      setItems((prev) => (isThread ? [...prev, row] : [row, ...prev]));
      setReplyingTo(undefined);
      setReplyContent('');
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
      cancelReply: (): void => {
        setReplyingTo(undefined);
        setReplyContent('');
      },
      replyingTo,
      replyContent,
      setReplyContent,
      isPosting: false,
      submitReply: () => {},
      shareChain: () => {},
    } as ChainCardInteractions;
  }, [reactions, replyingTo, replyContent]);

  // Stable item renderer generated once per user id
  const itemContent = useMemo(
    () => createItemRenderer(currentUserId, interactionsFactory, handleDelete),
    [currentUserId, interactionsFactory, handleDelete],
  );

  return (
    <div className="flex flex-col h-full pt-4 bg-[radial-gradient(circle_at_top,hsl(var(--muted)/0.1),transparent_50%)]">
      {/* Floating Composer at the top */}
      <div className="px-3 pb-2 ">
        <ChainComposer
          user={{ id: currentUserId }}
          profile={profile}
          rootId={rootId}
          {...(replyingTo ? { parentId: replyingTo } : {})}
          onCreated={handleCreated}
        />
      </div>

      {/* "Show New" Button */}
      {liveBuffer.length > 0 && (
        <div className="px-3 py-2 border-b border-white/10">
          <Button
            variant="outline"
            className="w-full"
            onClick={showNewChains}
            disabled={isLoadingNew}
          >
            {isLoadingNew ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {isLoadingNew
              ? 'Loading...'
              : `Show ${liveBuffer.length} new chain${liveBuffer.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      )}

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
    </div>
  );
}
