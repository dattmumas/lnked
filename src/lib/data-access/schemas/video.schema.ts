import { z } from 'zod';

// Video status enum - includes 'preparing' which is the database default
export const VideoStatusEnum = z.enum(['preparing', 'processing', 'ready', 'error', 'deleted']);

// Video asset schema with null to undefined transformation - aligned with database schema
export const VideoAssetSchema = z.object({
  id: z.string(),
  created_by: z.string().nullable().transform(val => val ?? undefined),
  title: z.string().nullable().transform(val => val ?? undefined),
  description: z.string().nullable().transform(val => val ?? undefined),
  mux_asset_id: z.string().nullable().transform(val => val ?? undefined),
  mux_playback_id: z.string().nullable().transform(val => val ?? undefined),
  mux_upload_id: z.string().nullable().transform(val => val ?? undefined),
  status: z.string().nullable().transform(val => val ?? undefined), // Allow any status for flexibility
  duration: z.number().nullable().transform(val => val ?? undefined),
  aspect_ratio: z.string().nullable().transform(val => val ?? undefined),
  created_at: z.string().nullable().transform(val => val ?? undefined),
  updated_at: z.string().nullable().transform(val => val ?? undefined),
  comment_count: z.number().default(0), // Required field with default
  is_public: z.boolean().nullable().transform(val => val ?? undefined),
  playback_policy: z.string().nullable().transform(val => val ?? undefined),
  encoding_tier: z.string().nullable().transform(val => val ?? undefined),
  collective_id: z.string().nullable().transform(val => val ?? undefined),
  post_id: z.string().nullable().transform(val => val ?? undefined),
  mp4_support: z.string().nullable().transform(val => val ?? undefined),
  metadata: z.any().nullable().transform(val => val ?? undefined),
});

export type VideoAsset = z.infer<typeof VideoAssetSchema>;

// Minimal schema for list view API responses (matches LIST_VIEW_FIELDS)
export const VideoAssetListSchema = z.object({
  id: z.string(),
  title: z.string().nullable().transform(val => val ?? undefined),
  status: z.string().nullable().transform(val => val ?? undefined),
  duration: z.number().nullable().transform(val => val ?? undefined),
  created_at: z.string().nullable().transform(val => val ?? undefined),
  updated_at: z.string().nullable().transform(val => val ?? undefined),
  is_public: z.boolean().nullable().transform(val => val ?? undefined),
  mux_playback_id: z.string().nullable().transform(val => val ?? undefined),
});

export type VideoAssetList = z.infer<typeof VideoAssetListSchema>;

// Video with user info
export const VideoWithUserSchema = VideoAssetSchema.extend({
  user: z.object({
    id: z.string(),
    username: z.string().nullable().transform(val => val ?? undefined),
    full_name: z.string().nullable().transform(val => val ?? undefined),
    avatar_url: z.string().nullable().transform(val => val ?? undefined),
  }).optional(),
});

export type VideoWithUser = z.infer<typeof VideoWithUserSchema>;

// Video insert schema
export const VideoInsertSchema = z.object({
  created_by: z.string(),
  title: z.string().optional().transform(val => val ?? null),
  description: z.string().optional().transform(val => val ?? null),
  mux_asset_id: z.string().optional().transform(val => val ?? null),
  mux_playback_id: z.string().optional().transform(val => val ?? null),
  mux_upload_id: z.string().optional().transform(val => val ?? null),
  status: VideoStatusEnum.optional(),
  duration: z.number().optional().transform(val => val ?? null),
  aspect_ratio: z.string().optional().transform(val => val ?? null),
  is_public: z.boolean().optional().transform(val => val ?? null),
  playback_policy: z.string().optional().transform(val => val ?? null),
  encoding_tier: z.string().optional().transform(val => val ?? null),
  collective_id: z.string().optional().transform(val => val ?? null),
  post_id: z.string().optional().transform(val => val ?? null),
  mp4_support: z.string().optional().transform(val => val ?? null),
  metadata: z.any().optional().transform(val => val ?? null),
});

export type VideoInsert = z.input<typeof VideoInsertSchema>;

// Video update schema
export const VideoUpdateSchema = z.object({
  title: z.string().optional().transform(val => val ?? null),
  description: z.string().optional().transform(val => val ?? null),
  status: VideoStatusEnum.optional(),
  aspect_ratio: z.string().optional().transform(val => val ?? null),
  is_public: z.boolean().optional().transform(val => val ?? null),
  playback_policy: z.string().optional().transform(val => val ?? null),
  encoding_tier: z.string().optional().transform(val => val ?? null),
  collective_id: z.string().optional().transform(val => val ?? null),
  post_id: z.string().optional().transform(val => val ?? null),
  mp4_support: z.string().optional().transform(val => val ?? null),
  metadata: z.any().optional().transform(val => val ?? null),
});

export type VideoUpdate = z.input<typeof VideoUpdateSchema>;

// Helper functions
export function parseVideoAsset(data: unknown): VideoAsset {
  return VideoAssetSchema.parse(data);
}

export function parseVideoAssets(data: unknown[]): VideoAsset[] {
  return data.map(parseVideoAsset);
}

export function parseVideoWithUser(data: unknown): VideoWithUser {
  return VideoWithUserSchema.parse(data);
}

export function parseVideosWithUser(data: unknown[]): VideoWithUser[] {
  return data.map(parseVideoWithUser);
} 