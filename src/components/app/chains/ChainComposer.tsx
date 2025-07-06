'use client';

import { encode } from 'blurhash';
import imageCompression from 'browser-image-compression';
import { Loader2, Smile, Image as ImageIcon, Send, X } from 'lucide-react';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';
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

export interface ChainComposerProps {
  user: { id: string; email?: string };
  profile: UserProfile | null;
  onCreated?: (row: ChainWithAuthor) => void;
  /** If provided, composer posts as a reply to this root thread */
  rootId?: string;
  parentId?: string | undefined;
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
  const [isPosting, setIsPosting] = useState(false);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const supabase = useMemo(createSupabaseBrowserClient, []);
  const { error: toastError } = useToast();
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
            preview =
              typeof previewData === 'string'
                ? (JSON.parse(previewData) as Json)
                : (previewData as Json);
          } else {
            toastError('Link preview failed to load');
          }
        }
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

        // Re-fetch chain with media
        const { data: chainWithMedia, error: fetchErr } = await supabase
          .from('v_chain_with_media')
          .select('*')
          .eq('id', chainId)
          .single();

        setContent('');
        setImages([]);
        if (fetchErr === null && chainWithMedia !== null) {
          onCreated?.(chainWithMedia as unknown as ChainWithAuthor);
        }
      } catch (err) {
        console.error('Error posting chain:', err);
        toastError('Failed to post');
      } finally {
        setIsPosting(false);
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
    ],
  );

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, [images]);

  return (
    <div className="mb-6 mx-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex-1 space-y-3">
          {/* Textarea doubles as drop-target */}
          <div {...getRootProps({ className: 'relative' })}>
            <input {...getInputProps()} />
            <Textarea
              value={content}
              onChange={(e): void => {
                const val = e.target.value.slice(0, CHARACTER_LIMIT);
                setContent(val);
              }}
              placeholder={parentId || rootId ? `Reply...` : 'Thoughts?'}
              className="min-h-[90px] resize-none text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
              maxLength={CHARACTER_LIMIT}
              disabled={isPosting}
            />
          </div>

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
                  <div key={img.preview} className="relative group space-y-1">
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
                          prev.filter((i) => i.preview !== img.preview),
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
  );
}
