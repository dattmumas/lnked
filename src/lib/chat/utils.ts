/**
 * Chat utility functions
 */

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

/** Maximum number of characters to show for user initials */
// eslint-disable-next-line no-magic-numbers
const MAX_INITIALS_LENGTH = 2 as const;

/** Time‑unit helpers */
// eslint-disable-next-line no-magic-numbers
export const MILLISECONDS_PER_SECOND = 1000 as const;
 
export const SECONDS_PER_MINUTE = 60;
// eslint-disable-next-line no-magic-numbers
export const SECONDS_PER_HOUR   = 60 * SECONDS_PER_MINUTE;
// eslint-disable-next-line no-magic-numbers
export const SECONDS_PER_DAY    = 24 * SECONDS_PER_HOUR;
// eslint-disable-next-line no-magic-numbers
export const SECONDS_PER_WEEK   = 7 * SECONDS_PER_DAY;
// eslint-disable-next-line no-magic-numbers
export const SECONDS_PER_MONTH  = 30 * SECONDS_PER_DAY; // ≈30 days

/**
 * Get display name for a user with fallback chain
 * Priority: full_name -> username -> email-based name -> 'Anonymous'
 */
export function getDisplayName(user: {
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
} | null | undefined): string {
  if (!user) return 'Anonymous';
  
  // Try full name first
  const fullName = typeof user.full_name === 'string' ? user.full_name.trim() : '';
  if (fullName.length > 0) {
    return fullName;
  }

  // Then username
  const username = typeof user.username === 'string' ? user.username.trim() : '';
  if (username.length > 0) {
    return username;
  }

  // Extract name from email if available
  if (typeof user.email === 'string' && user.email.trim().length > 0) {
    const emailName = user.email.split('@')[0];
    if (!emailName) {
      return 'Unknown User';
    }
    
    return emailName
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
  
  return 'Anonymous';
}

/**
 * Get initials for a user's display name
 */
export function getUserInitials(user: {
  full_name?: string | null;
  username?: string | null;
} | null | undefined): string {
  const displayName = getDisplayName(user);
  
  return displayName
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, MAX_INITIALS_LENGTH);
}

/**
 * Format timestamp for chat messages
 */
export function formatChatTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Format relative time for conversation list
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor(
    (now.getTime() - date.getTime()) / MILLISECONDS_PER_SECOND,
  );

  if (diffInSeconds < SECONDS_PER_MINUTE) return 'now';
  if (diffInSeconds < SECONDS_PER_HOUR) {
    return `${Math.floor(diffInSeconds / SECONDS_PER_MINUTE)}m`;
  }
  if (diffInSeconds < SECONDS_PER_DAY) {
    return `${Math.floor(diffInSeconds / SECONDS_PER_HOUR)}h`;
  }
  if (diffInSeconds < SECONDS_PER_MONTH) {
    return `${Math.floor(diffInSeconds / SECONDS_PER_DAY)}d`;
  }
  return `${Math.floor(diffInSeconds / SECONDS_PER_MONTH)}mo`;
}