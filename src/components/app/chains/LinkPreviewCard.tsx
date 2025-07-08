'use client';

import { X } from 'lucide-react';

import type { Database } from '@/lib/database.types';

type Json = Database['public']['Tables']['chains']['Row']['link_preview'];

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
}

function isLinkPreview(obj: unknown): obj is LinkPreview {
  return obj !== null && typeof obj === 'object' && 'url' in obj;
}

interface LinkPreviewCardProps {
  preview: Json;
  onRemove?: () => void;
}

export default function LinkPreviewCard({
  preview,
  onRemove,
}: LinkPreviewCardProps) {
  if (!isLinkPreview(preview)) return null;

  return (
    <div className="relative mt-2 rounded-lg border overflow-hidden">
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white z-10"
          aria-label="Remove link preview"
        >
          <X className="w-4 h-4" />
        </button>
      )}
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
