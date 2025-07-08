'use client';

import { encode } from 'blurhash';
import imageCompression from 'browser-image-compression';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Smile, Image as ImageIcon, Send, X } from 'lucide-react';
import React, {
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
} from 'react';
import { useDropzone } from 'react-dropzone';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useToast } from '@/hooks/useToast';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';
import { extractFirstUrl } from '@/lib/utils/extractLinks';

import MentionTypeahead from './MentionTypeahead';

import type { User, Post } from './MentionTypeahead';
import type { ChainWithAuthor } from '@/lib/data-access/schemas/chain.schema';
import type { Database } from '@/lib/database.types';

// Type alias for cleaner code
type Json = Database['public']['Tables']['chains']['Row']['link_preview'];

// Constants (kept here to avoid cross-file imports for now)
const CHARACTER_LIMIT = 180;
const WARNING_THRESHOLD = 20;
const MAX_INITIALS_LENGTH = 2;

// Upload configuration
const MAX_FILES = 4;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Dynamically create Web Worker (bundled by Next.js)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const blurWorker: Worker | null =
  typeof window !== 'undefined' && typeof Worker !== 'undefined'
    ? new Worker(
        new URL('../../../workers/blurhash.worker.ts', import.meta.url),
      )
    : null;

interface SelectedImage {
  file: File;
  preview: string;
  width: number;
  height: number;
  blurhash: string;
  compressed: Blob;
  altText?: string;
}

export interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface MentionData {
  type: 'user' | 'post';
  id: string;
  text: string;
  offset: number;
  length: number;
  username?: string | null;
}

export interface ChainComposerProps {
  user: { id: string; email?: string };
  profile: UserProfile | null;
  onCreated?: (row: ChainWithAuthor) => void;
  /** If provided, composer posts as a reply to this root thread */
  rootId?: string;
  parentId?: string | undefined;
}

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
}

function isLinkPreview(obj: unknown): obj is LinkPreview {
  return obj !== null && typeof obj === 'object' && 'url' in obj;
}

function encodeBlurhash(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): Promise<string> {
  return new Promise((resolve) => {
    if (!blurWorker) {
      resolve(encode(data, w, h, 4, 4));
      return;
    }
    const id = Math.random();
    const handler = (e: MessageEvent): void => {
      if (e.data.id === id) {
        blurWorker?.removeEventListener('message', handler);
        resolve(e.data.hash as string);
      }
    };
    blurWorker.addEventListener('message', handler);
    blurWorker.postMessage({ id, data, width: w, height: h });
  });
}

function LinkPreviewCard({
  preview,
  onRemove,
}: {
  preview: Json;
  onRemove: () => void;
}) {
  if (!isLinkPreview(preview)) return null;

  return (
    <div className="relative mt-2 rounded-lg border overflow-hidden">
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white z-10"
        aria-label="Remove link preview"
      >
        <X className="w-4 h-4" />
      </button>
      <a href={preview.url} target="_blank" rel="noreferrer" className="block">
        {preview.image && (
          <img
            src={preview.image}
            alt={preview.title || 'Link preview'}
            className="w-full max-h-48 object-cover"
          />
        )}
        <div className="p-3">
          <p className="font-medium text-sm truncate">
            {preview.title || preview.url}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {preview.description}
          </p>
        </div>
      </a>
    </div>
  );
}

/**
 * A standalone composer for posting a new Chain on the Right Sidebar.
 */
export default function ChainComposer({
  user,
  profile,
  onCreated,
  rootId,
  parentId,
}: ChainComposerProps): React.ReactElement {
  const [content, setContent] = useState('');
  const [mentionsData, setMentionsData] = useState<MentionData[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionTriggerIndex, setMentionTriggerIndex] = useState<number | null>(
    null,
  );
  const [isPosting, setIsPosting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [linkPreview, setLinkPreview] = useState<Json | null>(null);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const supabase = useMemo(createSupabaseBrowserClient, []);
  const { error: toastError } = useToast();
  const remainingChars = CHARACTER_LIMIT - content.length;
  const composerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Collapse when clicking outside
  useClickOutside(composerRef, () => {
    if (isExpanded) {
      setIsExpanded(false);
    }
  });

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = e.target; // Character limit handled by textarea
    setContent(value);

    const cursorPosition = e.target.selectionStart;
    const textUpToCursor = value.slice(0, cursorPosition);

    // Regex to find @ at the start of a word, followed by characters
    const mentionMatch = /@([\w/]*)$/.exec(textUpToCursor);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1] ?? '');
      setMentionTriggerIndex(mentionMatch.index);
    } else {
      setMentionQuery(null);
      setMentionTriggerIndex(null);
    }
  };

  const handleMentionSelect = (item: User | Post) => {
    if (mentionTriggerIndex === null || !item.username) return;

    const isUserMention = item.type === 'user';

    // The text that will be displayed in the textarea
    const textToInsert = isUserMention
      ? `@${item.username}`
      : `@${item.username}/${item.title} `;

    const newQuery = isUserMention ? `${item.username}/` : null;

    // Correctly replace the typed part of the string with the full mention
    const start = content.slice(0, mentionTriggerIndex);
    const end = content.slice(
      mentionTriggerIndex + (mentionQuery?.length ?? 0) + 1,
    );
    const newContent = start + textToInsert + end;

    const mentionToAdd: MentionData = {
      type: item.type,
      id: item.id,
      text: textToInsert,
      offset: mentionTriggerIndex,
      length: textToInsert.length,
      username: item.username,
    };

    setMentionsData((prev) => [...prev, mentionToAdd]);
    setContent(newContent);
    setMentionQuery(newQuery);

    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        const newCursorPosition = mentionTriggerIndex + textToInsert.length;
        textarea.focus();
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

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

  // ===== Drop-zone handling =====
  const onDrop = useCallback(
    async (accepted: File[]): Promise<void> => {
      const next: SelectedImage[] = [];
      for (const rawFile of accepted.slice(0, MAX_FILES - images.length)) {
        try {
          // Compress only JPG/PNG; skip others
          const compressed = await imageCompression(rawFile, {
            maxSizeMB: 0.9, // target ≤~900 KB
            maxWidthOrHeight: 1920,
            fileType: 'image/webp',
            initialQuality: 0.8,
          });

          // Read image dimensions via createImageBitmap
          const bitmap = await createImageBitmap(compressed);
          const { width } = bitmap;
          const { height } = bitmap;

          // Draw to canvas to get pixel data for blurhash (downscale for speed)
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx === null) throw new Error('Canvas ctx null');
          const hashW = 32;
          const hashH = Math.round((height / width) * 32);
          canvas.width = hashW;
          canvas.height = hashH;
          ctx.drawImage(bitmap, 0, 0, hashW, hashH);
          const imageData = ctx.getImageData(0, 0, hashW, hashH);
          const blurhash = await encodeBlurhash(imageData.data, hashW, hashH);

          const preview = URL.createObjectURL(compressed);

          next.push({
            file: rawFile,
            preview,
            width,
            height,
            blurhash,
            compressed,
          });
        } catch (err) {
          console.error('Failed processing image', err);
        }
      }
      setImages((prev) => [...prev, ...next]);
    },
    [images.length],
  );

  const { getRootProps, getInputProps, open } = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: MAX_FILES,
    noClick: true,
    noKeyboard: true,
    onDrop,
  });

  // Effect to fetch link preview
  useEffect(() => {
    const firstUrl = extractFirstUrl(content);
    if (firstUrl && images.length === 0) {
      setIsFetchingPreview(true);
      supabase.functions
        .invoke('links-unfurl', { body: { url: firstUrl } })
        .then(({ data, error }) => {
          if (!error && data) {
            setLinkPreview(
              typeof data === 'string'
                ? (JSON.parse(data) as Json)
                : (data as Json),
            );
          }
        })
        .finally(() => setIsFetchingPreview(false));
    } else {
      setLinkPreview(null);
    }
  }, [content, supabase, images.length]);

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
        if (firstUrl !== null && images.length === 0) {
          const { data: previewData, error: unfurlErr } =
            await supabase.functions.invoke('links-unfurl', {
              body: { url: firstUrl },
            });

          if (unfurlErr === null && previewData !== null) {
            preview =
              typeof previewData === 'string'
                ? (JSON.parse(previewData) as Json)
                : (previewData as Json);
          } else {
            toastError('Link preview failed to load');
          }
        }
        const meta: Json = {
          references: mentionsData as unknown as Json,
          ...(preview ? { link_preview: preview } : {}),
        };

        const insertPayload = {
          id,
          author_id: user.id,
          content: content.trim(),
          status: 'active',
          created_at: new Date().toISOString(),
          ...(parentId
            ? { parent_id: parentId, thread_root: rootId ?? parentId }
            : rootId
              ? { parent_id: rootId, thread_root: rootId }
              : { thread_root: id }),
          ...(rootId === undefined && parentId !== undefined
            ? { thread_root: parentId }
            : {}),
          meta,
          // TEMP dual-write during migration – kept for backward compatibility
          ...(preview ? { link_preview: preview } : {}),
        } as const;

        const { error: insertErr } = await supabase
          .from('chains')
          .insert(insertPayload);

        if (insertErr !== null) throw insertErr;

        const chainId = insertPayload.id;

        // ===== Upload images & create media rows =====
        if (images.length > 0) {
          const uploads = images.map(async (img, index) => {
            const path = `${user.id}/${chainId}/${index + 1}.webp`;
            const { error: upErr } = await supabase.storage
              .from('chain-images')
              .upload(path, img.compressed, {
                upsert: false,
                contentType: 'image/webp',
              });
            if (upErr !== null) throw upErr;

            const { error: mediaErr } = await supabase.from('media').insert({
              chain_id: chainId,
              ordinal: index + 1,
              type: 'image',
              storage_path: path,
              width: img.width,
              height: img.height,
              blurhash: img.blurhash,
              alt_text: img.altText ?? null,
              storage_bucket: 'chain-images',
              allow_download: true,
            });
            if (mediaErr !== null) throw mediaErr;
          });
          await Promise.all(uploads);
        }

        // Re-fetch chain with media AND author info
        const { data: chainWithMedia, error: fetchErr } = await supabase
          .from('v_chain_with_media')
          .select('*, author:users!author_id(*)')
          .eq('id', chainId)
          .single();

        setContent('');
        setImages([]);
        setMentionsData([]);
        if (fetchErr === null && chainWithMedia !== null) {
          onCreated?.(chainWithMedia as unknown as ChainWithAuthor);
        }
      } catch (err) {
        console.error('Error posting chain:', err);
        toastError('Failed to post');
      } finally {
        setIsPosting(false);
        setIsExpanded(false);
        setLinkPreview(null); // Clear preview on success
      }
    },
    [
      content,
      isPosting,
      supabase,
      user.id,
      onCreated,
      rootId,
      parentId,
      toastError,
      images,
      mentionsData,
    ],
  );

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, [images]);

  const handleExpand = () => {
    setIsExpanded(true);
    // Use a timeout to allow the textarea to render before focusing it
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100); // A small delay is often needed
  };

  return (
    <div
      className="mb-6 mx-3"
      style={{
        boxShadow: '0 0 20px 5px hsl(var(--foreground) / 0.05)',
      }}
    >
      <div className="">
        <AnimatePresence initial={false}>
          {!isExpanded ? (
            <button
              type="button"
              onClick={handleExpand}
              className="w-full text-left bg-surface-elevated-1 hover:bg-surface-elevated-2 px-4 py-3 text-sm text-muted-foreground transition-colors"
            >
              {parentId || rootId ? `Reply...` : 'Thoughts?'}
            </button>
          ) : (
            <motion.div
              ref={composerRef}
              style={{ transformOrigin: 'top' }}
              initial={{ scaleY: 0, opacity: 0, height: 0 }}
              animate={{ scaleY: 1, opacity: 1, height: 'auto' }}
              exit={{ scaleY: 0, opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div className="p-2">
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="flex-1 space-y-3">
                    {/* Textarea doubles as drop-target */}
                    <div {...getRootProps({ className: 'relative' })}>
                      <input {...getInputProps()} />
                      <Textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleContentChange}
                        placeholder={
                          parentId || rootId ? `Reply...` : 'Thoughts?'
                        }
                        className="min-h-[90px] resize-none text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                        maxLength={CHARACTER_LIMIT}
                        disabled={isPosting}
                      />
                    </div>

                    {/* Mention Typeahead */}
                    {mentionQuery !== null && (
                      <MentionTypeahead
                        query={mentionQuery}
                        onSelect={handleMentionSelect}
                      />
                    )}

                    {/* Link Preview */}
                    {isFetchingPreview && (
                      <Skeleton className="h-24 w-full mt-2" />
                    )}
                    {linkPreview && !isFetchingPreview && (
                      <LinkPreviewCard
                        preview={linkPreview}
                        onRemove={() => setLinkPreview(null)}
                      />
                    )}

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
                          onClick={open}
                          disabled={isPosting || images.length >= MAX_FILES}
                        >
                          <ImageIcon className="w-4 h-4" />
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
                            content.length > CHARACTER_LIMIT ||
                            isPosting
                          }
                          className="px-5 py-2 h-auto text-sm font-medium"
                        >
                          {isPosting ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {rootId ? 'Replying...' : 'Posting...'}
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

                    {/* Image upload area */}
                    <div className="space-y-3">
                      {images.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                          {images.map((img, idx) => (
                            <div
                              key={img.preview}
                              className="relative group space-y-1"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={img.preview}
                                alt="preview"
                                className="w-full h-20 object-cover rounded-md"
                              />
                              <button
                                type="button"
                                onClick={(): void =>
                                  setImages((prev) =>
                                    prev.filter(
                                      (i) => i.preview !== img.preview,
                                    ),
                                  )
                                }
                                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Remove image"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <input
                                type="text"
                                value={img.altText ?? ''}
                                onChange={(e): void => {
                                  const val = e.target.value.slice(0, 120);
                                  setImages((prev) =>
                                    prev.map((p, i) =>
                                      i === idx ? { ...p, altText: val } : p,
                                    ),
                                  );
                                }}
                                placeholder="Alt text (optional)"
                                className="w-full p-1 rounded-md bg-background/60 text-xs focus:outline-none focus:ring-1 focus:ring-accent/50"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
