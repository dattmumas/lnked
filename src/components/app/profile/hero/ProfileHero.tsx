'use client';

import React from 'react';
import { useProfileContext } from '@/lib/hooks/profile';
import type { ProfileHeroProps } from '@/lib/hooks/profile/types';
import { useFollowMutation } from '@/lib/hooks/profile';
import {
  getOptimizedAvatarUrl,
  generateUserInitials,
} from '@/lib/utils/avatar';

/**
 * Profile Hero Component - Main profile display section (65% desktop width)
 *
 * Features:
 * - 128×128px avatar with edit functionality for owners
 * - Display name, handle, and bio
 * - Counter pills (Posts, Followers, Following)
 * - Social links and location
 * - Follow/Edit button based on permissions
 */
export function ProfileHero({ className = '' }: ProfileHeroProps) {
  const {
    profile,
    metrics,
    isOwner,
    canEdit,
    permissions: _permissions,
  } = useProfileContext();

  return (
    <section
      className={`
      profile-hero
      space-y-6
      bg-card 
      rounded-lg
      border

      /* Responsive adjustments */
      max-md:space-y-4
      
      ${className}
    `}
    >
      {/* Main Hero Content */}
      <div className="hero-content flex gap-6 max-md:gap-4 p-6 max-lg:p-5 max-md:p-4">
        {/* Avatar Section */}
        <div className="avatar-section flex-shrink-0">
          <AvatarCard
            src={profile.avatarUrl}
            size={128}
            editable={canEdit}
            onEdit={() => {
              // TODO: Implement avatar edit functionality
              console.info('Edit avatar clicked');
            }}
          />
        </div>

        {/* Profile Information */}
        <div className="profile-info flex-1 min-w-0 space-y-3">
          {/* Name and Handle */}
          <div className="identity">
            <ProfileMeta
              name={profile.fullName}
              handle={profile.username}
              bio={profile.bio}
            />
          </div>

          {/* Counter Pills */}
          <div className="metrics">
            <CounterPills
              followerCount={metrics.followerCount}
              followingCount={metrics.followingCount}
              postCounts={metrics.postCounts}
            />
          </div>

          {/* Social Links */}
          {profile.socialLinks && (
            <div className="social-links">
              <SocialLinks
                links={profile.socialLinks}
                editable={canEdit}
                onEdit={() => {
                  // TODO: Implement social links edit
                  console.info('Edit social links clicked');
                }}
              />
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="actions flex-shrink-0">
          {isOwner ? <EditProfileButton /> : <FollowButton />}
        </div>
      </div>
    </section>
  );
}

/**
 * Avatar Card Component - Displays user avatar with edit capability using Supabase transformations
 */
function AvatarCard({
  src,
  size,
  editable = false,
  onEdit,
  className = '',
}: {
  src?: string | null;
  size: number;
  editable?: boolean;
  onEdit?: () => void;
  className?: string;
}) {
  const { profile } = useProfileContext();

  // Generate initials from full name or username
  const initials = React.useMemo(() => {
    return generateUserInitials(profile.fullName, profile.username);
  }, [profile.fullName, profile.username]);

  // Get optimized avatar URL with appropriate size and quality
  const optimizedAvatarUrl = React.useMemo(() => {
    return getOptimizedAvatarUrl(src, {
      width: size,
      height: size,
      quality: size >= 128 ? 85 : 80, // Higher quality for larger avatars
      resize: 'cover',
    });
  }, [src, size]);

  return (
    <div className={`avatar-card relative ${className}`}>
      <div
        className="
          avatar-wrapper 
          relative 
          group 
          cursor-pointer
          rounded-full 
          overflow-hidden 
          border-2 
          border-border
          transition-all
          hover:border-primary/50
          hover:shadow-lg
        "
        style={{
          width: size,
          height: size,
        }}
        onClick={editable ? onEdit : undefined}
        role={editable ? 'button' : undefined}
        tabIndex={editable ? 0 : undefined}
        onKeyDown={
          editable ? (e) => e.key === 'Enter' && onEdit?.() : undefined
        }
      >
        {optimizedAvatarUrl ? (
          <img
            src={optimizedAvatarUrl}
            alt={`${profile.fullName || profile.username} avatar`}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              // Fallback to original URL if optimized version fails
              if (src && optimizedAvatarUrl !== src) {
                e.currentTarget.src = src;
              }
            }}
          />
        ) : (
          <div
            className="
            w-full 
            h-full 
            bg-gradient-to-br
            from-primary/20
            to-primary/40
            flex 
            items-center 
            justify-center 
            text-foreground 
            font-semibold
            text-2xl
          "
          >
            {initials}
          </div>
        )}

        {/* Edit Overlay */}
        {editable && (
          <div
            className="
            absolute 
            inset-0 
            bg-black/50 
            flex 
            items-center 
            justify-center 
            opacity-0 
            group-hover:opacity-100 
            transition-opacity
            backdrop-blur-sm
          "
          >
            <span className="text-white text-sm font-medium">Edit</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Profile Meta Component - Display name, handle, and bio
 */
function ProfileMeta({
  name,
  handle,
  bio,
  className = '',
}: {
  name: string | null;
  handle: string;
  bio: string | null;
  className?: string;
}) {
  const [showFullBio, setShowFullBio] = React.useState(false);
  const bioTruncated = bio && bio.length > 140;

  return (
    <div className={`profile-meta ${className}`}>
      {/* Display Name */}
      <h1
        className="
        display-name 
        text-2xl 
        font-bold 
        text-foreground 
        leading-tight
        max-md:text-xl
      "
      >
        {name || handle}
      </h1>

      {/* Handle */}
      <p
        className="
        handle 
        text-muted-foreground 
        text-sm 
        font-medium
      "
      >
        @{handle}
      </p>

      {/* Bio */}
      {bio && (
        <div className="bio mt-2">
          <p
            className="
            bio-text 
            text-foreground 
            text-sm 
            leading-relaxed
          "
          >
            {bioTruncated && !showFullBio ? `${bio.slice(0, 140)}...` : bio}
            {bioTruncated && (
              <button
                onClick={() => setShowFullBio(!showFullBio)}
                className="
                  ml-2 
                  text-primary 
                  hover:text-primary/80 
                  text-sm 
                  font-medium
                  transition-colors
                "
              >
                {showFullBio ? 'less' : 'more'}
              </button>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Counter Pills Component - Displays post, follower, and following counts
 */
function CounterPills({
  followerCount,
  followingCount,
  postCounts,
  className = '',
}: {
  followerCount: number;
  followingCount: number;
  postCounts: { writing: number; video: number; total: number };
  className?: string;
}) {
  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handleFollowersClick = () => {
    // TODO: Navigate to followers page or show followers modal
    console.info('Show followers');
  };

  const handleFollowingClick = () => {
    // TODO: Navigate to following page or show following modal
    console.info('Show following');
  };

  const handlePostsClick = () => {
    // TODO: Scroll to posts section
    console.info('Scroll to posts');
  };

  return (
    <div className={`counter-pills flex gap-3 ${className}`}>
      <CounterPill
        label="Posts"
        count={postCounts.total}
        onClick={handlePostsClick}
      />
      <CounterPill
        label="Followers"
        count={followerCount}
        onClick={handleFollowersClick}
      />
      <CounterPill
        label="Following"
        count={followingCount}
        onClick={handleFollowingClick}
      />
    </div>
  );
}

/**
 * Individual Counter Pill
 */
function CounterPill({
  label,
  count,
  onClick,
}: {
  label: string;
  count: number;
  onClick?: () => void;
}) {
  const _formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <button
      onClick={onClick}
      className="
        counter-pill 
        flex 
        items-center 
        gap-1 
        px-3 
        py-1 
        bg-muted/50 
        rounded-full 
        text-sm 
        font-medium 
        text-foreground
        hover:bg-muted
        transition-colors
        cursor-pointer
      "
    >
      <span className="count text-foreground font-semibold">
        {_formatCount(count)}
      </span>
      <span className="label text-muted-foreground">{label}</span>
    </button>
  );
}

/**
 * Social Links Component - Display and edit social links
 */
function SocialLinks({
  links,
  editable = false,
  onEdit,
  className = '',
}: {
  links: import('@/lib/hooks/profile/types').SocialLinks | null;
  editable?: boolean;
  onEdit?: () => void;
  className?: string;
}) {
  if (!links || Object.keys(links).length === 0) {
    return null;
  }

  return (
    <div className={`social-links flex items-center gap-3 ${className}`}>
      {/* Location */}
      {links.location && (
        <span className="location text-sm text-muted-foreground flex items-center gap-1">
          📍 {links.location}
        </span>
      )}

      {/* Website */}
      {links.website && (
        <a
          href={links.website}
          target="_blank"
          rel="noopener noreferrer"
          className="website text-sm text-primary hover:text-primary/80 transition-colors"
        >
          🔗 Website
        </a>
      )}

      {/* Edit Button */}
      {editable && onEdit && (
        <button
          onClick={onEdit}
          className="
            edit-links 
            text-sm 
            text-muted-foreground 
            hover:text-foreground 
            transition-colors
          "
        >
          ✏️ Edit
        </button>
      )}
    </div>
  );
}

/**
 * Follow Button Component - Now with real mutation hooks
 */
function FollowButton() {
  const { isFollowing, profile, permissions } = useProfileContext();
  const followMutation = useFollowMutation();

  const handleFollowClick = async () => {
    if (!permissions.canFollow) return;

    try {
      await followMutation.mutateAsync({
        targetUsername: profile.username,
        action: isFollowing ? 'unfollow' : 'follow',
      });
    } catch (error) {
      console.error('Follow/unfollow error:', error);
    }
  };

  if (!permissions.canFollow) {
    return null; // Don't show follow button to owner or unauthenticated users
  }

  return (
    <button
      onClick={handleFollowClick}
      disabled={followMutation.isPending}
      className={`
      follow-button 
      px-4 
      py-2 
      rounded-md 
      text-sm 
      font-medium 
      transition-colors
      disabled:opacity-50
      disabled:cursor-not-allowed
      
      ${
        isFollowing
          ? 'bg-muted text-foreground border border-border hover:bg-muted/80'
          : 'bg-primary text-primary-foreground hover:bg-primary/90'
      }
    `}
    >
      {followMutation.isPending ? (
        <span className="flex items-center gap-2">
          <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          {isFollowing ? 'Unfollowing...' : 'Following...'}
        </span>
      ) : (
        <span>{isFollowing ? 'Following' : 'Follow'}</span>
      )}
    </button>
  );
}

/**
 * Edit Profile Button Component
 */
function EditProfileButton() {
  return (
    <button
      className="
      edit-profile-button 
      px-4 
      py-2 
      border 
      border-border 
      text-foreground 
      rounded-md 
      text-sm 
      font-medium 
      hover:bg-muted 
      transition-colors
    "
    >
      Edit Profile
    </button>
  );
}

export default ProfileHero;
