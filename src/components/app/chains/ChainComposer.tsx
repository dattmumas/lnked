'use client';

import { Loader2, Smile, Image, Send } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';
import { extractFirstUrl } from '@/lib/utils/extractLinks';

import type { ChainWithAuthor } from '@/lib/data-access/schemas/chain.schema';
import type { Database } from '@/lib/database.types';

// Type alias for cleaner code
type Json = Database['public']['Tables']['chains']['Row']['link_preview'];

// Constants (kept here to avoid cross-file imports for now)
const CHARACTER_LIMIT = 180;
const WARNING_THRESHOLD = 20;
const MAX_INITIALS_LENGTH = 2;

export interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export interface ChainComposerProps {
  user: { id: string; email?: string };
  profile: UserProfile | null;
  onCreated?: (row: ChainWithAuthor) => void;
}

/**
 * A standalone composer for posting a new Chain on the Right Sidebar.
 */
export default function ChainComposer({
  user,
  profile,
  onCreated,
}: ChainComposerProps): React.ReactElement {
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const supabase = useMemo(createSupabaseBrowserClient, []);
  const remainingChars = CHARACTER_LIMIT - content.length;

  const getUserInitials = useCallback((): string => {
    if (profile?.full_name) {
      return profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, MAX_INITIALS_LENGTH)
        .toUpperCase();
    }
    if (profile?.username) {
      return profile.username.slice(0, MAX_INITIALS_LENGTH).toUpperCase();
    }
    if (user.email) {
      return user.email.slice(0, MAX_INITIALS_LENGTH).toUpperCase();
    }
    return 'U';
  }, [profile, user.email]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      if (content.trim().length === 0 || isPosting) return;
      setIsPosting(true);
      try {
        const id =
          globalThis.crypto?.randomUUID?.() ??
          Math.random().toString(36).slice(2, 10);
        const firstUrl = extractFirstUrl(content);
        let preview: Json | null = null;
        if (firstUrl !== null) {
          const { data: previewData, error: unfurlErr } =
            await supabase.functions.invoke('links-unfurl', {
              body: { url: firstUrl },
            });

          if (unfurlErr === null && previewData !== null) {
            // supabase-js returns raw text when content-type is application/json
            // Convert string payload to object if necessary.
            preview =
              typeof previewData === 'string'
                ? (JSON.parse(previewData) as Json)
                : (previewData as Json);
          }
        }
        const { data, error } = await supabase
          .from('chains')
          .insert({
            id,
            author_id: user.id,
            content: content.trim(),
            status: 'active',
            created_at: new Date().toISOString(),
            thread_root: id,
            ...(preview ? { link_preview: preview } : {}),
          })
          .select(
            `*,
            author:users!author_id(id, username, full_name, avatar_url)
          `,
          )
          .single();
        if (error === null && data !== null) {
          setContent('');
          onCreated?.(data as unknown as ChainWithAuthor);
        }
      } catch (err) {
        console.error('Error posting chain:', err);
      } finally {
        setIsPosting(false);
      }
    },
    [content, isPosting, supabase, user.id, onCreated],
  );

  return (
    <div
      className={cn(
        'relative mb-6 mx-3 rounded-2xl p-5 transition-all',
        'bg-white/5 dark:bg-gray-100/50 bg-clip-padding backdrop-filter border-black backdrop-blur-xl backdrop-saturate-200',
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-3">
          <Avatar className="w-9 h-9 flex-shrink-0">
            {profile?.avatar_url ? (
              <AvatarImage
                src={profile.avatar_url}
                alt={profile.full_name ?? profile.username ?? 'User'}
              />
            ) : (
              <AvatarFallback className="text-xs">
                {getUserInitials()}
              </AvatarFallback>
            )}
          </Avatar>

          <div className="flex-1 space-y-3">
            <Textarea
              value={content}
              onChange={(e): void => setContent(e.target.value)}
              placeholder="Thoughts?"
              className="min-h-[90px] resize-none text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
              maxLength={CHARACTER_LIMIT}
              disabled={isPosting}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="p-2 text-muted-foreground hover:text-accent hover:bg-accent/20 rounded-full transition-colors"
                  title="Add emoji"
                  disabled={isPosting}
                >
                  <Smile className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="p-2 text-muted-foreground hover:text-accent hover:bg-accent/20 rounded-full transition-colors"
                  title="Add image"
                  disabled={isPosting}
                >
                  <Image className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'text-xs font-medium',
                    remainingChars < WARNING_THRESHOLD
                      ? 'text-destructive'
                      : 'text-muted-foreground',
                  )}
                >
                  {remainingChars}
                </span>
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    content.trim().length === 0 ||
                    isPosting ||
                    remainingChars < 0
                  }
                  className="px-5 py-2 h-auto text-sm font-medium"
                >
                  {isPosting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Posting...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Post
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
