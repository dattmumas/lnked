// Universal Polymorphic Comment System Types
// Corresponds to supabase/migrations/20250106100000_create_polymorphic_comment_system.sql

import type { Enums } from '@/types/database.types';

// Entity types that can have comments
export type CommentEntityType = 'video' | 'post' | 'collective' | 'profile';

// Reaction types available for comments
export type ReactionType = Enums<'reaction_type'>;

// Report status for moderation
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

// Base comment structure from database
export interface Comment {
  id: string;
  entity_type: CommentEntityType;
  entity_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  thread_depth: number;
  reply_count: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Comment with populated author data (from RPC functions)
export interface CommentWithAuthor {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  reactions: Reaction[];
  reply_count: number;
  thread_depth: number;
  parent_id?: string;
  is_pinned?: boolean;
  created_at: string;
  updated_at: string;
  // Alias for backward compatibility
  user?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export type CommentWithUser = CommentWithAuthor;
export type CommentReactionType = ReactionType;

// Comment reaction aggregation
export interface Reaction {
  type: ReactionType;
  count: number;
}

// Individual comment reaction record
export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

// Comment report for moderation
export interface CommentReport {
  id: string;
  comment_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  moderator_id: string | null;
  resolved_at: string | null;
  created_at: string;
}

// Pinned comment
export interface CommentPin {
  id: string;
  comment_id: string;
  entity_type: CommentEntityType;
  entity_id: string;
  pinned_by: string;
  pin_order: number | null;
  created_at: string;
}

// API request types
export interface AddCommentRequest {
  entity_type: CommentEntityType;
  entity_id: string;
  content: string;
  parent_id?: string;
}

export interface AddCommentResponse {
  comment_id: string;
  thread_depth: number;
}

export interface ToggleReactionRequest {
  comment_id: string;
  reaction_type: ReactionType;
}

export interface ToggleReactionResponse {
  action_taken: 'added' | 'removed';
  reaction_counts: Reaction[];
}

export interface GetCommentsRequest {
  entity_type: CommentEntityType;
  entity_id: string;
  limit?: number;
  offset?: number;
}

export interface GetRepliesRequest {
  parent_id: string;
  limit?: number;
  offset?: number;
}

export interface ReportCommentRequest {
  comment_id: string;
  reason: string;
  details?: string;
}

export interface PinCommentRequest {
  comment_id: string;
  entity_type: CommentEntityType;
  entity_id: string;
  pin_order?: number;
}

// Comment tree structure for UI rendering
export interface CommentThread {
  comment: CommentWithAuthor;
  replies: CommentWithAuthor[];
  hasMoreReplies: boolean;
  repliesLoading: boolean;
}

// Hook return types
export interface UseCommentsReturn {
  comments: CommentThread[];
  loading: boolean;
  error: string | null;
  addComment: (content: string, parentId?: string) => Promise<void>;
  toggleReaction: (commentId: string, reactionType: ReactionType) => Promise<void>;
  loadMoreComments: () => Promise<void>;
  loadReplies: (commentId: string) => Promise<void>;
  hasMore: boolean;
}

// Entity validation helper types
export type EntityValidator = {
  [K in CommentEntityType]: (entityId: string) => Promise<boolean>;
};

// Comment sorting options
export type CommentSortOption = 'newest' | 'oldest' | 'most_liked' | 'most_replies';

// Comment filter options
export interface CommentFilters {
  sort: CommentSortOption;
  showDeleted: boolean;
  userId?: string; // Filter to specific user's comments
}

// Real-time subscription types
export interface CommentSubscriptionEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  comment: Comment;
  old?: Comment;
}

export interface CommentReactionSubscriptionEvent {
  eventType: 'INSERT' | 'DELETE';
  reaction: CommentReaction;
}

// Error types
export class CommentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommentValidationError';
  }
}

export class CommentPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommentPermissionError';
  }
}

export class CommentNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommentNotFoundError';
  }
}

// Component prop types
export interface CommentSectionProps {
  entityType: CommentEntityType;
  entityId: string;
  allowReplies?: boolean;
  maxDepth?: number;
  initialSort?: CommentSortOption;
  showReactionCounts?: boolean;
  enableReactions?: boolean;
  className?: string;
}

export interface CommentItemProps {
  comment: CommentWithAuthor;
  onReply?: (parentId: string, content: string) => void;
  onReaction?: (commentId: string, reactionType: ReactionType) => void;
  onReport?: (commentId: string, reason: string) => void;
  showReplies?: boolean;
  allowReplies?: boolean;
  className?: string;
}

export interface CommentFormProps {
  onSubmit: (content: string) => void;
  placeholder?: string;
  buttonText?: string;
  autoFocus?: boolean;
  loading?: boolean;
  className?: string;
}