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
    <div
      className={cn(
        'rounded-2xl overflow-hidden group',
        'border border-white/[0.08] dark:border-white/[0.06]',
        'bg-white/[0.02] backdrop-blur-sm',
        'hover:bg-white/[0.04] dark:hover:bg-white/[0.03]',
        'hover:border-white/[0.12] dark:hover:border-white/[0.08]',
        'transition-all duration-200',
      )}
    >
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          'top-2 right-2 p-1.5 rounded-full z-10',
          'bg-black/60 backdrop-blur-sm text-white',
          'opacity-0 group-hover:opacity-100',
          'transition-all duration-200',
          'hover:bg-black/80 hover:scale-110',
        )}
        aria-label="Remove link preview"
      >
        <X className="w-4 h-4" />
      </button>
      <a href={preview.url} target="_blank" rel="noreferrer" className="block">
        {preview.image && (
          <img
            src={preview.image}
            alt={preview.title || 'Link preview'}
            className="w-full h-48 object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        )}
        <div className="p-4 space-y-2">
          <h4 className="font-semibold text-sm leading-snug line-clamp-2 text-foreground group-hover:text-accent transition-colors">
            {preview.title || preview.url}
          </h4>
          {preview.description && (
            <p className="text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed">
              {preview.description}
            </p>
          )}
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
      className={cn(
        // Base layout and spacing - matching ChainCard exactly
        'relative mb-4 mr-4',

        // Modern card styling with enhanced contrast
        'rounded-3xl bg-white/[0.02] backdrop-blur-xl',
        'border border-white/[0.08] dark:border-white/[0.06]',

        // Elevated appearance with sophisticated shadows
        'shadow-md',
        'dark:shadow-md',

        // Interactive states
        'hover:shadow-lg',
        'dark:hover:shadow-lg',
        'hover:border-white/[0.12] dark:hover:border-white/[0.1]',
        'transition-all duration-300 ease-out',

        // Subtle gradient overlay
        'before:absolute before:inset-0 before:rounded-3xl',
        'before:bg-gradient-to-br before:from-white/[0.03] before:to-transparent',
        'before:pointer-events-none',
      )}
    >
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {!isExpanded ? (
            <motion.button
              key="collapsed"
              type="button"
              onClick={handleExpand}
              layout
              initial={{ opacity: 1 }}
              exit={{
                opacity: 0,
                scale: 0.98,
                transition: {
                  duration: 0.15,
                  ease: [0.4, 0.0, 1, 1],
                },
              }}
              whileHover={{
                scale: 1.005,
                transition: {
                  type: 'spring',
                  stiffness: 400,
                  damping: 25,
                },
              }}
              whileTap={{
                scale: 0.995,
                transition: {
                  type: 'spring',
                  stiffness: 600,
                  damping: 35,
                },
              }}
              className={cn(
                'w-full text-left p-6 rounded-3xl',
                'text-base text-muted-foreground/80 font-medium',
                'hover:text-foreground/90 transition-colors duration-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                'hover:bg-white/[0.02] dark:hover:bg-white/[0.01]',
              )}
            >
              <motion.span
                layout
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {parentId || rootId
                  ? `Reply to this chain...`
                  : 'Share your thoughts...'}
              </motion.span>
            </motion.button>
          ) : (
            <motion.div
              key="expanded"
              ref={composerRef}
              layout
              initial={{
                opacity: 0,
                scale: 0.96,
                y: -8,
                filter: 'blur(4px)',
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                filter: 'blur(0px)',
              }}
              exit={{
                opacity: 0,
                scale: 0.98,
                y: -4,
                filter: 'blur(2px)',
                transition: {
                  duration: 0.2,
                  ease: [0.4, 0.0, 1, 1],
                },
              }}
              transition={{
                layout: {
                  type: 'spring',
                  stiffness: 300,
                  damping: 35,
                  mass: 1,
                },
                opacity: {
                  duration: 0.4,
                  ease: [0.0, 0.0, 0.2, 1],
                  delay: 0.1,
                },
                scale: {
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                  delay: 0.05,
                },
                y: {
                  type: 'spring',
                  stiffness: 500,
                  damping: 40,
                  delay: 0.08,
                },
                filter: {
                  duration: 0.3,
                  ease: [0.0, 0.0, 0.2, 1],
                  delay: 0.1,
                },
              }}
              className="overflow-hidden"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  ease: [0.0, 0.0, 0.2, 1],
                  delay: 0.2,
                }}
                className="p-6"
              >
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    {/* Textarea with enhanced styling and staggered animation */}
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.99 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 35,
                        delay: 0.25,
                      }}
                      {...getRootProps({ className: 'relative' })}
                    >
                      <input {...getInputProps()} />
                      <Textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleContentChange}
                        placeholder={
                          parentId || rootId
                            ? `Reply to this chain...`
                            : 'Share your thoughts...'
                        }
                        className={cn(
                          'min-h-[120px] resize-none text-base leading-relaxed',
                          'rounded-2xl border-white/[0.08] dark:border-white/[0.06]',
                          'bg-white/[0.02] backdrop-blur-sm',
                          'focus:border-accent/50 focus:ring-accent/20',
                          'placeholder:text-muted-foreground/60 placeholder:font-medium',
                          'transition-all duration-200',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                        )}
                        maxLength={CHARACTER_LIMIT}
                        disabled={isPosting}
                      />
                    </motion.div>

                    {/* Mention Typeahead with enhanced styling */}
                    {mentionQuery !== null && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }}
                      >
                        <MentionTypeahead
                          query={mentionQuery}
                          onSelect={handleMentionSelect}
                        />
                      </motion.div>
                    )}

                    {/* Link Preview with enhanced styling */}
                    <AnimatePresence>
                      {isFetchingPreview && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Skeleton className="h-24 w-full rounded-2xl bg-white/[0.04]" />
                        </motion.div>
                      )}
                      {linkPreview && !isFetchingPreview && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          transition={{
                            duration: 0.3,
                            ease: [0.4, 0.0, 0.2, 1],
                          }}
                        >
                          <LinkPreviewCard
                            preview={linkPreview}
                            onRemove={() => setLinkPreview(null)}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Image upload area with enhanced styling */}
                    <AnimatePresence>
                      {images.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{
                            duration: 0.3,
                            ease: [0.4, 0.0, 0.2, 1],
                          }}
                          className="space-y-3"
                        >
                          <div className="grid grid-cols-2 gap-4">
                            {images.map((img, idx) => (
                              <motion.div
                                key={img.preview}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{
                                  duration: 0.2,
                                  delay: idx * 0.05,
                                }}
                                className="relative group space-y-3"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={img.preview}
                                  alt="preview"
                                  className={cn(
                                    'w-full h-32 object-cover rounded-2xl',
                                    'ring-1 ring-white/[0.08] dark:ring-white/[0.06]',
                                    'group-hover:ring-white/[0.12] transition-all duration-200',
                                  )}
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
                                  className={cn(
                                    'absolute top-2 right-2 p-1.5 rounded-full',
                                    'bg-black/60 backdrop-blur-sm text-white',
                                    'opacity-0 group-hover:opacity-100',
                                    'transition-all duration-200',
                                    'hover:bg-black/80 hover:scale-110',
                                  )}
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
                                  className={cn(
                                    'w-full p-3 rounded-xl text-sm',
                                    'bg-white/[0.02] backdrop-blur-sm',
                                    'border border-white/[0.08] dark:border-white/[0.06]',
                                    'focus:border-accent/50 focus:ring-accent/20',
                                    'placeholder:text-muted-foreground/60',
                                    'transition-all duration-200',
                                  )}
                                />
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Action bar with enhanced styling */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 35,
                      delay: 0.35,
                    }}
                    className="flex items-center justify-between pt-4 border-t border-white/[0.06] dark:border-white/[0.04]"
                  >
                    <div className="flex items-center gap-2">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{
                          type: 'spring',
                          stiffness: 400,
                          damping: 25,
                        }}
                        className={cn(
                          'p-3 rounded-full transition-all duration-200',
                          'text-muted-foreground/60 hover:text-accent',
                          'hover:bg-accent/10 dark:hover:bg-accent/10',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                        )}
                        title="Add emoji"
                        disabled={isPosting}
                      >
                        <Smile className="w-5 h-5" />
                      </motion.button>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{
                          type: 'spring',
                          stiffness: 400,
                          damping: 25,
                        }}
                        className={cn(
                          'p-3 rounded-full transition-all duration-200',
                          'text-muted-foreground/60 hover:text-accent',
                          'hover:bg-accent/10 dark:hover:bg-accent/10',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                        )}
                        title="Add image"
                        onClick={open}
                        disabled={isPosting || images.length >= MAX_FILES}
                      >
                        <ImageIcon className="w-5 h-5" />
                      </motion.button>
                    </div>

                    <div className="flex items-center gap-4">
                      <motion.span
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          type: 'spring',
                          stiffness: 400,
                          damping: 25,
                          delay: 0.4,
                        }}
                        className={cn(
                          'text-sm font-medium transition-colors duration-200',
                          remainingChars < WARNING_THRESHOLD
                            ? 'text-destructive'
                            : 'text-muted-foreground/70',
                        )}
                      >
                        {remainingChars}
                      </motion.span>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, x: 10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{
                          type: 'spring',
                          stiffness: 400,
                          damping: 25,
                          delay: 0.45,
                        }}
                      >
                        <Button
                          type="submit"
                          size="sm"
                          disabled={
                            content.trim().length === 0 ||
                            content.length > CHARACTER_LIMIT ||
                            isPosting
                          }
                          className={cn(
                            'px-6 py-3 h-auto text-sm font-semibold rounded-full',
                            'bg-accent hover:bg-accent/90 text-accent-foreground',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            'transition-all duration-200',
                            'hover:scale-105 active:scale-95',
                            'shadow-lg hover:shadow-xl',
                          )}
                        >
                          {isPosting ? (
                            <motion.div
                              className="flex items-center gap-2"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {rootId ? 'Replying...' : 'Posting...'}
                            </motion.div>
                          ) : (
                            <motion.div
                              className="flex items-center gap-2"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Send className="w-4 h-4" />
                              Post
                            </motion.div>
                          )}
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
