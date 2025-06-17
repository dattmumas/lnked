'use client';

import clsx from 'clsx';

interface Collective {
  id: string;
  name: string;
}

interface Props {
  collectives: Collective[];
  activeCollectiveId: string | null;
  onSelectCollective: (id: string) => void;
}

export default function CollectiveSwitcher({
  collectives,
  activeCollectiveId,
  onSelectCollective,
}: Props) {
  // Hide entirely if user is only in one collective
  if (collectives.length <= 1) return null;

  return (
    <aside className="flex h-full w-14 flex-col items-center border-r border-border bg-background/80 py-2 gap-2">
      {collectives.map((col) => (
        <button
          key={col.id}
          onClick={() => onSelectCollective(col.id)}
          className={clsx(
            'relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-sm font-semibold uppercase transition-colors',
            col.id === activeCollectiveId
              ? 'bg-primary text-primary-foreground ring-2 ring-offset-2 ring-primary'
              : 'bg-muted hover:bg-accent/50 text-foreground',
          )}
          title={col.name}
        >
          {col.name.slice(0, 2)}
        </button>
      ))}
    </aside>
  );
}
