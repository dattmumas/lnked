import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
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
  const diffInHours = (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60));
    return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}h ago`;
  } else if (diffInHours < 168) { // 7 days
    return `${Math.floor(diffInHours / 24)}d ago`;
  }

  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function calculateReadingTime(content: string | null): string {
  if (!content) return '1 min read';
  
  let textContent = '';
  
  try {
    const parsed = JSON.parse(content);
    
    // Extract text from Lexical nodes recursively
    const extractText = (node: unknown): string => {
      if (typeof node === 'string') return node;
      if (node && typeof node === 'object') {
        const nodeObj = node as Record<string, unknown>;
        if (nodeObj.type === 'text' && typeof nodeObj.text === 'string') {
          return nodeObj.text;
        }
        if (nodeObj.children && Array.isArray(nodeObj.children)) {
          return nodeObj.children.map(extractText).join(' ');
        }
        if (typeof nodeObj.question === 'string') return nodeObj.question; // Poll questions
        if (typeof nodeObj.text === 'string') return nodeObj.text; // Sticky notes, etc.
      }
      return '';
    };
    
    if (parsed?.root?.children) {
      textContent = parsed.root.children.map(extractText).join(' ');
    } else {
      // Fallback to stringified JSON
      textContent = JSON.stringify(parsed);
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
    
  const wordsPerMinute = 200; // Average reading speed
  const minutes = Math.max(1, Math.ceil(words / wordsPerMinute));
  
  return `${minutes} min read`;
}
