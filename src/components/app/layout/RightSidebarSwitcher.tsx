'use client';

import { useSearchParams } from 'next/navigation';
import { useDeferredValue } from 'react';

// app components
import RightSidebarFeed from '@/components/app/chains/RightSidebarFeed';

// types
import type { UserProfile } from '@/components/app/chains/ChainComposer';

interface Props {
  user: { id: string; email?: string };
  profile: UserProfile | null;
}

export default function RightSidebarSwitcher({
  user,
  profile,
}: Props): React.ReactElement {
  const params = useSearchParams();
  const threadRaw = params.get('thread');
  const deferredRaw = useDeferredValue(threadRaw);
  const rootIdParam = deferredRaw ? decodeURIComponent(deferredRaw) : null;
  return (
    <RightSidebarFeed
      rootId={rootIdParam ?? undefined}
      user={user}
      profile={profile}
    />
  );
}
