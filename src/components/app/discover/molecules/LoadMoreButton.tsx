import React from 'react';

export default function LoadMoreButton({
  nextCursor,
}: {
  nextCursor: string;
}): React.ReactElement {
  return (
    <a
      href={`/discover?cursor=${encodeURIComponent(nextCursor)}`}
      className="inline-flex items-center justify-center gap-1 text-sm font-medium text-accent hover:underline"
    >
      Load more <span aria-hidden="true">→</span>
    </a>
  );
}
