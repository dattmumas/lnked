'use client';

import React, { useState } from 'react';
import { useProfileContext } from '@/lib/hooks/profile';
import type {
  SocialSidebarProps,
  SocialFeedType,
} from '@/lib/hooks/profile/types';

/**
 * Social Sidebar Component - Right side of desktop layout (35% width)
 *
 * Features:
 * - Tabbed interface: Activity (default), Likes, Following
 * - Infinite scroll social feeds
 * - Responsive transformation to horizontal swipeable feed on tablet/mobile
 * - Real-time activity updates
 */
export function SocialSidebar({ className = '' }: SocialSidebarProps) {
  const [activeTab, setActiveTab] = useState<SocialFeedType>('activity');

  return (
    <aside
      className={`
      social-sidebar
      space-y-4
      h-fit
      
      /* Responsive transformations */
      max-lg:space-y-3
      
      ${className}
    `}
    >
      <div className="social-content bg-muted/30 rounded-lg p-4 space-y-4 max-lg:bg-transparent max-lg:p-0">
        {/* Tab Navigation */}
        <SocialTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Feed Content */}
        <div className="feed-content min-h-[400px]">
          {activeTab === 'activity' && <ActivityFeed />}
          {activeTab === 'likes' && <LikesFeed />}
          {activeTab === 'following' && <FollowingFeed />}
        </div>
      </div>
    </aside>
  );
}

/**
 * Social Tabs Component - Pill-style tab navigation
 */
function SocialTabs({
  activeTab,
  onTabChange,
  className = '',
}: {
  activeTab: SocialFeedType;
  onTabChange: (tab: SocialFeedType) => void;
  className?: string;
}) {
  const tabs: { key: SocialFeedType; label: string; count?: number }[] = [
    { key: 'activity', label: 'Activity' },
    { key: 'likes', label: 'Likes' },
    { key: 'following', label: 'Following' },
  ];

  return (
    <nav
      className={`
      social-tabs
      
      /* Desktop - Vertical pill tabs */
      flex 
      gap-2
      
      /* Tablet/Mobile - Horizontal scrollable */
      max-lg:overflow-x-auto
      max-lg:scrollbar-hide
      max-lg:pb-2
      
      ${className}
    `}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`
            tab-button
            px-3 
            py-2 
            rounded-full 
            text-sm 
            font-medium 
            transition-all
            whitespace-nowrap
            flex-shrink-0
            
            ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
            }
          `}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1 text-xs opacity-75">({tab.count})</span>
          )}
        </button>
      ))}
    </nav>
  );
}

/**
 * Activity Feed Component - Recent user activity
 */
function ActivityFeed() {
  const { profile } = useProfileContext();

  // Mock activity data for now
  const activities = [
    {
      id: '1',
      type: 'post_published',
      actor: { username: profile.username, avatarUrl: profile.avatarUrl },
      content: 'Published a new post: "Building Better UIs"',
      timestamp: '2 hours ago',
    },
    {
      id: '2',
      type: 'user_followed',
      actor: { username: 'john_doe', avatarUrl: null },
      content: 'Followed you',
      timestamp: '1 day ago',
    },
    {
      id: '3',
      type: 'post_liked',
      actor: { username: 'jane_smith', avatarUrl: null },
      content: 'Liked your post "Design Systems"',
      timestamp: '2 days ago',
    },
  ];

  return (
    <div className="activity-feed space-y-3">
      {activities.length === 0 ? (
        <EmptyFeedState
          icon="📈"
          title="No Activity Yet"
          description="Activity will appear here when you or others interact with your content."
        />
      ) : (
        <div className="activity-list space-y-3">
          {activities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}

          {/* Load More Button */}
          <LoadMoreButton onClick={() => console.log('Load more activity')} />
        </div>
      )}
    </div>
  );
}

/**
 * Likes Feed Component - Posts liked by user
 */
function LikesFeed() {
  return (
    <div className="likes-feed space-y-3">
      <EmptyFeedState
        icon="❤️"
        title="No Likes Yet"
        description="Posts you like will appear here."
      />
    </div>
  );
}

/**
 * Following Feed Component - Users being followed
 */
function FollowingFeed() {
  const { profile } = useProfileContext();

  // Mock following data
  const following = [
    {
      id: '1',
      username: 'alice_dev',
      fullName: 'Alice Johnson',
      avatarUrl: null,
      bio: 'Frontend developer passionate about React and TypeScript',
      followedAt: '2024-01-15',
    },
    {
      id: '2',
      username: 'bob_designer',
      fullName: 'Bob Smith',
      avatarUrl: null,
      bio: 'UI/UX Designer creating beautiful digital experiences',
      followedAt: '2024-01-10',
    },
  ];

  return (
    <div className="following-feed space-y-3">
      {following.length === 0 ? (
        <EmptyFeedState
          icon="👥"
          title="Not Following Anyone"
          description="Users you follow will appear here."
        />
      ) : (
        <div className="following-list space-y-3">
          {following.map((user) => (
            <UserConnectionItem key={user.id} user={user} />
          ))}

          <LoadMoreButton onClick={() => console.log('Load more following')} />
        </div>
      )}
    </div>
  );
}

/**
 * Activity Item Component - Individual activity feed item
 */
function ActivityItem({
  activity,
}: {
  activity: {
    id: string;
    type: string;
    actor: { username: string; avatarUrl: string | null };
    content: string;
    timestamp: string;
  };
}) {
  return (
    <div className="activity-item flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      {/* Avatar */}
      <div className="avatar flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          {activity.actor.avatarUrl ? (
            <img
              src={activity.actor.avatarUrl}
              alt={activity.actor.username}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-xs font-semibold text-muted-foreground">
              {activity.actor.username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="content flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="username font-medium text-sm text-foreground">
            @{activity.actor.username}
          </span>
          <span className="timestamp text-xs text-muted-foreground">
            {activity.timestamp}
          </span>
        </div>
        <p className="activity-text text-sm text-foreground leading-relaxed">
          {activity.content}
        </p>
      </div>
    </div>
  );
}

/**
 * User Connection Item Component - Following/follower display
 */
function UserConnectionItem({
  user,
}: {
  user: {
    id: string;
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    followedAt: string;
  };
}) {
  return (
    <div className="user-connection-item flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      {/* Avatar */}
      <div className="avatar flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.username}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-xs font-semibold text-muted-foreground">
              {user.username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* User Info */}
      <div className="user-info flex-1 min-w-0">
        <div className="identity">
          <h4 className="name font-medium text-sm text-foreground">
            {user.fullName || user.username}
          </h4>
          <p className="handle text-xs text-muted-foreground">
            @{user.username}
          </p>
        </div>
        {user.bio && (
          <p className="bio text-xs text-muted-foreground mt-1 line-clamp-2">
            {user.bio}
          </p>
        )}
      </div>

      {/* Follow Button */}
      <div className="actions flex-shrink-0">
        <button
          className="
          follow-btn 
          px-2 
          py-1 
          text-xs 
          border 
          border-border 
          rounded 
          hover:bg-muted 
          transition-colors
        "
        >
          Following
        </button>
      </div>
    </div>
  );
}

/**
 * Empty Feed State Component
 */
function EmptyFeedState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="empty-feed-state text-center py-8 space-y-3">
      <div className="icon text-4xl">{icon}</div>
      <div className="content">
        <h3 className="title font-medium text-foreground">{title}</h3>
        <p className="description text-sm text-muted-foreground mt-1">
          {description}
        </p>
      </div>
    </div>
  );
}

/**
 * Load More Button Component
 */
function LoadMoreButton({
  onClick,
  loading = false,
}: {
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="
        load-more-button 
        w-full 
        py-2 
        text-sm 
        text-muted-foreground 
        hover:text-foreground 
        transition-colors
        border-t 
        border-border 
        mt-4 
        pt-4
      "
    >
      {loading ? 'Loading...' : 'Load More'}
    </button>
  );
}

export default SocialSidebar;
