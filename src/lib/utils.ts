import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ---------------------------------------------------------------------------
// Time constants and utility configuration
// ---------------------------------------------------------------------------
const MS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const HOURS_PER_WEEK = DAYS_PER_WEEK * HOURS_PER_DAY; // 168
const AVERAGE_WPM = 200; // Average reading speed

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date string or Date object to 'Month Day, Year' (e.g., January 1, 2024).
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }
  
  const now = new Date();
  const diffInHours =
    (now.getTime() - dateObj.getTime()) /
    (MS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR);

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(
      (now.getTime() - dateObj.getTime()) / (MS_PER_SECOND * SECONDS_PER_MINUTE)
    );
    return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`;
  } else if (diffInHours < HOURS_PER_DAY) {
    return `${Math.floor(diffInHours)}h ago`;
  } else if (diffInHours < HOURS_PER_WEEK) { // 7 days
    return `${Math.floor(diffInHours / HOURS_PER_DAY)}d ago`;
  }

  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface LexicalJSON {
  root?: {
    children?: unknown[];
  };
}

export function calculateReadingTime(content: string | null): string {
  if (content === null || content.trim() === '') return '1 min read';
  
  let textContent = '';
  
  try {
    const parsedRaw: unknown = JSON.parse(content);
    const parsed: LexicalJSON =
      typeof parsedRaw === 'object' && parsedRaw !== null ? (parsedRaw as LexicalJSON) : {};
  
    // Extract text from Lexical nodes recursively
    const extractText = (node: unknown): string => {
      if (typeof node === 'string') return node;
      if (node !== null && typeof node === 'object') {
        const nodeObj = node as Record<string, unknown>;
        if (nodeObj.type === 'text' && typeof nodeObj.text === 'string') {
          return nodeObj.text;
        }
        if (Array.isArray(nodeObj.children)) {
          return nodeObj.children.map(extractText).join(' ');
        }
        if (typeof nodeObj.question === 'string') return nodeObj.question; // Poll questions
        if (typeof nodeObj.text === 'string') return nodeObj.text; // Sticky notes, etc.
      }
      return '';
    };
    
    if (Array.isArray(parsed.root?.children)) {
      textContent = parsed.root.children
        .map(extractText)
        .join(' ');
    } else {
      // Fallback to stringified JSON
      textContent = JSON.stringify(parsedRaw);
    }
  } catch {
    // If not JSON, treat as plain text/HTML
    textContent = content.replace(/<[^>]+>/g, '');
  }
  
  // Clean and count words
  const cleanText = textContent
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .trim();
    
  const words = cleanText
    .split(/\s+/)
    .filter(word => word.length > 0)
    .length;
    
  const wordsPerMinute = AVERAGE_WPM;
  const minutes = Math.max(1, Math.ceil(words / wordsPerMinute));
  
  return `${minutes} min read`;
}
