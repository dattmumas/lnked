import { z } from 'zod';

// Follow schema with null to undefined transformation
export const FollowSchema = z.object({
  follower_id: z.string(),
  following_id: z.string(),
  following_type: z.string(),
  created_at: z.string(),
});

export type Follow = z.infer<typeof FollowSchema>;

// Follow with user details
export const FollowWithUserSchema = FollowSchema.extend({
  follower: z.object({
    id: z.string(),
    username: z.string().nullable().transform(val => val ?? undefined),
    full_name: z.string().nullable().transform(val => val ?? undefined),
    avatar_url: z.string().nullable().transform(val => val ?? undefined),
  }).optional(),
  following_user: z.object({
    id: z.string(),
    username: z.string().nullable().transform(val => val ?? undefined),
    full_name: z.string().nullable().transform(val => val ?? undefined),
    avatar_url: z.string().nullable().transform(val => val ?? undefined),
  }).optional(),
});

export type FollowWithUser = z.infer<typeof FollowWithUserSchema>;

// Follow input schema
export const FollowInputSchema = z.object({
  follower_id: z.string(),
  following_id: z.string(),
  following_type: z.enum(['user', 'collective']),
});

export type FollowInput = z.infer<typeof FollowInputSchema>;

// Helper functions
export function parseFollow(data: unknown): Follow {
  return FollowSchema.parse(data);
}

export function parseFollows(data: unknown[]): Follow[] {
  return data.map(parseFollow);
}

export function parseFollowWithUser(data: unknown): FollowWithUser {
  return FollowWithUserSchema.parse(data);
}

export function parseFollowsWithUser(data: unknown[]): FollowWithUser[] {
  return data.map(parseFollowWithUser);
} 