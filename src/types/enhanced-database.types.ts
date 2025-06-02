import { Database } from '@/lib/database.types';

// Enhanced database types that extend the current schema
// These types represent the target schema after post_collectives junction table is added

// Post-Collective junction table (to be added to production)
export interface PostCollectiveRow {
  id: string;
  post_id: string;
  collective_id: string;
  status: 'draft' | 'published' | 'pending_approval' | 'rejected';
  shared_at: string;
  shared_by: string;
  metadata: Record<string, unknown>;
  display_order: number;
}

export interface PostCollectiveInsert {
  id?: string;
  post_id: string;
  collective_id: string;
  status?: 'draft' | 'published' | 'pending_approval' | 'rejected';
  shared_at?: string;
  shared_by: string;
  metadata?: Record<string, unknown>;
  display_order?: number;
}

export interface PostCollectiveUpdate {
  id?: string;
  post_id?: string;
  collective_id?: string;
  status?: 'draft' | 'published' | 'pending_approval' | 'rejected';
  shared_at?: string;
  shared_by?: string;
  metadata?: Record<string, unknown>;
  display_order?: number;
}

// Enhanced Post types with multi-collective support
export interface EnhancedPostFormData {
  id?: string;
  title: string;
  content: string;
  subtitle?: string;
  author?: string;
  seo_title?: string;
  meta_description?: string;
  thumbnail_url?: string;
  post_type: Database['public']['Enums']['post_type_enum'];
  metadata: Record<string, unknown>;
  is_public: boolean;
  status: Database['public']['Enums']['post_status_type'];
  
  // Legacy field for backward compatibility
  collective_id?: string;
  
  // New multi-collective fields
  selected_collectives: string[];
  collective_sharing_settings?: Record<string, {
    status: 'draft' | 'published' | 'pending_approval' | 'rejected';
    metadata?: Record<string, unknown>;
    display_order?: number;
  }>;
  
  published_at?: string;
}

// Collective with user permission information
export interface CollectiveWithPermission {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  user_role: Database['public']['Enums']['collective_member_role'];
  can_post: boolean;
  member_count?: number;
}

// Post-Collective association with collective details
export interface PostCollectiveWithDetails {
  id: string;
  post_id: string;
  collective_id: string;
  status: 'draft' | 'published' | 'pending_approval' | 'rejected';
  shared_at: string;
  shared_by: string;
  metadata: Record<string, unknown>;
  display_order: number;
  
  // Collective details
  collective: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    description: string | null;
  };
}

// API Response types
export interface CollectiveMembershipResponse {
  collective_id: string;
  collective_name: string;
  collective_slug: string;
  collective_logo_url: string | null;
  collective_description: string | null;
  user_role: Database['public']['Enums']['collective_member_role'];
  member_count: number;
}

export interface PostCollectiveServiceResponse {
  success: boolean;
  post_id?: string;
  collective_associations?: PostCollectiveRow[];
  errors?: Array<{
    collective_id: string;
    collective_name: string;
    error: string;
  }>;
}

// Permission checking utilities
export type PostingRole = 'author' | 'editor' | 'admin' | 'owner';

export const POSTING_ROLES: PostingRole[] = ['author', 'editor', 'admin', 'owner'];

export function canUserPostToCollective(
  userRole: Database['public']['Enums']['collective_member_role']
): boolean {
  return POSTING_ROLES.includes(userRole as PostingRole);
}

// Sharing settings for collective-specific customizations
export interface CollectiveSharingSettings {
  status: 'draft' | 'published' | 'pending_approval' | 'rejected';
  metadata?: Record<string, unknown>;
  display_order?: number;
  auto_publish?: boolean;
  require_approval?: boolean;
  custom_metadata?: Record<string, unknown>;
  display_priority?: number;
}

// Form validation types
export interface CollectiveSelectionFormData {
  selected_collectives: string[];
  sharing_settings: Record<string, CollectiveSharingSettings>;
}

// Error types for comprehensive error handling
export interface PostCollectiveError {
  type: 'permission' | 'validation' | 'database' | 'network';
  collective_id?: string;
  collective_name?: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PostCollectiveValidationResult {
  valid: boolean;
  errors: PostCollectiveError[];
  warnings: Array<{
    collective_id: string;
    collective_name: string;
    message: string;
  }>;
}

// Enhanced database interface that extends current schema
export interface EnhancedDatabase extends Database {
  public: Database['public'] & {
    Tables: Database['public']['Tables'] & {
      post_collectives: {
        Row: PostCollectiveRow;
        Insert: PostCollectiveInsert;
        Update: PostCollectiveUpdate;
        Relationships: [
          {
            foreignKeyName: "post_collectives_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_collectives_collective_id_fkey";
            columns: ["collective_id"];
            isOneToOne: false;
            referencedRelation: "collectives";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_collectives_shared_by_fkey";
            columns: ["shared_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
  };
}

// Type utilities for working with enhanced types
export type EnhancedTables<T extends keyof EnhancedDatabase['public']['Tables']> = 
  EnhancedDatabase['public']['Tables'][T]['Row'];

export type EnhancedTablesInsert<T extends keyof EnhancedDatabase['public']['Tables']> = 
  EnhancedDatabase['public']['Tables'][T]['Insert'];

export type EnhancedTablesUpdate<T extends keyof EnhancedDatabase['public']['Tables']> = 
  EnhancedDatabase['public']['Tables'][T]['Update']; 