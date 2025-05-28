/**
 * Chat utility functions
 */

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
  if (user.full_name && user.full_name.trim()) {
    return user.full_name;
  }
  
  // Then username
  if (user.username && user.username.trim()) {
    return user.username;
  }
  
  // Extract name from email if available
  if (user.email) {
    const emailName = user.email.split('@')[0];
    // Convert email prefix to readable name (e.g., john.doe -> John Doe)
    // This matches the extract_name_from_email function in our database
    return emailName
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
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
    .slice(0, 2);
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
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
  return `${Math.floor(diffInSeconds / 2592000)}mo`;
} 