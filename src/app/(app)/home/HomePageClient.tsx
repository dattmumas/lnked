'use client';

import { useSearchParams } from 'next/navigation';

import RightSidebarFeed from '@/components/app/chains/RightSidebarFeed';
import { CenterFeed } from '@/components/app/home/CenterFeed';
import { FloatingCreateButton } from '@/components/app/home/FloatingCreateButton';
import PostOverlayWithinFeed from '@/components/app/posts/overlay/PostOverlayWithinFeed';
import { useUser } from '@/providers/UserContext';
import { useTenantFeed } from '@/hooks/home/useTenantFeed';

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
  const postId = searchParams.get('post'); // Get postId from search params

  return (
    <div className="flex flex-col h-full">
      {/* Main Content */}
      <div className="relative flex flex-1 min-h-0">
        <main
          id="center-feed-scroll-container"
          className="flex-1 w-0 min-w-0 overflow-y-auto no-scrollbar"
        >
          {isChains ? (
            <RightSidebarFeed user={{ id: user?.id ?? '' }} profile={null} />
          ) : (
            <div className="max-w-4xl mx-auto px-6 py-6">
              {user && (
                <CenterFeedWrapper
                  user={user}
                  {...(initialFeedItems ? { initialFeedItems } : {})}
                />
              )}
            </div>
          )}
          {postId && (
            <PostOverlayWithinFeed
              postId={postId}
              onClose={() => history.back()}
            />
          )}
        </main>

        {/* Mobile-only floating create button */}
        {user && (
          <div className="md:hidden">
            <FloatingCreateButton />
          </div>
        )}
      </div>
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
