'use client';

import { useRouter } from 'next/navigation';
import React, { useMemo } from 'react';

import { getLinkPreview } from '@/lib/utils/chain-helpers';

import ChainCard from './ChainCard';

import type { ChainCardInteractions } from './ChainCard';
import type { ChainWithAuthor } from '@/lib/data-access/schemas/chain.schema';

interface LinkPreview {
  url: string;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  site?: string | null;
}

interface Props {
  item: ChainWithAuthor;
  currentUserId: string;
  interactions?: ChainCardInteractions;
  onDelete?: (id: string) => void;
}

export default function ChainCardRenderer({
  item,
  currentUserId,
  interactions,
  onDelete,
}: Props): React.ReactElement {
  const router = useRouter();

  const handleOpen = (): void => {
    router.push(`?thread=${encodeURIComponent(item.thread_root)}`);
  };

  const dummyInteractions: ChainCardInteractions = useMemo(
    () => ({
      likedChains: new Set(),
      dislikedChains: new Set(),
      toggleLike: () => {},
      toggleDislike: () => {},
      getDeltas: () => ({ like: 0, dislike: 0 }),
      startReply: () => {},
      cancelReply: () => {},
      replyingTo: undefined,
      replyContent: '',
      setReplyContent: () => {},
      isPosting: false,
      submitReply: () => {},
      shareChain: () => {},
    }),
    [],
  );

  const linkPreview = useMemo(() => getLinkPreview(item), [item]);

  return (
    <div className="block w-full text-left">
      <ChainCard
        item={{
          id: item.id,
          author_id: item.author_id,
          user: {
            name: item.author?.full_name ?? item.author?.username ?? 'Unknown',
            username: item.author?.username ?? 'unknown',
            ...(item.author?.avatar_url
              ? { avatar_url: item.author.avatar_url }
              : {}),
          },
          content: item.content,
          timestamp: new Date(item.created_at).toLocaleString(),
          type: 'post',
          // Type assertion to narrow down the JSON type to LinkPreview
          link_preview: linkPreview as LinkPreview | null,
          stats: {
            likes: item.like_count,
            dislikes: item.dislike_count ?? 0,
            replies: item.reply_count,
            shares: 0,
          },
          meta: item.meta,
        }}
        currentUserId={currentUserId}
        onOpenThread={handleOpen}
        interactions={interactions ?? dummyInteractions}
        media={item.media as unknown as import('./ChainCard').MediaItem[]}
        {...(onDelete && { onDelete })}
      />
    </div>
  );
}
