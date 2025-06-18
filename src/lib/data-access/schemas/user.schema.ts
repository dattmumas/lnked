import { z } from 'zod';

import type { Database } from '@/lib/database.types';

// Raw database type
type UserRow = Database['public']['Tables']['users']['Row'];

// Zod schema that transforms null to undefined
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().nullable().transform(val => val ?? undefined),
  username: z.string().nullable().transform(val => val ?? undefined),
  full_name: z.string().nullable().transform(val => val ?? undefined),
  avatar_url: z.string().nullable().transform(val => val ?? undefined),
  bio: z.string().nullable().transform(val => val ?? undefined),
  website: z.string().nullable().transform(val => val ?? undefined),
  location: z.string().nullable().transform(val => val ?? undefined),
  twitter: z.string().nullable().transform(val => val ?? undefined),
  github: z.string().nullable().transform(val => val ?? undefined),
  linkedin: z.string().nullable().transform(val => val ?? undefined),
  created_at: z.string(),
  updated_at: z.string(),
  stripe_customer_id: z.string().nullable().transform(val => val ?? undefined),
  preferred_language: z.string().nullable().transform(val => val ?? undefined),
  timezone: z.string().nullable().transform(val => val ?? undefined),
  notification_preferences: z.record(z.unknown()).nullable().transform(val => val ?? undefined),
  verified: z.boolean(),
  privacy_settings: z.record(z.unknown()).nullable().transform(val => val ?? undefined),
});

// Type derived from schema - all nullable fields become optional
export type User = z.infer<typeof UserSchema>;

// For inserts/updates where we need to convert back to null
export const UserInsertSchema = z.object({
  email: z.string().optional().transform(val => val ?? null),
  username: z.string().optional().transform(val => val ?? null),
  full_name: z.string().optional().transform(val => val ?? null),
  avatar_url: z.string().optional().transform(val => val ?? null),
  bio: z.string().optional().transform(val => val ?? null),
  website: z.string().optional().transform(val => val ?? null),
  location: z.string().optional().transform(val => val ?? null),
  twitter: z.string().optional().transform(val => val ?? null),
  github: z.string().optional().transform(val => val ?? null),
  linkedin: z.string().optional().transform(val => val ?? null),
  stripe_customer_id: z.string().optional().transform(val => val ?? null),
  preferred_language: z.string().optional().transform(val => val ?? null),
  timezone: z.string().optional().transform(val => val ?? null),
  notification_preferences: z.record(z.unknown()).optional().transform(val => val ?? null),
  privacy_settings: z.record(z.unknown()).optional().transform(val => val ?? null),
});

export type UserInsert = z.input<typeof UserInsertSchema>;

// Helper to parse database results
export function parseUser(data: unknown): User {
  return UserSchema.parse(data);
}

export function parseUsers(data: unknown[]): User[] {
  return data.map(parseUser);
} 