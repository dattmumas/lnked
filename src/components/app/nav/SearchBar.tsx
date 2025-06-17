'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, TrendingUp, Clock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

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

const recentSearches = [
  'Next.js tutorials',
  'TypeScript best practices',
  'React hooks',
];

const trendingSearches = [
  'AI in web development',
  'Modern CSS techniques',
  'Database optimization',
];

export default function SearchBar({ className }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  // Real search function using Supabase
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
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
        .not('published_at', 'is', null)
        .or(`title.ilike.%${searchQuery}%,subtitle.ilike.%${searchQuery}%`)
        .limit(3);

      if (postsData) {
        postsData.forEach((post) => {
          searchResults.push({
            id: post.id,
            title: post.title,
            type: 'post',
            description: post.subtitle || undefined,
            href: `/posts/${post.id}`,
          });
        });
      }

      // Search users (limit to 3 for dropdown)
      const { data: usersData } = await supabase
        .from('users')
        .select('id, username, full_name, bio, avatar_url')
        .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .limit(3);

      if (usersData) {
        usersData.forEach((user) => {
          if (user.username) {
            searchResults.push({
              id: user.id,
              title: user.full_name || user.username,
              type: 'user',
              description: user.bio || undefined,
              href: `/profile/${user.username}`,
              avatarUrl: user.avatar_url || undefined,
            });
          }
        });
      }

      // Search collectives (limit to 3 for dropdown)
      const { data: collectivesData } = await supabase
        .from('collectives')
        .select('id, name, slug, description')
        .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .limit(3);

      if (collectivesData) {
        collectivesData.forEach((collective) => {
          searchResults.push({
            id: collective.id,
            title: collective.name,
            type: 'collective',
            description: collective.description || undefined,
            href: `/collectives/${collective.slug}`,
            slug: collective.slug,
          });
        });
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [query]);

  // Close search on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  const handleEnterPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const getTypeIcon = (type: SearchResult['type']) => {
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
  };

  const getTypeLabel = (type: SearchResult['type']) => {
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
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <input
          ref={inputRef}
          type="search"
          placeholder="Search posts, authors, collectives..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
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
        {query && (
          <button
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
              {query && (
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
                          onClick={() => setIsOpen(false)}
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
                              {result.description && (
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

              {/* Recent and Trending Searches */}
              {!query && (
                <div className="p-3 space-y-4">
                  {/* Recent Searches */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Recent
                      </h3>
                    </div>
                    <div className="space-y-1">
                      {recentSearches.map((search, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setQuery(search);
                            inputRef.current?.focus();
                          }}
                          className="block w-full text-left p-2 text-sm rounded-lg hover:bg-accent/20 transition-colors duration-150"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Trending Searches */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Trending
                      </h3>
                    </div>
                    <div className="space-y-1">
                      {trendingSearches.map((search, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setQuery(search);
                            inputRef.current?.focus();
                          }}
                          className="block w-full text-left p-2 text-sm rounded-lg hover:bg-accent/20 transition-colors duration-150"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="px-3 py-2 bg-accent/5 border-t border-border/30">
                {query && results.length > 0 ? (
                  <Link
                    href={`/search?q=${encodeURIComponent(query.trim())}`}
                    onClick={() => setIsOpen(false)}
                    className="block text-center text-sm text-accent hover:text-accent/80 transition-colors duration-150"
                  >
                    View all results for "{query}"
                  </Link>
                ) : (
                  <p className="text-xs text-muted-foreground text-center">
                    Press{' '}
                    <kbd className="px-1 py-0.5 bg-accent/20 rounded text-xs">
                      Enter
                    </kbd>{' '}
                    to search
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
