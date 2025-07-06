'use client';

import { useEffect, useState } from 'react';

import { fetchInitialChains } from '@/app/actions/threadActions';

import ThreadFeedClient from './ThreadFeedClient';

import type { ChainWithAuthor } from '@/lib/data-access/schemas/chain.schema';

interface RightSidebarFeedProps {
  rootId?: string | undefined; // allow undefined
  user: { id: string; email?: string };
  profile: import('@/components/app/chains/ChainComposer').UserProfile | null;
}

export default function RightSidebarFeed({
  rootId,
  user,
  profile,
}: RightSidebarFeedProps): React.ReactElement {
  const [initial, setInitial] = useState<ChainWithAuthor[] | null>(null);

  useEffect(() => {
    let isActive = true;
    (async () => {
      const rows = await fetchInitialChains(rootId ?? null, 40);
      if (isActive) setInitial(rows);
    })();
    return () => {
      isActive = false;
    };
  }, [rootId]);

  if (initial === null) {
    return <div className="flex-1" />; // simple placeholder / spinner later
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-hidden">
        <ThreadFeedClient
          rootId={rootId ?? ''}
          initial={initial}
          currentUserId={user.id}
          profile={profile}
        />
      </div>
    </div>
  );
}
