import React from 'react';

import { ChainRepository } from '@/lib/data-access/chain.repository';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import { UserProfile } from './ChainComposer';
import ThreadFeedClient from './ThreadFeedClient';

import type { ChainWithAuthor } from '@/lib/data-access/schemas/chain.schema';

interface RightSidebarFeedProps {
  rootId?: string; // if omitted shows latest roots timeline
  user: { id: string; email?: string };
  profile: UserProfile | null;
}

export default async function RightSidebarFeed({
  rootId,
  user,
  profile,
}: RightSidebarFeedProps): Promise<React.ReactElement> {
  const supabase = await createServerSupabaseClient();
  const repo = new ChainRepository(supabase);

  let initial: ChainWithAuthor[] = [];
  if (rootId) {
    // fetch specific thread
    initial = await repo.fetchThread(rootId, undefined, 40);
  } else {
    // fallback: fetch latest root chains (status active, no parent)
    initial = await repo.getChainsWithAuthors(40);
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-hidden">
        {/* client-side virtual list with internal composer */}
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
