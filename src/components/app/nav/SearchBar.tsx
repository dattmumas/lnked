'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useState, useRef, useEffect } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

// Constants
const SEARCH_LIMIT = 3;
const SEARCH_DEBOUNCE_DELAY = 300;

interface SearchResult {
  id: string;
  title: string;
  type: 'post' | 'user' | 'collective';
  description?: string;
  href: string;
  avatarUrl?: string;
  slug?: string;
}

interface SearchBarProps {
  className?: string;
}

export default function SearchBar({
  className,
}: SearchBarProps): React.ReactElement {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = createSupabaseBrowserClient();

  // Real search function using Supabase
  const performSearch = useCallback(
    async (searchQuery: string): Promise<void> => {
      if (
        searchQuery !== undefined &&
        searchQuery !== null &&
        searchQuery.trim().length === 0
      ) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const searchResults: SearchResult[] = [];

        // Search posts (limit to 3 for dropdown)
        const { data: postsData } = await supabase
          .from('posts')
          .select(
            'id, title, subtitle, collective:collectives!posts_collective_id_fkey(slug)',
          )
          .eq('is_public', true)
          .not('published_at', 'is', undefined)
          .or(`title.ilike.%${searchQuery}%,subtitle.ilike.%${searchQuery}%`)
          .limit(SEARCH_LIMIT);

        if (postsData !== undefined && postsData !== null) {
          postsData.forEach((post) => {
            searchResults.push({
              id: post.id,
              title: post.title,
              type: 'post',
              ...(post.subtitle && post.subtitle.length > 0
                ? { description: post.subtitle }
                : {}),
              href: `/posts/${post.id}`,
            });
          });
        }

        // Search users (limit to 3 for dropdown)
        const { data: usersData } = await supabase
          .from('users')
          .select('id, username, full_name, bio, avatar_url')
          .or(
            `username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`,
          )
          .limit(SEARCH_LIMIT);

        if (usersData !== undefined && usersData !== null) {
          usersData.forEach((user) => {
            if (
              user.username !== undefined &&
              user.username !== null &&
              user.username.length > 0
            ) {
              searchResults.push({
                id: user.id,
                title:
                  user.full_name && user.full_name.length > 0
                    ? user.full_name
                    : user.username,
                type: 'user',
                ...(user.bio && user.bio.length > 0
                  ? { description: user.bio }
                  : {}),
                href: `/profile/${user.username}`,
                ...(user.avatar_url && user.avatar_url.length > 0
                  ? { avatarUrl: user.avatar_url }
                  : {}),
              });
            }
          });
        }

        // Search collectives (limit to 3 for dropdown)
        const { data: collectivesData } = await supabase
          .from('collectives')
          .select('id, name, slug, description')
          .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
          .limit(SEARCH_LIMIT);

        if (collectivesData !== undefined && collectivesData !== null) {
          collectivesData.forEach((collective) => {
            searchResults.push({
              id: collective.id,
              title: collective.name,
              type: 'collective',
              ...(collective.description && collective.description.length > 0
                ? { description: collective.description }
                : {}),
              href: `/collectives/${collective.slug}`,
              slug: collective.slug,
            });
          });
        }

        setResults(searchResults);
      } catch (error: unknown) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [supabase],
  );

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      void performSearch(query);
    }, SEARCH_DEBOUNCE_DELAY);

    return (): void => clearTimeout(delayedSearch);
  }, [query, performSearch]);

  // Close search on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        containerRef.current !== null &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return (): void =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = useCallback((): void => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setQuery(e.target.value);
    },
    [],
  );

  const handleInputFocus = useCallback((): void => {
    setIsOpen(true);
  }, []);

  const handleEnterPress = useCallback(
    (e: React.KeyboardEvent): void => {
      if (
        e.key === 'Enter' &&
        query !== undefined &&
        query !== null &&
        query.trim().length > 0
      ) {
        // Enter key now just keeps the dropdown open with current results
        // Could be extended to show more results in the future
        e.preventDefault();
      }
    },
    [query],
  );

  const handleResultClick = useCallback((): void => {
    setIsOpen(false);
  }, []);

  const handleRecentSearchClick = useCallback(
    (search: string) => (): void => {
      setQuery(search);
      inputRef.current?.focus();
    },
    [],
  );

  const handleTrendingSearchClick = useCallback(
    (search: string) => (): void => {
      setQuery(search);
      inputRef.current?.focus();
    },
    [],
  );

  const getTypeIcon = useCallback((type: SearchResult['type']): string => {
    switch (type) {
      case 'post':
        return '📄';
      case 'user':
        return '👤';
      case 'collective':
        return '👥';
      default:
        return '🔍';
    }
  }, []);

  const getTypeLabel = useCallback((type: SearchResult['type']): string => {
    switch (type) {
      case 'post':
        return 'Post';
      case 'user':
        return 'User';
      case 'collective':
        return 'Collective';
      default:
        return '';
    }
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <input
          ref={inputRef}
          type="search"
          placeholder="Search... ( / )"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleEnterPress}
          className="
            w-full pl-10 pr-10 py-2.5 text-sm
            bg-background/60 backdrop-blur-md border border-border/60 rounded-xl
            focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent/60
            placeholder:text-muted-foreground/70
            transition-all duration-200
            shadow-sm hover:shadow-md
          "
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full left-0 right-0 mt-2 z-50"
          >
            <div className="bg-gray-100 border border-border/60 rounded-xl shadow-xl overflow-hidden">
              {/* Search Results */}
              {query.length > 0 && (
                <div className="p-3 border-b border-border/30">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Search Results
                    </h3>
                    {isLoading && (
                      <div className="h-4 w-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                    )}
                  </div>

                  {results.length > 0 ? (
                    <div className="space-y-1">
                      {results.map((result) => (
                        <Link
                          key={result.id}
                          href={result.href}
                          onClick={handleResultClick}
                          className="block p-2 rounded-lg hover:bg-accent/20 transition-colors duration-150"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">
                              {getTypeIcon(result.type)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">
                                  {result.title}
                                </p>
                                <span className="text-xs text-muted-foreground bg-accent/20 px-1.5 py-0.5 rounded">
                                  {getTypeLabel(result.type)}
                                </span>
                              </div>
                              {result.description !== undefined &&
                                result.description !== null &&
                                result.description.length > 0 && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {result.description}
                                  </p>
                                )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    !isLoading && (
                      <p className="text-sm text-muted-foreground py-2">
                        No results found
                      </p>
                    )
                  )}
                </div>
              )}

              {/* No default suggestions when query empty */}
              {query.length === 0 && null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
