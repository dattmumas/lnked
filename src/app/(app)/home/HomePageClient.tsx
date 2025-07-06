'use client';

import { useSearchParams } from 'next/navigation';

import RightSidebarFeed from '@/components/app/chains/RightSidebarFeed';
import { CenterFeed } from '@/components/app/home/CenterFeed';
import { FloatingCreateButton } from '@/components/app/home/FloatingCreateButton';
import { useUser } from '@/providers/UserContext';

import type { FeedItem } from '@/types/home/types';
import type { User } from '@supabase/supabase-js';

interface HomePageClientProps {
  user?: User;
  initialFeedItems?: FeedItem[];
  initialTenants?: Array<{
    tenant_id: string;
    tenant_type: 'personal' | 'collective';
    tenant_name: string;
    tenant_slug: string;
    user_role: 'owner' | 'admin' | 'editor' | 'member';
    is_personal: boolean;
    member_count: number;
    is_public: boolean;
  }>;
  personalTenantId?: string | null;
}

export default function HomePageClient(
  props: HomePageClientProps = {},
): React.JSX.Element {
  const { user: contextUser } = useUser();

  // Use server-provided user or fall back to context
  const user = props.user || contextUser;

  // Always use the same HomeContent component
  // The TenantProvider is already provided at the root layout level
  return (
    <HomeContent
      user={user}
      {...(props.initialFeedItems
        ? { initialFeedItems: props.initialFeedItems }
        : {})}
    />
  );
}

interface HomeContentProps {
  user: User | null;
  initialFeedItems?: FeedItem[];
}

function HomeContent({
  user,
  initialFeedItems,
}: HomeContentProps): React.JSX.Element {
  const searchParams = useSearchParams();
  const isChains = searchParams.get('tab') === 'chains';
  return (
    <div className="relative flex h-full">
      {/* Center feed – scrollable */}
      <main className="flex-1 w-0 min-w-0 overflow-y-auto min-h-screen">
        {isChains ? (
          <RightSidebarFeed user={{ id: user?.id ?? '' }} profile={null} />
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-6">
            {user && (
              <CenterFeedWrapper
                user={user}
                {...(initialFeedItems ? { initialFeedItems } : {})}
              />
            )}
          </div>
        )}
      </main>

      {/* Floating action button (mobile only) */}
      {!isChains && <FloatingCreateButton />}
    </div>
  );
}

interface CenterFeedWrapperProps {
  user: User;
  initialFeedItems?: FeedItem[];
}

// Wrapper to handle initial data passing to CenterFeed
function CenterFeedWrapper({
  user,
  initialFeedItems,
}: CenterFeedWrapperProps): React.JSX.Element {
  // Pass initial feed items to CenterFeed
  return (
    <CenterFeed
      user={user}
      {...(initialFeedItems ? { initialFeedItems } : {})}
    />
  );
}
