'use client';

import Image from 'next/image';
import React, { useCallback } from 'react';

import { useProfileContext, useFollowMutation } from '@/lib/hooks/profile';
import {
  getOptimizedAvatarUrl,
  generateUserInitials,
} from '@/lib/utils/avatar';

import type { ProfileHeroProps } from '@/lib/hooks/profile/types';

// Constants for magic numbers
const AVATAR_SIZE_LARGE = 128;
const AVATAR_QUALITY_HIGH = 85;
const AVATAR_QUALITY_STANDARD = 80;
const BIO_TRUNCATE_LENGTH = 140;
const COUNT_MILLION = 1000000;
const COUNT_THOUSAND = 1000;

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
export function ProfileHero({
  className = '',
}: ProfileHeroProps): React.ReactElement {
  const {
    profile,
    metrics,
    isOwner,
    canEdit,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    permissions: _permissions,
  } = useProfileContext();

  const handleAvatarEdit = useCallback(() => {
    // TODO: Implement avatar edit functionality
    console.warn('Edit avatar clicked');
  }, []);

  const handleSocialLinksEdit = useCallback(() => {
    // TODO: Implement social links edit
    console.warn('Edit social links clicked');
  }, []);

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
            size={AVATAR_SIZE_LARGE}
            editable={canEdit}
            onEdit={handleAvatarEdit}
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
          {profile.socialLinks !== undefined &&
            profile.socialLinks !== null && (
              <div className="social-links">
                <SocialLinks
                  links={profile.socialLinks}
                  editable={canEdit}
                  onEdit={handleSocialLinksEdit}
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
}): React.ReactElement {
  const { profile } = useProfileContext();

  // Generate initials from full name or username
  const initials = React.useMemo(() => {
    return generateUserInitials(profile.fullName, profile.username);
  }, [profile.fullName, profile.username]);

  // Get optimized avatar URL with appropriate size and quality
  const optimizedAvatarUrl = React.useMemo(() => {
    return getOptimizedAvatarUrl(
      src !== undefined && src !== null ? src : undefined,
      {
        width: size,
        height: size,
        quality:
          size >= AVATAR_SIZE_LARGE
            ? AVATAR_QUALITY_HIGH
            : AVATAR_QUALITY_STANDARD,
        resize: 'cover',
      },
    );
  }, [src, size]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && onEdit) {
        onEdit();
      }
    },
    [onEdit],
  );

  const handleError = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      // Fallback to original URL if optimized version fails
      if (src !== undefined && src !== null && optimizedAvatarUrl !== src) {
        const imgElement = event.currentTarget;
        imgElement.src = src;
      }
    },
    [src, optimizedAvatarUrl],
  );

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
        onKeyDown={editable ? handleKeyDown : undefined}
      >
        {optimizedAvatarUrl !== undefined &&
        optimizedAvatarUrl !== null &&
        optimizedAvatarUrl.length > 0 ? (
          <Image
            src={optimizedAvatarUrl}
            alt={`${profile.fullName !== undefined && profile.fullName !== null ? profile.fullName : profile.username} avatar`}
            width={size}
            height={size}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={handleError}
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
}): React.ReactElement {
  const [showFullBio, setShowFullBio] = React.useState(false);
  const bioTruncated =
    bio !== undefined && bio !== null && bio.length > BIO_TRUNCATE_LENGTH;

  const handleToggleBio = useCallback(() => {
    setShowFullBio(!showFullBio);
  }, [showFullBio]);

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
        {name !== undefined && name !== null && name.length > 0 ? name : handle}
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
      {bio !== undefined && bio !== null && bio.length > 0 && (
        <div className="bio mt-2">
          <p
            className="
            bio-text 
            text-foreground 
            text-sm 
            leading-relaxed
          "
          >
            {bioTruncated && !showFullBio
              ? `${bio.slice(0, BIO_TRUNCATE_LENGTH)}...`
              : bio}
            {bioTruncated && (
              <button
                onClick={handleToggleBio}
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
}): React.ReactElement {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const formatCount = (count: number): string => {
    if (count >= COUNT_MILLION) return `${(count / COUNT_MILLION).toFixed(1)}M`;
    if (count >= COUNT_THOUSAND)
      return `${(count / COUNT_THOUSAND).toFixed(1)}K`;
    return count.toString();
  };

  const handleFollowersClick = useCallback((): void => {
    // TODO: Navigate to followers page or show followers modal
    console.warn('Show followers');
  }, []);

  const handleFollowingClick = useCallback((): void => {
    // TODO: Navigate to following page or show following modal
    console.warn('Show following');
  }, []);

  const handlePostsClick = useCallback((): void => {
    // TODO: Scroll to posts section
    console.warn('Scroll to posts');
  }, []);

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
}): React.ReactElement {
  const formatCountInternal = (count: number): string => {
    if (count >= COUNT_MILLION) return `${(count / COUNT_MILLION).toFixed(1)}M`;
    if (count >= COUNT_THOUSAND)
      return `${(count / COUNT_THOUSAND).toFixed(1)}K`;
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
        {formatCountInternal(count)}
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
}): React.ReactElement | undefined {
  if (
    links === undefined ||
    links === null ||
    Object.keys(links).length === 0
  ) {
    return undefined;
  }

  return (
    <div className={`social-links flex items-center gap-3 ${className}`}>
      {/* Location */}
      {links.location !== undefined &&
        links.location !== null &&
        links.location.length > 0 && (
          <span className="location text-sm text-muted-foreground flex items-center gap-1">
            📍 {links.location}
          </span>
        )}

      {/* Website */}
      {links.website !== undefined &&
        links.website !== null &&
        links.website.length > 0 && (
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
      {editable && onEdit !== undefined && onEdit !== null && (
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
function FollowButton(): React.ReactElement | undefined {
  const { isFollowing, profile, permissions } = useProfileContext();
  const followMutation = useFollowMutation();

  const handleFollowClickAsync = useCallback(async (): Promise<void> => {
    if (!permissions.canFollow) return;

    try {
      await followMutation.mutateAsync({
        targetUsername: profile.username,
        action: isFollowing ? 'unfollow' : 'follow',
      });
    } catch (error: unknown) {
      console.error('Follow/unfollow error:', error);
    }
  }, [permissions.canFollow, followMutation, profile.username, isFollowing]);

  const handleFollowClick = useCallback((): void => {
    void handleFollowClickAsync();
  }, [handleFollowClickAsync]);

  if (!permissions.canFollow) {
    return undefined; // Don't show follow button to owner or unauthenticated users
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
function EditProfileButton(): React.ReactElement {
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
