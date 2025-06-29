'use client';

import { CenterFeed } from '@/components/app/home/CenterFeed';
import { FloatingCreateButton } from '@/components/app/home/FloatingCreateButton';
import { TenantProvider } from '@/providers/TenantProvider';
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

  // If we have server-provided tenant data, wrap with configured TenantProvider
  if (props.initialTenants && props.personalTenantId) {
    return (
      <TenantProvider initialTenantId={props.personalTenantId}>
        <HomeContent
          user={user}
          {...(props.initialFeedItems
            ? { initialFeedItems: props.initialFeedItems }
            : {})}
        />
      </TenantProvider>
    );
  }

  // Otherwise use default TenantProvider behavior
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
  return (
    <div className="relative flex h-full">
      {/* Center feed – scrollable */}
      <main className="flex-1 w-0 min-w-0 overflow-y-auto p-6 min-h-screen">
        {user && (
          <CenterFeedWrapper
            user={user}
            {...(initialFeedItems ? { initialFeedItems } : {})}
          />
        )}
      </main>

      {/* Floating action button (mobile only) */}
      <FloatingCreateButton />
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
