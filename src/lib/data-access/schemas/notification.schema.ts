import { z } from 'zod';

// Notification type enum
export const NotificationTypeEnum = z.enum([
  'follow',
  'unfollow',
  'post_like',
  'post_comment',
  'comment_reply',
  'comment_like',
  'post_published',
  'collective_invite',
  'collective_join',
  'collective_leave',
  'subscription_created',
  'subscription_cancelled',
  'mention',
  'post_bookmark',
  'featured_post',
]);

// Notification schema with null to undefined transformation
export const NotificationSchema = z.object({
  id: z.string(),
  recipient_id: z.string(),
  actor_id: z.string().nullable().transform(val => val ?? undefined),
  type: NotificationTypeEnum,
  title: z.string(),
  message: z.string(),
  entity_type: z.string().nullable().transform(val => val ?? undefined),
  entity_id: z.string().nullable().transform(val => val ?? undefined),
  metadata: z.any().nullable().transform(val => val ?? undefined),
  read_at: z.string().nullable().transform(val => val ?? undefined),
  created_at: z.string().nullable().transform(val => val ?? undefined),
  updated_at: z.string().nullable().transform(val => val ?? undefined),
});

export type Notification = z.infer<typeof NotificationSchema>;

// Notification with actor info
export const NotificationWithActorSchema = NotificationSchema.extend({
  actor: z.object({
    id: z.string(),
    username: z.string().nullable().transform(val => val ?? undefined),
    full_name: z.string().nullable().transform(val => val ?? undefined),
    avatar_url: z.string().nullable().transform(val => val ?? undefined),
  }).nullable().transform(val => val ?? undefined),
});

export type NotificationWithActor = z.infer<typeof NotificationWithActorSchema>;

// Notification create schema
export const NotificationCreateSchema = z.object({
  recipient_id: z.string(),
  actor_id: z.string().optional().transform(val => val ?? null),
  type: NotificationTypeEnum,
  title: z.string(),
  message: z.string(),
  entity_type: z.string().optional().transform(val => val ?? null),
  entity_id: z.string().optional().transform(val => val ?? null),
  metadata: z.any().optional().transform(val => val ?? null),
});

export type NotificationCreate = z.input<typeof NotificationCreateSchema>;

// Helper functions
export function parseNotification(data: unknown): Notification {
  return NotificationSchema.parse(data);
}

export function parseNotifications(data: unknown[]): Notification[] {
  return data.map(parseNotification);
}

export function parseNotificationWithActor(data: unknown): NotificationWithActor {
  return NotificationWithActorSchema.parse(data);
}

export function parseNotificationsWithActor(data: unknown[]): NotificationWithActor[] {
  return data.map(parseNotificationWithActor);
} 