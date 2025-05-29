import { z } from 'zod';
import { MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH, VIDEOS_PER_PAGE } from '@/lib/constants/video';

// Simple video upload metadata schema
export const VideoUploadMetadataSchema = z.object({
  title: z.string().min(1, 'Title is required').max(MAX_TITLE_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  is_public: z.boolean().default(false),
  collective_id: z.string().uuid().optional(),
});

// Upload URL creation schema - for MUX direct uploads
export const CreateUploadUrlSchema = z.object({
  title: z.string().min(1, 'Title is required').max(MAX_TITLE_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  is_public: z.boolean().default(false),
  collective_id: z.string().uuid().optional(),
});

// Basic video asset info from database
export const VideoAssetSchema = z.object({
  id: z.string().uuid(),
  mux_asset_id: z.string(),
  mux_upload_id: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  owner_id: z.string().uuid(),
  collective_id: z.string().uuid().nullable(),
  is_public: z.boolean(),
  status: z.enum(['preparing', 'ready', 'errored', 'deleted']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  processed_at: z.string().datetime().nullable(),
});

// Export types
export type VideoUploadMetadata = z.infer<typeof VideoUploadMetadataSchema>;
export type CreateUploadUrl = z.infer<typeof CreateUploadUrlSchema>;
export type VideoAsset = z.infer<typeof VideoAssetSchema>;

// Validation helper functions
export function validateCreateUploadUrl(data: unknown): CreateUploadUrl {
  return CreateUploadUrlSchema.parse(data);
}

export function validateVideoUploadMetadata(data: unknown): VideoUploadMetadata {
  return VideoUploadMetadataSchema.parse(data);
}

export function validateVideoAsset(data: unknown): VideoAsset {
  return VideoAssetSchema.parse(data);
}

export const videoUploadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(MAX_TITLE_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().default(true),
});

export const videoUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(MAX_TITLE_LENGTH).optional(),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
});

export const videoSearchSchema = z.object({
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
  userId: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(VIDEOS_PER_PAGE),
  sortBy: z.enum(['createdAt', 'views', 'duration']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const videoQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().min(1).max(100).default(VIDEOS_PER_PAGE),
  search: z.string().optional(),
  status: z.enum(['ready', 'preparing', 'errored']).optional(),
  sort: z.enum(['created_at', 'title', 'duration']).default('created_at'),
});

export type VideoUploadInput = z.infer<typeof videoUploadSchema>;
export type VideoUpdateInput = z.infer<typeof videoUpdateSchema>;
export type VideoSearchInput = z.infer<typeof videoSearchSchema>; 