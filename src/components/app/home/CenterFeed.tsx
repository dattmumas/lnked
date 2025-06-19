 
'use client';

import { Loader2, RefreshCw } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { useFeed } from '@/hooks/home/useFeed';
import { usePostFeedInteractions } from '@/hooks/home/usePostFeedInteractions';

import { PostCardWrapper } from './PostCardWrapper';

import type { User } from '@supabase/supabase-js';

interface Props {
  user: User;
}

export function CenterFeed({ user }: Props): React.JSX.Element {
  const { feedItems, loading, error, refetch } = useFeed();
  const interactions = usePostFeedInteractions(user.id);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 text-sm mb-2">Error loading feed</p>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="w-4 h-4 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  if (feedItems.length === 0) {
    return (
      <p className="text-center text-sm text-gray-500 py-10">
        No posts yet. Follow someone or create a post to get started!
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {feedItems.map((item) => (
        <PostCardWrapper
          key={item.id}
          item={item}
          interactions={interactions}
        />
      ))}
    </div>
  );
}
