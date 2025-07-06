// Centralised TypeScript types for the Chains feature.
// These are shared between the sidebar feed, composer, hooks, and API layers.

export type ChainId = string;

// Minimal author / user representation for a chain.
export interface ChainUser {
  name: string;
  username: string;
  avatar_url?: string | null;
}

// Engagement statistics for a chain post (denormalised for quick display).
export interface ChainStats {
  likes: number;
  dislikes: number;
  views: number;
  comments: number;
  replies: number;
  shares: number;
}

// Core shape of a chain item as used by the UI layer.
export interface ChainItem {
  id: ChainId;
  author_id?: string; // undefined when pre-hydrating skeletons
  user: ChainUser;
  content: string;
  timestamp: string; // already formatted for display
  type: 'post' | 'reply' | 'share';
  stats: ChainStats;
  userInteraction?: {
    liked: boolean;
    bookmarked: boolean;
  };
}

// Interaction contract supplied to ChainCard components so they can
// trigger mutations without holding their own state.
export interface ChainCardInteractions {
  likedChains: Set<ChainId>;
  dislikedChains: Set<ChainId>;
  toggleLike: (id: ChainId) => void;
  toggleDislike: (id: ChainId) => void;
  startReply: (id: ChainId) => void;
  cancelReply: () => void;
  replyingTo: ChainId | undefined;
  replyContent: string;
  setReplyContent: (val: string) => void;
  isPosting: boolean;
  submitReply: (id: ChainId) => void;
  shareChain: (id: ChainId, content: string) => void;
}

// Helper type for inserting a new chain row (client-side only).
export interface NewChainPayload {
  author_id: string;
  content: string;
  parent_chain_id?: ChainId | null; // undefined / null for root post
  status?: 'active' | 'deleted' | 'shadow_hidden';
}
