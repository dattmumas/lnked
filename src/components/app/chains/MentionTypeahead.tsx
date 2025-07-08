'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface User {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  type: 'user';
}

export interface Post {
  id: string;
  title: string;
  published_at: string;
  type: 'post';
  username?: string;
}

type MentionResult = (User | Post)[];

interface MentionTypeaheadProps {
  query: string;
  onSelect: (item: User | Post) => void;
}

async function fetchMentions(query: string): Promise<MentionResult> {
  if (query.length < 1) return [];

  const response = await fetch(
    `/api/search/mentions?query=${encodeURIComponent(query)}`,
  );
  if (!response.ok) {
    throw new Error('Failed to fetch mentions');
  }
  return response.json() as Promise<MentionResult>;
}

export default function MentionTypeahead({
  query,
  onSelect,
}: MentionTypeaheadProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const {
    data: results = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['mentions', query],
    queryFn: () => fetchMentions(query),
    enabled: query.length >= 1,
  });

  useEffect(() => {
    if (results.length > 0) {
      setActiveIndex(0);
    }
  }, [results]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (results.length === 0) return;

      switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % results.length);
      
      break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
      
      break;
      }
      case 'Enter': {
        e.preventDefault();
        const selectedItem = results[activeIndex];
        if (selectedItem) {
          onSelect(selectedItem);
        }
      
      break;
      }
      // No default
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, activeIndex, onSelect]);

  if (isLoading) {
    return (
      <div className="p-2 space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (isError || !results) {
    return null; // Don't show anything on error
  }

  if (results.length === 0 && query.length >= 1) {
    const isPostSearch = query.includes('/');
    const username = isPostSearch ? query.split('/')[0] : '';

    return (
      <p className="p-4 text-sm text-muted-foreground">
        {isPostSearch ? `No posts found for @${username}` : 'No users found'}
      </p>
    );
  }

  return (
    <div className="w-full bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
      {results.map((item, index) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item)}
          className={cn(
            'flex items-center w-full px-4 py-2 text-left hover:bg-muted',
            index === activeIndex && 'bg-muted',
          )}
        >
          {item.type === 'user' && item.avatar_url && (
            <Avatar className="w-6 h-6 mr-3">
              <AvatarImage src={item.avatar_url} />
              <AvatarFallback>
                {(item.full_name || item.username || 'U')
                  .charAt(0)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1">
            <p className="font-medium text-sm">
              {item.type === 'user'
                ? item.full_name || item.username
                : item.title}
            </p>
            {item.type === 'user' && (
              <p className="text-xs text-muted-foreground">@{item.username}</p>
            )}
            {item.type === 'post' && (
              <p className="text-xs text-muted-foreground">Post</p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
