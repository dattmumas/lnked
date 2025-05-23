'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, TrendingUp, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface SearchResult {
  id: string;
  title: string;
  type: 'post' | 'user' | 'collective';
  description?: string;
  href: string;
}

interface SearchBarProps {
  className?: string;
}

// Mock search results - in real implementation, this would come from an API
const mockResults: SearchResult[] = [
  {
    id: '1',
    title: 'Getting Started with Next.js 14',
    type: 'post',
    description: 'A comprehensive guide to the latest features',
    href: '/posts/getting-started-nextjs-14',
  },
  {
    id: '2',
    title: 'John Doe',
    type: 'user',
    description: 'Full-stack developer and tech writer',
    href: '/profile/johndoe',
  },
  {
    id: '3',
    title: 'React Developers Collective',
    type: 'collective',
    description: 'Community for React enthusiasts',
    href: '/collectives/react-developers',
  },
];

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

  // Mock search function
  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (searchQuery.trim()) {
      const filtered = mockResults.filter(
        (result) =>
          result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          result.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setResults(filtered);
    } else {
      setResults([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (query) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 150);

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
            <div className="bg-background/95 backdrop-blur-lg border border-border/60 rounded-xl shadow-xl overflow-hidden">
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
                <p className="text-xs text-muted-foreground text-center">
                  Press{' '}
                  <kbd className="px-1 py-0.5 bg-accent/20 rounded text-xs">
                    Enter
                  </kbd>{' '}
                  to search
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
