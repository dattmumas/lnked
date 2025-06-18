import { MS_PER_SECOND, SECONDS_PER_MINUTE, MINUTES_PER_HOUR, HOURS_PER_DAY, DAYS_PER_WEEK } from '@/types/home/constants';

export function formatTimestamp(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSeconds = Math.floor(diffMs / MS_PER_SECOND);
  const diffMinutes = Math.floor(diffSeconds / SECONDS_PER_MINUTE);
  const diffHours = Math.floor(diffMinutes / MINUTES_PER_HOUR);
  const diffDays = Math.floor(diffHours / HOURS_PER_DAY);

  if (diffSeconds < SECONDS_PER_MINUTE) return 'just now';
  if (diffMinutes < MINUTES_PER_HOUR) return `${diffMinutes}m`;
  if (diffHours < HOURS_PER_DAY) return `${diffHours}h`;
  if (diffDays < DAYS_PER_WEEK) return `${diffDays}d`;
  return then.toLocaleDateString();
} 