import { z } from 'zod';

// Video status enum
export const VideoStatusEnum = z.enum(['processing', 'ready', 'error', 'deleted']);

// Video asset schema with null to undefined transformation
export const VideoAssetSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  title: z.string().nullable().transform(val => val ?? undefined),
  description: z.string().nullable().transform(val => val ?? undefined),
  mux_asset_id: z.string().nullable().transform(val => val ?? undefined),
  mux_playback_id: z.string().nullable().transform(val => val ?? undefined),
  mux_upload_id: z.string().nullable().transform(val => val ?? undefined),
  status: VideoStatusEnum,
  duration: z.number().nullable().transform(val => val ?? undefined),
  thumbnail_url: z.string().nullable().transform(val => val ?? undefined),
  visibility: z.string().nullable().transform(val => val ?? undefined),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable().transform(val => val ?? undefined),
  comment_count: z.number(),
  metadata: z.any().nullable().transform(val => val ?? undefined),
});

export type VideoAsset = z.infer<typeof VideoAssetSchema>;

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
  user_id: z.string(),
  title: z.string().optional().transform(val => val ?? null),
  description: z.string().optional().transform(val => val ?? null),
  mux_asset_id: z.string().optional().transform(val => val ?? null),
  mux_playback_id: z.string().optional().transform(val => val ?? null),
  mux_upload_id: z.string().optional().transform(val => val ?? null),
  status: VideoStatusEnum.optional(),
  duration: z.number().optional().transform(val => val ?? null),
  thumbnail_url: z.string().optional().transform(val => val ?? null),
  visibility: z.string().optional().transform(val => val ?? null),
  metadata: z.any().optional().transform(val => val ?? null),
});

export type VideoInsert = z.input<typeof VideoInsertSchema>;

// Video update schema
export const VideoUpdateSchema = z.object({
  title: z.string().optional().transform(val => val ?? null),
  description: z.string().optional().transform(val => val ?? null),
  thumbnail_url: z.string().optional().transform(val => val ?? null),
  visibility: z.string().optional().transform(val => val ?? null),
  status: VideoStatusEnum.optional(),
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