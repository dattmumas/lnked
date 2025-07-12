import React from 'react';
import { Virtuoso } from 'react-virtuoso';

import { PostCardWrapper } from './PostCardWrapper';

import type { PostFeedInteractions } from '@/hooks/home/usePostFeedInteractions';
import type { FeedItem } from '@/types/home/types';

// Custom scroller component with hidden scrollbar
const CustomScroller = React.forwardRef<
  HTMLDivElement,
  React.HTMLProps<HTMLDivElement>
>(function CustomScroller(props, ref) {
  return (
    <div
      {...props}
      ref={ref}
      style={{
        ...props.style,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
      className="[&::-webkit-scrollbar]:hidden"
    />
  );
});

function renderPostRow(
  index: number,
  item: FeedItem,
  interactions: PostFeedInteractions,
): React.JSX.Element {
  return (
    <PostCardWrapper item={item} interactions={interactions} index={index} />
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
    <div className={windowScroll ? '' : 'h-full overflow-hidden'}>
      <Virtuoso
        data={items}
        itemContent={(index, item) => {
          return renderPostRow(index, item, interactions);
        }}
        computeItemKey={(_index, item) => item.id}
        style={
          windowScroll
            ? undefined
            : {
                height: '100%',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }
        }
        components={{
          Scroller: CustomScroller,
        }}
        useWindowScroll={windowScroll}
        overscan={100}
        endReached={() => {
          if (hasMore) void loadMore();
        }}
      />
    </div>
  );
}
