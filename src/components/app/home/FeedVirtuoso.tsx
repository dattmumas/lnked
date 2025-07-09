import React from 'react';
import { Virtuoso } from 'react-virtuoso';

import { PostCardWrapper } from './PostCardWrapper';

import type { PostFeedInteractions } from '@/hooks/home/usePostFeedInteractions';
import type { FeedItem } from '@/types/home/types';

function renderPostRow(
  index: number,
  item: FeedItem,
  interactions: PostFeedInteractions,
): React.JSX.Element {
  return (
    <PostCardWrapper
      key={item.id}
      item={item}
      interactions={interactions}
      index={index}
    />
  );
}

interface FeedVirtuosoProps {
  items: FeedItem[];
  interactions: PostFeedInteractions;
  loadMore: () => void;
  hasMore: boolean;
  /** If true (default) virtuoso listens to window scroll instead of its own container */
  windowScroll?: boolean;
}

/**
 * Virtualized list wrapper around PostCardWrapper using react-virtuoso.
 *   • Automatically calls `loadMore` when the list scroller reaches the end.
 *   • Keeps overscan small for snappy mobile scrolling.
 */
export function FeedVirtuoso({
  items,
  interactions,
  loadMore,
  hasMore,
  windowScroll = true,
}: FeedVirtuosoProps): React.JSX.Element {
  return (
    <div className={windowScroll ? '' : 'no-scrollbar h-full overflow-y-auto'}>
      <Virtuoso
        data={items}
        itemContent={(index, item) => {
          return renderPostRow(index, item, interactions);
        }}
        style={windowScroll ? undefined : { height: '100%' }}
        useWindowScroll={windowScroll}
        overscan={100}
        // Prefetch when the user is within the last 5 items
        rangeChanged={(range) => {
          if (hasMore && range.endIndex >= items.length - 5) {
            void loadMore();
          }
        }}
      />
    </div>
  );
}
