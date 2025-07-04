'use client';

import React from 'react';

import ChainCard from './ChainCard';

import type { ChainWithAuthor } from '@/lib/data-access/schemas/chain.schema';

interface Props {
  item: ChainWithAuthor;
  currentUserId: string;
}

export default function ChainCardRenderer({
  item,
  currentUserId,
}: Props): React.ReactElement {
  return (
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
        link_preview: item.link_preview ?? null,
        stats: {
          likes: item.like_count,
          replies: item.reply_count,
          shares: 0,
        },
      }}
      currentUserId={currentUserId}
      interactions={{
        likedChains: new Set(),
        toggleLike: () => {},
        startReply: () => {},
        cancelReply: () => {},
        replyingTo: undefined,
        replyContent: '',
        setReplyContent: () => {},
        isPosting: false,
        submitReply: () => {},
        shareChain: () => {},
      }}
    />
  );
}
