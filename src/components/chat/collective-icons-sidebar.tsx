'use client';

import clsx from 'clsx';
import { Plus, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import { useState, useCallback, memo } from 'react';

// Constants to avoid magic numbers
const COLLECTIVE_NAME_ABBREVIATION_LENGTH = 2;

interface Collective {
  id: string;
  name: string;
  logo_url?: string | null;
  slug?: string;
}

interface CollectiveIconsSidebarProps {
  collectives: Collective[];
  activeCollectiveId: string | null;
  onSelectCollective: (id: string | null) => void;
  className?: string;
}

interface CollectiveIconProps {
  collective: Collective;
  isActive: boolean;
  isHovered: boolean;
  onSelect: (id: string) => void;
  onMouseEnter: (id: string) => void;
  onMouseLeave: () => void;
}

const CollectiveIcon = memo<CollectiveIconProps>(
  ({
    collective,
    isActive,
    isHovered,
    onSelect,
    onMouseEnter,
    onMouseLeave,
  }): React.JSX.Element => {
    const handleClick = useCallback((): void => {
      onSelect(collective.id);
    }, [onSelect, collective.id]);

    const handleMouseEnter = useCallback((): void => {
      onMouseEnter(collective.id);
    }, [onMouseEnter, collective.id]);

    return (
      <div className="relative group">
        <button
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={onMouseLeave}
          className={clsx(
            'relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl transition-all duration-200',
            isActive
              ? 'bg-primary text-primary-foreground rounded-xl'
              : 'bg-muted hover:bg-accent hover:rounded-xl text-foreground hover:text-accent-foreground',
          )}
          title={collective.name}
        >
          {typeof collective.logo_url === 'string' ? (
            <Image
              src={collective.logo_url}
              alt={collective.name}
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-semibold uppercase">
              {collective.name.slice(0, COLLECTIVE_NAME_ABBREVIATION_LENGTH)}
            </span>
          )}
        </button>

        {/* Active indicator */}
        {isActive && (
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
        )}

        {/* Tooltip */}
        {isHovered && (
          <div className="absolute left-16 top-1/2 -translate-y-1/2 z-50 ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg border whitespace-nowrap">
            {collective.name}
          </div>
        )}
      </div>
    );
  },
);

CollectiveIcon.displayName = 'CollectiveIcon';

export function CollectiveIconsSidebar({
  collectives,
  activeCollectiveId,
  onSelectCollective,
  className,
}: CollectiveIconsSidebarProps): React.JSX.Element {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Memoized handlers
  const handleSelectHome = useCallback((): void => {
    onSelectCollective(null);
  }, [onSelectCollective]);

  const handleMouseEnterHome = useCallback((): void => {
    setHoveredId('home');
  }, []);

  const handleMouseLeave = useCallback((): void => {
    setHoveredId(null);
  }, []);

  const handleSelectCollective = useCallback(
    (collectiveId: string): void => {
      onSelectCollective(collectiveId);
    },
    [onSelectCollective],
  );

  const handleMouseEnterCollective = useCallback(
    (collectiveId: string): void => {
      setHoveredId(collectiveId);
    },
    [],
  );

  const handleMouseEnterAdd = useCallback((): void => {
    setHoveredId('add');
  }, []);

  return (
    <aside
      className={clsx(
        'flex h-full w-16 flex-col items-center bg-background border-r border-border/40 gap-2 overflow-y-auto',
        className,
      )}
    >
      {/* DMs / Home button */}
      <div className="relative group mt-3">
        <button
          onClick={handleSelectHome}
          onMouseEnter={handleMouseEnterHome}
          onMouseLeave={handleMouseLeave}
          className={clsx(
            'relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200',
            activeCollectiveId === null
              ? 'bg-primary text-primary-foreground rounded-xl'
              : 'bg-muted hover:bg-accent hover:rounded-xl text-foreground hover:text-accent-foreground',
          )}
          title="Direct Messages"
        >
          <MessageSquare className="h-6 w-6" />
        </button>

        {/* Tooltip */}
        {hoveredId === 'home' && (
          <div className="absolute left-16 top-1/2 -translate-y-1/2 z-50 ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg border whitespace-nowrap">
            Direct Messages
          </div>
        )}
      </div>

      {/* Separator */}
      {collectives.length > 0 && <div className="w-8 h-px bg-border my-1" />}

      {/* Collective Icons */}
      {collectives.map((collective) => (
        <CollectiveIcon
          key={collective.id}
          collective={collective}
          isActive={collective.id === activeCollectiveId}
          isHovered={hoveredId === collective.id}
          onSelect={handleSelectCollective}
          onMouseEnter={handleMouseEnterCollective}
          onMouseLeave={handleMouseLeave}
        />
      ))}

      {/* Add server button */}
      <div className="relative group mt-2 mb-3">
        <button
          onMouseEnter={handleMouseEnterAdd}
          onMouseLeave={handleMouseLeave}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted hover:bg-accent hover:rounded-xl text-foreground hover:text-accent-foreground transition-all duration-200"
          title="Browse Collectives"
        >
          <Plus className="h-6 w-6" />
        </button>

        {/* Tooltip */}
        {hoveredId === 'add' && (
          <div className="absolute left-16 top-1/2 -translate-y-1/2 z-50 ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg border whitespace-nowrap">
            Browse Collectives
          </div>
        )}
      </div>
    </aside>
  );
}
