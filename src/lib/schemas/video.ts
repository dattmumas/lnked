import { z } from 'zod';
import {
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  VIDEOS_PER_PAGE,
} from '@/lib/constants/video';

// Enhanced video upload metadata schema with new fields
export const VideoUploadMetadataSchema = z.object({
  title: z.string().min(1, 'Title is required').max(MAX_TITLE_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  is_public: z.boolean().default(false),
  collective_id: z.string().uuid().optional(),
  post_id: z.string().uuid().optional(),
  privacySetting: z.enum(['public', 'private']).default('public'),
  encoding_tier: z.enum(['smart', 'baseline']).default('smart'),
  playback_policy: z.enum(['public', 'signed']).default('public'),
});

// Enhanced upload URL creation schema - for MUX direct uploads
export const CreateUploadUrlSchema = z.object({
  title: z.string().min(1, 'Title is required').max(MAX_TITLE_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  collective_id: z.string().uuid().optional(),
  post_id: z.string().uuid().optional(),
  privacySetting: z.enum(['public', 'private']).default('public'),
  encoding_tier: z.enum(['smart', 'baseline']).default('smart'),
});

// Enhanced video asset schema with all new database columns
export const VideoAssetSchema = z.object({
  id: z.string().uuid(),
  mux_asset_id: z.string().nullable(),
  mux_upload_id: z.string().nullable(),
  mux_playback_id: z.string().nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  created_by: z.string().uuid(), // Updated field name to match database
  collective_id: z.string().uuid().nullable(),
  post_id: z.string().uuid().nullable(),
  is_public: z.boolean().nullable(),
  playback_policy: z.string().nullable(),
  encoding_tier: z.string().nullable(),
  status: z.string().nullable(), // Made nullable to match database
  duration: z.number().nullable(),
  aspect_ratio: z.string().nullable(),
  mp4_support: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

// Enhanced video upload schema
export const videoUploadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(MAX_TITLE_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  collective_id: z.string().uuid().optional(),
  post_id: z.string().uuid().optional(),
  privacySetting: z.enum(['public', 'private']).default('public'),
  encoding_tier: z.enum(['smart', 'baseline']).default('smart'),
  tags: z.array(z.string()).optional(), // Legacy support
});

// Enhanced video update schema with all new fields
export const videoUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(MAX_TITLE_LENGTH).optional(),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  collective_id: z.string().uuid().optional(),
  post_id: z.string().uuid().optional(),
  is_public: z.boolean().optional(),
  playback_policy: z.enum(['public', 'signed']).optional(),
  encoding_tier: z.enum(['smart', 'baseline']).optional(),
  privacySetting: z.enum(['public', 'private']).optional(),
  status: z.enum(['preparing', 'ready', 'errored', 'deleted']).optional(),
  is_published: z.boolean().optional(),
  tags: z.array(z.string()).optional(), // Legacy support
});

// Enhanced video search schema
export const videoSearchSchema = z.object({
  query: z.string().optional(),
  collective_id: z.string().uuid().optional(),
  is_public: z.boolean().optional(),
  status: z.enum(['preparing', 'ready', 'errored', 'deleted']).optional(),
  tags: z.array(z.string()).optional(),
  userId: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z
    .number()
    .int()
    .positive()
    .default(VIDEOS_PER_PAGE),
  sortBy: z.enum(['created_at', 'title', 'duration']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Enhanced video query schema
export const videoQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z
    .coerce
    .number()
    .min(1)
    .default(VIDEOS_PER_PAGE),
  search: z.string().optional(),
  collective_id: z.string().uuid().optional(),
  is_public: z.boolean().optional(),
  status: z.enum(['preparing', 'ready', 'errored', 'deleted']).optional(),
  sort: z.enum(['created_at', 'title', 'duration']).default('created_at'),
});

// Export enhanced types
export type VideoUploadMetadata = z.infer<typeof VideoUploadMetadataSchema>;
export type CreateUploadUrl = z.infer<typeof CreateUploadUrlSchema>;
export type VideoAsset = z.infer<typeof VideoAssetSchema>;
export type VideoUploadInput = z.infer<typeof videoUploadSchema>;
export type VideoUpdateInput = z.infer<typeof videoUpdateSchema>;
export type VideoSearchInput = z.infer<typeof videoSearchSchema>;
export type VideoQueryInput = z.infer<typeof videoQuerySchema>;


// Enhanced validation helper functions
export function validateCreateUploadUrl(data: unknown): CreateUploadUrl {
  return CreateUploadUrlSchema.parse(data);
}

export function validateVideoUploadMetadata(data: unknown): VideoUploadMetadata {
  return VideoUploadMetadataSchema.parse(data);
}

export function validateVideoAsset(data: unknown): VideoAsset {
  return VideoAssetSchema.parse(data);
}

export function validateVideoUpload(data: unknown): VideoUploadInput {
  return videoUploadSchema.parse(data);
}

export function validateVideoUpdate(data: unknown): VideoUpdateInput {
  return videoUpdateSchema.parse(data);
}

export function validateVideoSearch(data: unknown): VideoSearchInput {
  return videoSearchSchema.parse(data);
}

export function validateVideoQuery(data: unknown): VideoQueryInput {
  return videoQuerySchema.parse(data);
}