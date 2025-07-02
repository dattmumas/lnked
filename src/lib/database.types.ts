export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      api_cache: {
        Row: {
          cache_key: string;
          created_at: string;
          data: Json;
        };
        Insert: {
          cache_key: string;
          created_at?: string;
          data: Json;
        };
        Update: {
          cache_key?: string;
          created_at?: string;
          data?: Json;
        };
        Relationships: [];
      };
      chain_bookmarks: {
        Row: {
          chain_id: string;
          created_at: string | null;
          user_id: string;
        };
        Insert: {
          chain_id: string;
          created_at?: string | null;
          user_id: string;
        };
        Update: {
          chain_id?: string;
          created_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chain_bookmarks_chain_id_fkey';
            columns: ['chain_id'];
            isOneToOne: false;
            referencedRelation: 'chains';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chain_bookmarks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      chain_reactions: {
        Row: {
          chain_id: string;
          created_at: string | null;
          reaction: Database['public']['Enums']['chain_reaction_type'];
          user_id: string;
        };
        Insert: {
          chain_id: string;
          created_at?: string | null;
          reaction?: Database['public']['Enums']['chain_reaction_type'];
          user_id: string;
        };
        Update: {
          chain_id?: string;
          created_at?: string | null;
          reaction?: Database['public']['Enums']['chain_reaction_type'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chain_reactions_chain_id_fkey';
            columns: ['chain_id'];
            isOneToOne: false;
            referencedRelation: 'chains';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chain_reactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      chains: {
        Row: {
          attachments: Json | null;
          author_id: string;
          collective_id: string | null;
          content: string;
          created_at: string;
          id: string;
          like_count: number;
          meta: Json | null;
          parent_chain_id: string | null;
          reply_count: number;
          status: Database['public']['Enums']['chain_status'];
          tsv: unknown | null;
          updated_at: string;
          visibility: Database['public']['Enums']['chain_visibility'];
        };
        Insert: {
          attachments?: Json | null;
          author_id: string;
          collective_id?: string | null;
          content: string;
          created_at?: string;
          id?: string;
          like_count?: number;
          meta?: Json | null;
          parent_chain_id?: string | null;
          reply_count?: number;
          status?: Database['public']['Enums']['chain_status'];
          tsv?: unknown | null;
          updated_at?: string;
          visibility?: Database['public']['Enums']['chain_visibility'];
        };
        Update: {
          attachments?: Json | null;
          author_id?: string;
          collective_id?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          like_count?: number;
          meta?: Json | null;
          parent_chain_id?: string | null;
          reply_count?: number;
          status?: Database['public']['Enums']['chain_status'];
          tsv?: unknown | null;
          updated_at?: string;
          visibility?: Database['public']['Enums']['chain_visibility'];
        };
        Relationships: [
          {
            foreignKeyName: 'chains_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chains_collective_id_fkey';
            columns: ['collective_id'];
            isOneToOne: false;
            referencedRelation: 'collectives';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chains_parent_chain_id_fkey';
            columns: ['parent_chain_id'];
            isOneToOne: false;
            referencedRelation: 'chains';
            referencedColumns: ['id'];
          },
        ];
      };
      checkout_sessions: {
        Row: {
          completed_at: string | null;
          created_at: string;
          id: string;
          status: string;
          stripe_session_id: string;
          stripe_subscription_id: string | null;
          target_entity_id: string;
          target_entity_type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          status?: string;
          stripe_session_id: string;
          stripe_subscription_id?: string | null;
          target_entity_id: string;
          target_entity_type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          status?: string;
          stripe_session_id?: string;
          stripe_subscription_id?: string | null;
          target_entity_id?: string;
          target_entity_type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'checkout_sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      collective_invites: {
        Row: {
          accepted_at: string | null;
          collective_id: string;
          created_at: string;
          email: string;
          id: string;
          invite_code: string;
          invited_by_user_id: string | null;
          role: string;
          status: string;
        };
        Insert: {
          accepted_at?: string | null;
          collective_id: string;
          created_at?: string;
          email: string;
          id?: string;
          invite_code: string;
          invited_by_user_id?: string | null;
          role: string;
          status?: string;
        };
        Update: {
          accepted_at?: string | null;
          collective_id?: string;
          created_at?: string;
          email?: string;
          id?: string;
          invite_code?: string;
          invited_by_user_id?: string | null;
          role?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'collective_invites_collective_id_fkey';
            columns: ['collective_id'];
            isOneToOne: false;
            referencedRelation: 'collectives';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'collective_invites_invited_by_user_id_fkey';
            columns: ['invited_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      collective_members: {
        Row: {
          collective_id: string;
          created_at: string;
          id: string;
          member_id: string;
          member_type: Database['public']['Enums']['member_entity_type'];
          role: Database['public']['Enums']['collective_member_role'];
          share_percentage: number | null;
          updated_at: string;
        };
        Insert: {
          collective_id: string;
          created_at?: string;
          id?: string;
          member_id: string;
          member_type?: Database['public']['Enums']['member_entity_type'];
          role?: Database['public']['Enums']['collective_member_role'];
          share_percentage?: number | null;
          updated_at?: string;
        };
        Update: {
          collective_id?: string;
          created_at?: string;
          id?: string;
          member_id?: string;
          member_type?: Database['public']['Enums']['member_entity_type'];
          role?: Database['public']['Enums']['collective_member_role'];
          share_percentage?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'collective_members_collective_id_fkey';
            columns: ['collective_id'];
            isOneToOne: false;
            referencedRelation: 'collectives';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'collective_members_user_id_fkey';
            columns: ['member_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      collectives: {
        Row: {
          cover_image_url: string | null;
          created_at: string;
          description: string | null;
          follower_count: number | null;
          governance_model: string | null;
          id: string;
          intro_video_url: string | null;
          is_public: boolean | null;
          logo_url: string | null;
          member_count: number | null;
          name: string;
          owner_id: string;
          pinned_post_id: string | null;
          slug: string;
          stripe_account_id: string | null;
          stripe_account_type: string | null;
          stripe_customer_id: string | null;
          tags: string[] | null;
          tsv: unknown | null;
          updated_at: string | null;
        };
        Insert: {
          cover_image_url?: string | null;
          created_at?: string;
          description?: string | null;
          follower_count?: number | null;
          governance_model?: string | null;
          id?: string;
          intro_video_url?: string | null;
          is_public?: boolean | null;
          logo_url?: string | null;
          member_count?: number | null;
          name: string;
          owner_id: string;
          pinned_post_id?: string | null;
          slug: string;
          stripe_account_id?: string | null;
          stripe_account_type?: string | null;
          stripe_customer_id?: string | null;
          tags?: string[] | null;
          tsv?: unknown | null;
          updated_at?: string | null;
        };
        Update: {
          cover_image_url?: string | null;
          created_at?: string;
          description?: string | null;
          follower_count?: number | null;
          governance_model?: string | null;
          id?: string;
          intro_video_url?: string | null;
          is_public?: boolean | null;
          logo_url?: string | null;
          member_count?: number | null;
          name?: string;
          owner_id?: string;
          pinned_post_id?: string | null;
          slug?: string;
          stripe_account_id?: string | null;
          stripe_account_type?: string | null;
          stripe_customer_id?: string | null;
          tags?: string[] | null;
          tsv?: unknown | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'collectives_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'collectives_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'collectives_pinned_post_id_fkey';
            columns: ['pinned_post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
        ];
      };
      comment_pins: {
        Row: {
          comment_id: string;
          created_at: string | null;
          entity_id: string;
          entity_type: Database['public']['Enums']['comment_entity_type'];
          id: string;
          pin_order: number | null;
          pinned_by: string;
        };
        Insert: {
          comment_id: string;
          created_at?: string | null;
          entity_id: string;
          entity_type: Database['public']['Enums']['comment_entity_type'];
          id?: string;
          pin_order?: number | null;
          pinned_by: string;
        };
        Update: {
          comment_id?: string;
          created_at?: string | null;
          entity_id?: string;
          entity_type?: Database['public']['Enums']['comment_entity_type'];
          id?: string;
          pin_order?: number | null;
          pinned_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comment_pins_pinned_by_fkey';
            columns: ['pinned_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comment_pins_v2_comment_id_fkey';
            columns: ['comment_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
        ];
      };
      comment_reactions: {
        Row: {
          comment_id: string;
          created_at: string | null;
          id: string;
          reaction_type: Database['public']['Enums']['reaction_type'];
          user_id: string;
        };
        Insert: {
          comment_id: string;
          created_at?: string | null;
          id?: string;
          reaction_type: Database['public']['Enums']['reaction_type'];
          user_id: string;
        };
        Update: {
          comment_id?: string;
          created_at?: string | null;
          id?: string;
          reaction_type?: Database['public']['Enums']['reaction_type'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comment_reactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comment_reactions_v2_comment_id_fkey';
            columns: ['comment_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
        ];
      };
      comment_reports: {
        Row: {
          comment_id: string;
          created_at: string | null;
          details: string | null;
          id: string;
          moderator_id: string | null;
          reason: string;
          reporter_id: string;
          resolved_at: string | null;
          status: Database['public']['Enums']['report_status'] | null;
        };
        Insert: {
          comment_id: string;
          created_at?: string | null;
          details?: string | null;
          id?: string;
          moderator_id?: string | null;
          reason: string;
          reporter_id: string;
          resolved_at?: string | null;
          status?: Database['public']['Enums']['report_status'] | null;
        };
        Update: {
          comment_id?: string;
          created_at?: string | null;
          details?: string | null;
          id?: string;
          moderator_id?: string | null;
          reason?: string;
          reporter_id?: string;
          resolved_at?: string | null;
          status?: Database['public']['Enums']['report_status'] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'comment_reports_moderator_id_fkey';
            columns: ['moderator_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comment_reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comment_reports_v2_comment_id_fkey';
            columns: ['comment_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
        ];
      };
      comments: {
        Row: {
          author_id: string;
          content: string;
          created_at: string | null;
          deleted_at: string | null;
          entity_id: string;
          entity_type: Database['public']['Enums']['comment_entity_type'];
          id: string;
          is_pinned: boolean | null;
          metadata: Json | null;
          parent_id: string | null;
          reply_count: number | null;
          tenant_id: string;
          thread_depth: number | null;
          updated_at: string | null;
        };
        Insert: {
          author_id: string;
          content: string;
          created_at?: string | null;
          deleted_at?: string | null;
          entity_id: string;
          entity_type: Database['public']['Enums']['comment_entity_type'];
          id?: string;
          is_pinned?: boolean | null;
          metadata?: Json | null;
          parent_id?: string | null;
          reply_count?: number | null;
          tenant_id: string;
          thread_depth?: number | null;
          updated_at?: string | null;
        };
        Update: {
          author_id?: string;
          content?: string;
          created_at?: string | null;
          deleted_at?: string | null;
          entity_id?: string;
          entity_type?: Database['public']['Enums']['comment_entity_type'];
          id?: string;
          is_pinned?: boolean | null;
          metadata?: Json | null;
          parent_id?: string | null;
          reply_count?: number | null;
          tenant_id?: string;
          thread_depth?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'comments_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_v2_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
        ];
      };
      content_metadata: {
        Row: {
          category: string | null;
          content_id: string;
          content_type: string;
          created_at: string | null;
          description: string | null;
          duration: number | null;
          freshness_score: number | null;
          id: string;
          language: string | null;
          popularity_score: number | null;
          quality_score: number | null;
          tags: string[] | null;
          thumbnail_url: string | null;
          title: string;
          updated_at: string | null;
          word_count: number | null;
        };
        Insert: {
          category?: string | null;
          content_id: string;
          content_type: string;
          created_at?: string | null;
          description?: string | null;
          duration?: number | null;
          freshness_score?: number | null;
          id?: string;
          language?: string | null;
          popularity_score?: number | null;
          quality_score?: number | null;
          tags?: string[] | null;
          thumbnail_url?: string | null;
          title: string;
          updated_at?: string | null;
          word_count?: number | null;
        };
        Update: {
          category?: string | null;
          content_id?: string;
          content_type?: string;
          created_at?: string | null;
          description?: string | null;
          duration?: number | null;
          freshness_score?: number | null;
          id?: string;
          language?: string | null;
          popularity_score?: number | null;
          quality_score?: number | null;
          tags?: string[] | null;
          thumbnail_url?: string | null;
          title?: string;
          updated_at?: string | null;
          word_count?: number | null;
        };
        Relationships: [];
      };
      conversation_participants: {
        Row: {
          conversation_id: string | null;
          deleted_at: string | null;
          id: string;
          is_muted: boolean | null;
          is_pinned: boolean | null;
          joined_at: string | null;
          last_read_at: string | null;
          role: string | null;
          user_id: string | null;
        };
        Insert: {
          conversation_id?: string | null;
          deleted_at?: string | null;
          id?: string;
          is_muted?: boolean | null;
          is_pinned?: boolean | null;
          joined_at?: string | null;
          last_read_at?: string | null;
          role?: string | null;
          user_id?: string | null;
        };
        Update: {
          conversation_id?: string | null;
          deleted_at?: string | null;
          id?: string;
          is_muted?: boolean | null;
          is_pinned?: boolean | null;
          joined_at?: string | null;
          last_read_at?: string | null;
          role?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'conversation_participants_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'channels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversation_participants_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversation_participants_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      conversations: {
        Row: {
          archived: boolean | null;
          collective_id: string | null;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          direct_conversation_hash: string | null;
          id: string;
          is_private: boolean | null;
          last_message_at: string | null;
          tenant_id: string | null;
          title: string | null;
          type: string;
          unique_group_hash: string | null;
          updated_at: string | null;
        };
        Insert: {
          archived?: boolean | null;
          collective_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          direct_conversation_hash?: string | null;
          id?: string;
          is_private?: boolean | null;
          last_message_at?: string | null;
          tenant_id?: string | null;
          title?: string | null;
          type?: string;
          unique_group_hash?: string | null;
          updated_at?: string | null;
        };
        Update: {
          archived?: boolean | null;
          collective_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          direct_conversation_hash?: string | null;
          id?: string;
          is_private?: boolean | null;
          last_message_at?: string | null;
          tenant_id?: string | null;
          title?: string | null;
          type?: string;
          unique_group_hash?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_collective_id_fkey';
            columns: ['collective_id'];
            isOneToOne: false;
            referencedRelation: 'collectives';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          stripe_customer_id: string;
        };
        Insert: {
          id: string;
          stripe_customer_id: string;
        };
        Update: {
          id?: string;
          stripe_customer_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'customers_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      editor_drafts: {
        Row: {
          content: string | null;
          content_hash: string | null;
          content_json: Json | null;
          created_at: string | null;
          has_legacy_html: boolean;
          id: string;
          last_saved_at: string | null;
          metadata: Json | null;
          tenant_id: string;
          title: string | null;
          user_id: string;
        };
        Insert: {
          content?: string | null;
          content_hash?: string | null;
          content_json?: Json | null;
          created_at?: string | null;
          has_legacy_html?: boolean;
          id?: string;
          last_saved_at?: string | null;
          metadata?: Json | null;
          tenant_id: string;
          title?: string | null;
          user_id: string;
        };
        Update: {
          content?: string | null;
          content_hash?: string | null;
          content_json?: Json | null;
          created_at?: string | null;
          has_legacy_html?: boolean;
          id?: string;
          last_saved_at?: string | null;
          metadata?: Json | null;
          tenant_id?: string;
          title?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'editor_drafts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      featured_posts: {
        Row: {
          created_at: string | null;
          display_order: number;
          id: string;
          owner_id: string;
          owner_type: string;
          post_id: string;
        };
        Insert: {
          created_at?: string | null;
          display_order?: number;
          id?: string;
          owner_id: string;
          owner_type: string;
          post_id: string;
        };
        Update: {
          created_at?: string | null;
          display_order?: number;
          id?: string;
          owner_id?: string;
          owner_type?: string;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'featured_posts_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
        ];
      };
      follows: {
        Row: {
          created_at: string;
          follower_id: string;
          following_id: string;
          following_type: string;
        };
        Insert: {
          created_at?: string;
          follower_id: string;
          following_id: string;
          following_type: string;
        };
        Update: {
          created_at?: string;
          follower_id?: string;
          following_id?: string;
          following_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'follows_follower_id_fkey';
            columns: ['follower_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      interactions: {
        Row: {
          created_at: string;
          entity_id: string;
          entity_type: Database['public']['Enums']['interaction_entity_type'];
          id: string;
          interaction_type: Database['public']['Enums']['interaction_type'];
          metadata: Json | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          entity_id: string;
          entity_type: Database['public']['Enums']['interaction_entity_type'];
          id?: string;
          interaction_type: Database['public']['Enums']['interaction_type'];
          metadata?: Json | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          entity_id?: string;
          entity_type?: Database['public']['Enums']['interaction_entity_type'];
          id?: string;
          interaction_type?: Database['public']['Enums']['interaction_type'];
          metadata?: Json | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'interactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      live_streams: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          ended_at: string | null;
          id: string;
          mux_playback_id: string | null;
          mux_stream_id: string;
          mux_stream_key: string;
          started_at: string | null;
          status: string | null;
          stream_url: string | null;
          title: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          ended_at?: string | null;
          id?: string;
          mux_playback_id?: string | null;
          mux_stream_id: string;
          mux_stream_key: string;
          started_at?: string | null;
          status?: string | null;
          stream_url?: string | null;
          title?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          ended_at?: string | null;
          id?: string;
          mux_playback_id?: string | null;
          mux_stream_id?: string;
          mux_stream_key?: string;
          started_at?: string | null;
          status?: string | null;
          stream_url?: string | null;
          title?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'live_streams_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      message_reactions: {
        Row: {
          created_at: string | null;
          emoji: string;
          id: string;
          message_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          emoji: string;
          id?: string;
          message_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          emoji?: string;
          id?: string;
          message_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'message_reactions_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_reactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      message_read_receipts: {
        Row: {
          id: string;
          message_id: string | null;
          read_at: string | null;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          message_id?: string | null;
          read_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          message_id?: string | null;
          read_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'message_read_receipts_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_read_receipts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          content: string;
          conversation_id: string | null;
          created_at: string | null;
          deleted_at: string | null;
          edited_at: string | null;
          id: string;
          message_type: string | null;
          metadata: Json | null;
          reply_to_id: string | null;
          sender_id: string | null;
          tenant_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          content: string;
          conversation_id?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          message_type?: string | null;
          metadata?: Json | null;
          reply_to_id?: string | null;
          sender_id?: string | null;
          tenant_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          content?: string;
          conversation_id?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          message_type?: string | null;
          metadata?: Json | null;
          reply_to_id?: string | null;
          sender_id?: string | null;
          tenant_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'channels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_reply_to_id_fkey';
            columns: ['reply_to_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      mux_webhooks: {
        Row: {
          created_at: string | null;
          event_type: string;
          id: string;
          mux_asset_id: string | null;
          mux_stream_id: string | null;
          payload: Json | null;
          processed: boolean | null;
          processed_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          event_type: string;
          id?: string;
          mux_asset_id?: string | null;
          mux_stream_id?: string | null;
          payload?: Json | null;
          processed?: boolean | null;
          processed_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          event_type?: string;
          id?: string;
          mux_asset_id?: string | null;
          mux_stream_id?: string | null;
          payload?: Json | null;
          processed?: boolean | null;
          processed_at?: string | null;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          created_at: string | null;
          email_enabled: boolean | null;
          id: string;
          in_app_enabled: boolean | null;
          notification_type: Database['public']['Enums']['notification_type'];
          push_enabled: boolean | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          email_enabled?: boolean | null;
          id?: string;
          in_app_enabled?: boolean | null;
          notification_type: Database['public']['Enums']['notification_type'];
          push_enabled?: boolean | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          email_enabled?: boolean | null;
          id?: string;
          in_app_enabled?: boolean | null;
          notification_type?: Database['public']['Enums']['notification_type'];
          push_enabled?: boolean | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_preferences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          actor_id: string | null;
          created_at: string | null;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
          message: string;
          metadata: Json | null;
          read_at: string | null;
          recipient_id: string;
          tenant_id: string;
          title: string;
          type: Database['public']['Enums']['notification_type'];
          updated_at: string | null;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          message: string;
          metadata?: Json | null;
          read_at?: string | null;
          recipient_id: string;
          tenant_id: string;
          title: string;
          type: Database['public']['Enums']['notification_type'];
          updated_at?: string | null;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          message?: string;
          metadata?: Json | null;
          read_at?: string | null;
          recipient_id?: string;
          tenant_id?: string;
          title?: string;
          type?: Database['public']['Enums']['notification_type'];
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      post_bookmarks: {
        Row: {
          created_at: string | null;
          post_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          post_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_bookmarks_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_bookmarks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      post_collectives: {
        Row: {
          collective_id: string;
          display_order: number | null;
          id: string;
          metadata: Json | null;
          post_id: string;
          shared_at: string | null;
          shared_by: string;
          status: string | null;
        };
        Insert: {
          collective_id: string;
          display_order?: number | null;
          id?: string;
          metadata?: Json | null;
          post_id: string;
          shared_at?: string | null;
          shared_by: string;
          status?: string | null;
        };
        Update: {
          collective_id?: string;
          display_order?: number | null;
          id?: string;
          metadata?: Json | null;
          post_id?: string;
          shared_at?: string | null;
          shared_by?: string;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'post_collectives_collective_id_fkey';
            columns: ['collective_id'];
            isOneToOne: false;
            referencedRelation: 'collectives';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_collectives_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_collectives_shared_by_fkey';
            columns: ['shared_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      post_reactions: {
        Row: {
          created_at: string;
          post_id: string;
          tenant_id: string;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          post_id: string;
          tenant_id: string;
          type?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          post_id?: string;
          tenant_id?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'likes_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'likes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_reactions_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      post_slug_history: {
        Row: {
          changed_at: string;
          changed_by: string | null;
          id: string;
          new_slug: string;
          old_slug: string;
          post_id: string;
          tenant_id: string;
        };
        Insert: {
          changed_at?: string;
          changed_by?: string | null;
          id?: string;
          new_slug: string;
          old_slug: string;
          post_id: string;
          tenant_id: string;
        };
        Update: {
          changed_at?: string;
          changed_by?: string | null;
          id?: string;
          new_slug?: string;
          old_slug?: string;
          post_id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_slug_history_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_slug_history_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      post_views: {
        Row: {
          id: string;
          post_id: string;
          user_id: string | null;
          viewed_at: string | null;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id?: string | null;
          viewed_at?: string | null;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string | null;
          viewed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'post_views_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_views_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      posts: {
        Row: {
          author: string | null;
          author_id: string;
          collective_id: string | null;
          content: string | null;
          created_at: string;
          dislike_count: number | null;
          id: string;
          is_public: boolean;
          like_count: number;
          meta_description: string | null;
          metadata: Json;
          post_type: Database['public']['Enums']['post_type_enum'];
          published_at: string | null;
          seo_title: string | null;
          sharing_settings: Json | null;
          slug: string;
          status: Database['public']['Enums']['post_status_type'];
          subtitle: string | null;
          tenant_id: string;
          thumbnail_url: string | null;
          title: string;
          tsv: unknown | null;
          updated_at: string | null;
          video_id: string | null;
          view_count: number | null;
        };
        Insert: {
          author?: string | null;
          author_id: string;
          collective_id?: string | null;
          content?: string | null;
          created_at?: string;
          dislike_count?: number | null;
          id?: string;
          is_public?: boolean;
          like_count?: number;
          meta_description?: string | null;
          metadata?: Json;
          post_type?: Database['public']['Enums']['post_type_enum'];
          published_at?: string | null;
          seo_title?: string | null;
          sharing_settings?: Json | null;
          slug: string;
          status?: Database['public']['Enums']['post_status_type'];
          subtitle?: string | null;
          tenant_id: string;
          thumbnail_url?: string | null;
          title: string;
          tsv?: unknown | null;
          updated_at?: string | null;
          video_id?: string | null;
          view_count?: number | null;
        };
        Update: {
          author?: string | null;
          author_id?: string;
          collective_id?: string | null;
          content?: string | null;
          created_at?: string;
          dislike_count?: number | null;
          id?: string;
          is_public?: boolean;
          like_count?: number;
          meta_description?: string | null;
          metadata?: Json;
          post_type?: Database['public']['Enums']['post_type_enum'];
          published_at?: string | null;
          seo_title?: string | null;
          sharing_settings?: Json | null;
          slug?: string;
          status?: Database['public']['Enums']['post_status_type'];
          subtitle?: string | null;
          tenant_id?: string;
          thumbnail_url?: string | null;
          title?: string;
          tsv?: unknown | null;
          updated_at?: string | null;
          video_id?: string | null;
          view_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'posts_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'posts_collective_id_fkey';
            columns: ['collective_id'];
            isOneToOne: false;
            referencedRelation: 'collectives';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'posts_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'posts_video_id_fkey';
            columns: ['video_id'];
            isOneToOne: false;
            referencedRelation: 'video_assets';
            referencedColumns: ['id'];
          },
        ];
      };
      prices: {
        Row: {
          active: boolean | null;
          currency: string | null;
          description: string | null;
          id: string;
          interval: Database['public']['Enums']['price_interval'] | null;
          interval_count: number | null;
          metadata: Json | null;
          product_id: string | null;
          trial_period_days: number | null;
          type: Database['public']['Enums']['price_type'] | null;
          unit_amount: number | null;
        };
        Insert: {
          active?: boolean | null;
          currency?: string | null;
          description?: string | null;
          id: string;
          interval?: Database['public']['Enums']['price_interval'] | null;
          interval_count?: number | null;
          metadata?: Json | null;
          product_id?: string | null;
          trial_period_days?: number | null;
          type?: Database['public']['Enums']['price_type'] | null;
          unit_amount?: number | null;
        };
        Update: {
          active?: boolean | null;
          currency?: string | null;
          description?: string | null;
          id?: string;
          interval?: Database['public']['Enums']['price_interval'] | null;
          interval_count?: number | null;
          metadata?: Json | null;
          product_id?: string | null;
          trial_period_days?: number | null;
          type?: Database['public']['Enums']['price_type'] | null;
          unit_amount?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'prices_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      products: {
        Row: {
          active: boolean | null;
          collective_id: string | null;
          description: string | null;
          id: string;
          metadata: Json | null;
          name: string | null;
        };
        Insert: {
          active?: boolean | null;
          collective_id?: string | null;
          description?: string | null;
          id: string;
          metadata?: Json | null;
          name?: string | null;
        };
        Update: {
          active?: boolean | null;
          collective_id?: string | null;
          description?: string | null;
          id?: string;
          metadata?: Json | null;
          name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'products_collective_id_fkey';
            columns: ['collective_id'];
            isOneToOne: false;
            referencedRelation: 'collectives';
            referencedColumns: ['id'];
          },
        ];
      };
      recommendation_cache: {
        Row: {
          algorithm_version: string | null;
          cache_key: string;
          cache_type: string;
          created_at: string | null;
          expires_at: string | null;
          id: string;
          metadata: Json | null;
          recommendations: Json;
          user_id: string | null;
        };
        Insert: {
          algorithm_version?: string | null;
          cache_key: string;
          cache_type: string;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          metadata?: Json | null;
          recommendations: Json;
          user_id?: string | null;
        };
        Update: {
          algorithm_version?: string | null;
          cache_key?: string;
          cache_type?: string;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          metadata?: Json | null;
          recommendations?: Json;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'recommendation_cache_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      recommendations: {
        Row: {
          created_at: string;
          score: number;
          suggested_collective_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          score: number;
          suggested_collective_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          score?: number;
          suggested_collective_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recommendations_suggested_collective_id_fkey';
            columns: ['suggested_collective_id'];
            isOneToOne: false;
            referencedRelation: 'collectives';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recommendations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      subscription_plans: {
        Row: {
          active: boolean | null;
          benefits: Json | null;
          collective_id: string;
          created_at: string | null;
          id: string;
          monthly_cost: number;
          name: string;
          stripe_price_id: string;
          updated_at: string | null;
        };
        Insert: {
          active?: boolean | null;
          benefits?: Json | null;
          collective_id: string;
          created_at?: string | null;
          id?: string;
          monthly_cost: number;
          name: string;
          stripe_price_id: string;
          updated_at?: string | null;
        };
        Update: {
          active?: boolean | null;
          benefits?: Json | null;
          collective_id?: string;
          created_at?: string | null;
          id?: string;
          monthly_cost?: number;
          name?: string;
          stripe_price_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'subscription_plans_collective_id_fkey';
            columns: ['collective_id'];
            isOneToOne: false;
            referencedRelation: 'collectives';
            referencedColumns: ['id'];
          },
        ];
      };
      subscriptions: {
        Row: {
          cancel_at: string | null;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          created: string;
          current_period_end: string;
          current_period_start: string;
          ended_at: string | null;
          id: string;
          inserted_at: string;
          metadata: Json | null;
          quantity: number | null;
          status: Database['public']['Enums']['subscription_status'];
          stripe_price_id: string | null;
          target_entity_id: string;
          target_entity_type: Database['public']['Enums']['subscription_target_type'];
          trial_end: string | null;
          trial_start: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cancel_at?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          created: string;
          current_period_end: string;
          current_period_start: string;
          ended_at?: string | null;
          id: string;
          inserted_at?: string;
          metadata?: Json | null;
          quantity?: number | null;
          status: Database['public']['Enums']['subscription_status'];
          stripe_price_id?: string | null;
          target_entity_id: string;
          target_entity_type: Database['public']['Enums']['subscription_target_type'];
          trial_end?: string | null;
          trial_start?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cancel_at?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          created?: string;
          current_period_end?: string;
          current_period_start?: string;
          ended_at?: string | null;
          id?: string;
          inserted_at?: string;
          metadata?: Json | null;
          quantity?: number | null;
          status?: Database['public']['Enums']['subscription_status'];
          stripe_price_id?: string | null;
          target_entity_id?: string;
          target_entity_type?: Database['public']['Enums']['subscription_target_type'];
          trial_end?: string | null;
          trial_start?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      tenant_members: {
        Row: {
          id: string;
          joined_at: string | null;
          role: Database['public']['Enums']['member_role'];
          tenant_id: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          joined_at?: string | null;
          role?: Database['public']['Enums']['member_role'];
          tenant_id: string;
          user_id: string;
        };
        Update: {
          id?: string;
          joined_at?: string | null;
          role?: Database['public']['Enums']['member_role'];
          tenant_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tenant_members_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      tenants: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          is_public: boolean | null;
          member_count: number | null;
          name: string;
          slug: string;
          type: Database['public']['Enums']['tenant_type'];
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_public?: boolean | null;
          member_count?: number | null;
          name: string;
          slug: string;
          type?: Database['public']['Enums']['tenant_type'];
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_public?: boolean | null;
          member_count?: number | null;
          name?: string;
          slug?: string;
          type?: Database['public']['Enums']['tenant_type'];
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          autoplay_videos: boolean | null;
          content_type_weights: Json | null;
          created_at: string | null;
          hide_seen_content: boolean | null;
          interested_topics: string[] | null;
          muted_authors: string[] | null;
          muted_collectives: string[] | null;
          muted_topics: string[] | null;
          prefer_following: boolean | null;
          prefer_popular: boolean | null;
          prefer_recent: boolean | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          autoplay_videos?: boolean | null;
          content_type_weights?: Json | null;
          created_at?: string | null;
          hide_seen_content?: boolean | null;
          interested_topics?: string[] | null;
          muted_authors?: string[] | null;
          muted_collectives?: string[] | null;
          muted_topics?: string[] | null;
          prefer_following?: boolean | null;
          prefer_popular?: boolean | null;
          prefer_recent?: boolean | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          autoplay_videos?: boolean | null;
          content_type_weights?: Json | null;
          created_at?: string | null;
          hide_seen_content?: boolean | null;
          interested_topics?: string[] | null;
          muted_authors?: string[] | null;
          muted_collectives?: string[] | null;
          muted_topics?: string[] | null;
          prefer_following?: boolean | null;
          prefer_popular?: boolean | null;
          prefer_recent?: boolean | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_preferences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          cover_image_url: string | null;
          created_at: string | null;
          embedding: string | null;
          follower_count: number | null;
          following_count: number | null;
          full_name: string | null;
          id: string;
          is_profile_public: boolean | null;
          pinned_post_id: string | null;
          post_count: number | null;
          role: string | null;
          show_comments: boolean | null;
          show_followers: boolean | null;
          show_subscriptions: boolean | null;
          social_links: Json | null;
          stripe_account_id: string | null;
          stripe_account_type: string | null;
          stripe_customer_id: string | null;
          tags: string[] | null;
          terms_accepted_at: string | null;
          tsv: unknown | null;
          updated_at: string | null;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          cover_image_url?: string | null;
          created_at?: string | null;
          embedding?: string | null;
          follower_count?: number | null;
          following_count?: number | null;
          full_name?: string | null;
          id: string;
          is_profile_public?: boolean | null;
          pinned_post_id?: string | null;
          post_count?: number | null;
          role?: string | null;
          show_comments?: boolean | null;
          show_followers?: boolean | null;
          show_subscriptions?: boolean | null;
          social_links?: Json | null;
          stripe_account_id?: string | null;
          stripe_account_type?: string | null;
          stripe_customer_id?: string | null;
          tags?: string[] | null;
          terms_accepted_at?: string | null;
          tsv?: unknown | null;
          updated_at?: string | null;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          cover_image_url?: string | null;
          created_at?: string | null;
          embedding?: string | null;
          follower_count?: number | null;
          following_count?: number | null;
          full_name?: string | null;
          id?: string;
          is_profile_public?: boolean | null;
          pinned_post_id?: string | null;
          post_count?: number | null;
          role?: string | null;
          show_comments?: boolean | null;
          show_followers?: boolean | null;
          show_subscriptions?: boolean | null;
          social_links?: Json | null;
          stripe_account_id?: string | null;
          stripe_account_type?: string | null;
          stripe_customer_id?: string | null;
          tags?: string[] | null;
          terms_accepted_at?: string | null;
          tsv?: unknown | null;
          updated_at?: string | null;
          username?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'users_pinned_post_id_fkey';
            columns: ['pinned_post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
        ];
      };
      video_analytics: {
        Row: {
          completion_rate: number | null;
          created_at: string | null;
          id: string;
          live_stream_id: string | null;
          quality_score: number | null;
          rebuffer_count: number | null;
          startup_time: number | null;
          video_asset_id: string | null;
          view_id: string | null;
          viewer_user_id: string | null;
          watch_time: number | null;
        };
        Insert: {
          completion_rate?: number | null;
          created_at?: string | null;
          id?: string;
          live_stream_id?: string | null;
          quality_score?: number | null;
          rebuffer_count?: number | null;
          startup_time?: number | null;
          video_asset_id?: string | null;
          view_id?: string | null;
          viewer_user_id?: string | null;
          watch_time?: number | null;
        };
        Update: {
          completion_rate?: number | null;
          created_at?: string | null;
          id?: string;
          live_stream_id?: string | null;
          quality_score?: number | null;
          rebuffer_count?: number | null;
          startup_time?: number | null;
          video_asset_id?: string | null;
          view_id?: string | null;
          viewer_user_id?: string | null;
          watch_time?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'video_analytics_live_stream_id_fkey';
            columns: ['live_stream_id'];
            isOneToOne: false;
            referencedRelation: 'live_streams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'video_analytics_video_asset_id_fkey';
            columns: ['video_asset_id'];
            isOneToOne: false;
            referencedRelation: 'video_assets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'video_analytics_viewer_user_id_fkey';
            columns: ['viewer_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      video_assets: {
        Row: {
          aspect_ratio: string | null;
          collective_id: string | null;
          comment_count: number;
          created_at: string | null;
          created_by: string | null;
          deleted_at: string | null;
          description: string | null;
          duration: number | null;
          encoding_tier: string | null;
          id: string;
          is_public: boolean | null;
          mp4_support: string | null;
          mux_asset_id: string | null;
          mux_playback_id: string | null;
          mux_upload_id: string | null;
          playback_policy: string | null;
          post_id: string | null;
          status: string | null;
          title: string | null;
          updated_at: string | null;
        };
        Insert: {
          aspect_ratio?: string | null;
          collective_id?: string | null;
          comment_count?: number;
          created_at?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          duration?: number | null;
          encoding_tier?: string | null;
          id?: string;
          is_public?: boolean | null;
          mp4_support?: string | null;
          mux_asset_id?: string | null;
          mux_playback_id?: string | null;
          mux_upload_id?: string | null;
          playback_policy?: string | null;
          post_id?: string | null;
          status?: string | null;
          title?: string | null;
          updated_at?: string | null;
        };
        Update: {
          aspect_ratio?: string | null;
          collective_id?: string | null;
          comment_count?: number;
          created_at?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          duration?: number | null;
          encoding_tier?: string | null;
          id?: string;
          is_public?: boolean | null;
          mp4_support?: string | null;
          mux_asset_id?: string | null;
          mux_playback_id?: string | null;
          mux_upload_id?: string | null;
          playback_policy?: string | null;
          post_id?: string | null;
          status?: string | null;
          title?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'video_assets_collective_id_fkey';
            columns: ['collective_id'];
            isOneToOne: false;
            referencedRelation: 'collectives';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'video_assets_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'video_assets_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      channels: {
        Row: {
          archived: boolean | null;
          collective_id: string | null;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          id: string | null;
          is_private: boolean | null;
          last_message_at: string | null;
          title: string | null;
          type: string | null;
          updated_at: string | null;
        };
        Insert: {
          archived?: boolean | null;
          collective_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string | null;
          is_private?: boolean | null;
          last_message_at?: string | null;
          title?: string | null;
          type?: string | null;
          updated_at?: string | null;
        };
        Update: {
          archived?: boolean | null;
          collective_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string | null;
          is_private?: boolean | null;
          last_message_at?: string | null;
          title?: string | null;
          type?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_collective_id_fkey';
            columns: ['collective_id'];
            isOneToOne: false;
            referencedRelation: 'collectives';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      collective_followers: {
        Row: {
          avatar_url: string | null;
          collective_id: string | null;
          created_at: string | null;
          full_name: string | null;
          user_id: string | null;
          username: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'follows_follower_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      index_usage_stats: {
        Row: {
          idx_scan: number | null;
          idx_tup_fetch: number | null;
          idx_tup_read: number | null;
          indexname: unknown | null;
          schemaname: unknown | null;
          tablename: unknown | null;
          usage_category: string | null;
        };
        Relationships: [];
      };
      search_documents: {
        Row: {
          author_id: string | null;
          author_name: string | null;
          author_username: string | null;
          content: string | null;
          created_at: string | null;
          id: string | null;
          title: string | null;
          tsv: unknown | null;
          type: string | null;
        };
        Relationships: [];
      };
      table_scan_stats: {
        Row: {
          idx_scan: number | null;
          idx_tup_fetch: number | null;
          schemaname: unknown | null;
          seq_scan: number | null;
          seq_scan_ratio: number | null;
          seq_tup_read: number | null;
          tablename: unknown | null;
        };
        Relationships: [];
      };
      user_followers: {
        Row: {
          created_at: string | null;
          follower_avatar: string | null;
          follower_id: string | null;
          follower_name: string | null;
          follower_username: string | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'follows_follower_id_fkey';
            columns: ['follower_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      user_following: {
        Row: {
          created_at: string | null;
          following_avatar: string | null;
          following_id: string | null;
          following_name: string | null;
          following_type: string | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'follows_follower_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      accept_collective_invite: {
        Args: { p_invite_code: string; p_user_id: string };
        Returns: {
          success: boolean;
          message: string;
          collective_slug: string;
          collective_name: string;
          role_granted: string;
        }[];
      };
      add_comment: {
        Args: {
          p_entity_type: Database['public']['Enums']['comment_entity_type'];
          p_entity_id: string;
          p_author_id: string;
          p_content: string;
          p_parent_id?: string;
        };
        Returns: {
          comment_id: string;
          thread_depth: number;
        }[];
      };
      check_collective_subscription_permission: {
        Args: { p_user_id: string; p_collective_id: string };
        Returns: {
          has_permission: boolean;
        }[];
      };
      check_username_available: {
        Args: { p_username: string; p_user_id?: string };
        Returns: boolean;
      };
      check_username_exists: {
        Args: { p_username: string };
        Returns: boolean;
      };
      cleanup_expired_cache: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      cleanup_old_notifications: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      create_collective_tenant: {
        Args: {
          tenant_name: string;
          tenant_slug: string;
          tenant_description?: string;
          is_public?: boolean;
        };
        Returns: string;
      };
      create_default_notification_preferences: {
        Args: {
          p_user_id: string;
          p_notification_type: Database['public']['Enums']['notification_type'];
        };
        Returns: undefined;
      };
      create_direct_conversation_atomic: {
        Args: { sender_id: string; recipient_id: string };
        Returns: {
          conversation_id: string;
          is_existing: boolean;
        }[];
      };
      create_group_conversation_atomic: {
        Args: {
          creator_id: string;
          participant_ids: string[];
          group_title?: string;
          check_participants?: boolean;
        };
        Returns: Json;
      };
      create_notification: {
        Args: {
          p_recipient_id: string;
          p_actor_id: string;
          p_type: Database['public']['Enums']['notification_type'];
          p_title: string;
          p_message: string;
          p_entity_type?: string;
          p_entity_id?: string;
          p_metadata?: Json;
        };
        Returns: string;
      };
      create_personal_tenant_for_user: {
        Args: { user_id: string };
        Returns: undefined;
      };
      create_safe_delete_helper_view: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      create_tenant_conversation: {
        Args: {
          target_tenant_id: string;
          conversation_title: string;
          conversation_type: string;
          conversation_description: string;
          is_private_conversation: boolean;
          participant_user_ids: string[];
        };
        Returns: {
          id: string;
          title: string;
          type: string;
          created_at: string;
          tenant_id: string;
        }[];
      };
      delete_related_records: {
        Args: {
          p_schema: string;
          p_table: string;
          p_column: string;
          p_user_id: string;
        };
        Returns: undefined;
      };
      find_existing_direct_conversation: {
        Args: { target_tenant_id: string; user1_id: string; user2_id: string };
        Returns: {
          conversation_id: string;
          title: string;
          created_at: string;
        }[];
      };
      find_or_create_direct_conversation: {
        Args: { user1_id: string; user2_id: string; target_tenant_id: string };
        Returns: string;
      };
      find_post_by_slug: {
        Args: { tenant_uuid: string; post_slug: string };
        Returns: {
          post_id: string;
          title: string;
          content: string;
          author_id: string;
          created_at: string;
          updated_at: string;
          is_current_slug: boolean;
        }[];
      };
      find_video_by_mux_id: {
        Args: { p_mux_id: string };
        Returns: {
          aspect_ratio: string | null;
          collective_id: string | null;
          comment_count: number;
          created_at: string | null;
          created_by: string | null;
          deleted_at: string | null;
          description: string | null;
          duration: number | null;
          encoding_tier: string | null;
          id: string;
          is_public: boolean | null;
          mp4_support: string | null;
          mux_asset_id: string | null;
          mux_playback_id: string | null;
          mux_upload_id: string | null;
          playback_policy: string | null;
          post_id: string | null;
          status: string | null;
          title: string | null;
          updated_at: string | null;
        }[];
      };
      follow_toggle: {
        Args: { p_follower: string; p_target: string; p_target_type: string };
        Returns: boolean;
      };
      generate_direct_conversation_hash: {
        Args: { conversation_uuid: string };
        Returns: string;
      };
      generate_group_hash: {
        Args: {
          creator_id: string;
          participant_ids: string[];
          group_title?: string;
        };
        Returns: string;
      };
      generate_post_slug: {
        Args: { post_title: string; post_tenant_id: string; post_id?: string };
        Returns: string;
      };
      get_auth_user_foreign_keys: {
        Args: Record<PropertyKey, never>;
        Returns: {
          constraint_name: string;
          table_schema: string;
          table_name: string;
          column_name: string;
          foreign_table_schema: string;
          foreign_table_name: string;
          foreign_column_name: string;
          delete_rule: string;
        }[];
      };
      get_cached_recommendations: {
        Args: {
          p_user_id: string;
          p_cache_key: string;
          p_algorithm_version?: string;
        };
        Returns: Json;
      };
      get_collective_invites_with_user_details: {
        Args: { p_collective_id: string };
        Returns: {
          id: string;
          collective_id: string;
          email: string;
          role: string;
          status: string;
          invite_code: string;
          created_at: string;
          accepted_at: string;
          invited_by_user_id: string;
          inviter_full_name: string;
          inviter_avatar_url: string;
        }[];
      };
      get_collective_stats: {
        Args: { collective_id: string };
        Returns: Json;
      };
      get_collective_tenant_id: {
        Args: { collective_uuid: string };
        Returns: string;
      };
      get_comment_count: {
        Args: {
          p_entity_type: Database['public']['Enums']['comment_entity_type'];
          p_entity_id: string;
        };
        Returns: number;
      };
      get_comment_replies: {
        Args: { p_parent_id: string; p_limit?: number; p_offset?: number };
        Returns: {
          comment_data: Json;
        }[];
      };
      get_comment_replies_with_reactions: {
        Args: {
          p_parent_id: string;
          p_limit?: number;
          p_cursor?: string;
          p_user_id?: string;
        };
        Returns: {
          id: string;
          entity_type: string;
          entity_id: string;
          user_id: string;
          content: string;
          parent_id: string;
          thread_depth: number;
          reply_count: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string;
          author: Json;
          reaction_counts: Json;
          user_reactions: string[];
        }[];
      };
      get_comment_thread: {
        Args: {
          p_entity_type: Database['public']['Enums']['comment_entity_type'];
          p_entity_id: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          comment_data: Json;
        }[];
      };
      get_direct_conversations_with_participants: {
        Args: { p_user_id: string; limit_count?: number };
        Returns: {
          conversation_id: string;
          last_message_at: string;
          created_at: string;
          other_user_id: string;
          other_user_username: string;
          other_user_full_name: string;
          other_user_avatar_url: string;
        }[];
      };
      get_entity_comments_with_reactions: {
        Args: {
          p_entity_type: string;
          p_entity_id: string;
          p_limit?: number;
          p_cursor?: string;
          p_created_before?: string;
          p_user_id?: string;
          p_include_reactions?: boolean;
        };
        Returns: {
          id: string;
          entity_type: string;
          entity_id: string;
          user_id: string;
          content: string;
          parent_id: string;
          thread_depth: number;
          reply_count: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string;
          author: Json;
          reaction_counts: Json;
          user_reactions: string[];
        }[];
      };
      get_follow_status: {
        Args: { p_follower: string; p_target: string; p_target_type: string };
        Returns: boolean;
      };
      get_follower_count: {
        Args: { entity_id: string; entity_type: string };
        Returns: number;
      };
      get_following_count: {
        Args: { user_id: string; entity_type?: string };
        Returns: number;
      };
      get_pg_connection: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_subscriber_count: {
        Args: { entity_id: string; entity_type: string };
        Returns: number;
      };
      get_tenant_context: {
        Args: { target_tenant_id: string };
        Returns: Json;
      };
      get_tenant_conversations: {
        Args: { target_tenant_id: string };
        Returns: {
          id: string;
          title: string;
          type: string;
          description: string;
          is_private: boolean;
          participant_count: number;
          created_at: string;
          updated_at: string;
        }[];
      };
      get_total_unread_message_count: {
        Args: { p_user_id: string };
        Returns: number;
      };
      get_unread_message_count: {
        Args: { p_user_id: string; p_conversation_id: string };
        Returns: number;
      };
      get_unread_notification_count: {
        Args: { p_user_id: string };
        Returns: number;
      };
      get_user_dashboard_content: {
        Args: { user_id_param: string; posts_limit?: number };
        Returns: Json;
      };
      get_user_dashboard_stats: {
        Args: { user_id_param: string };
        Returns: {
          subscriber_count: number;
          follower_count: number;
          total_views: number;
          total_likes: number;
          published_this_month: number;
          total_posts: number;
          collective_count: number;
        }[];
      };
      get_user_dashboard_stats_v2: {
        Args: { user_id_param: string };
        Returns: {
          subscriber_count: number;
          follower_count: number;
          total_views: number;
          total_likes: number;
          published_this_month: number;
          total_posts: number;
          collective_count: number;
        }[];
      };
      get_user_feed: {
        Args: { p_user_id: string; p_limit?: number; p_offset?: number };
        Returns: {
          id: string;
          title: string;
          content: string;
          created_at: string;
          published_at: string;
          is_public: boolean;
          author_id: string;
          author_full_name: string;
          collective_id: string;
          collective_name: string;
          collective_slug: string;
          like_count: number;
        }[];
      };
      get_user_personal_tenant: {
        Args: { target_user_id?: string };
        Returns: string;
      };
      get_user_preference_weights: {
        Args: { p_user_id: string };
        Returns: {
          content_type: string;
          weight: number;
        }[];
      };
      get_user_tenant_role: {
        Args: { target_tenant_id: string; target_user_id?: string };
        Returns: Database['public']['Enums']['member_role'];
      };
      get_user_tenants: {
        Args: { target_user_id?: string };
        Returns: {
          tenant_id: string;
          tenant_type: Database['public']['Enums']['tenant_type'];
          tenant_name: string;
          tenant_slug: string;
          user_role: Database['public']['Enums']['member_role'];
          is_personal: boolean;
          member_count: number;
          is_public: boolean;
        }[];
      };
      increment_view_count: {
        Args: { post_id_to_increment: string };
        Returns: undefined;
      };
      invalidate_user_cache: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      is_collective_owner: {
        Args: { cid: string };
        Returns: boolean;
      };
      is_content_muted: {
        Args: {
          p_user_id: string;
          p_content_id: string;
          p_author_id: string;
          p_collective_id: string;
          p_tags: string[];
        };
        Returns: boolean;
      };
      is_conversation_participant: {
        Args: { p_conversation_id: string; p_user_id: string };
        Returns: boolean;
      };
      is_following: {
        Args: {
          follower_user_id: string;
          target_id: string;
          target_type?: string;
        };
        Returns: boolean;
      };
      is_participant_of: {
        Args: { p_conversation_id: string; p_user_id: string };
        Returns: boolean;
      };
      mark_messages_as_read: {
        Args: { p_user_id: string; p_conversation_id: string };
        Returns: undefined;
      };
      mark_notifications_as_read: {
        Args: { p_user_id: string; p_notification_ids?: string[] };
        Returns: number;
      };
      tenant_is_public: {
        Args: { tenant_uuid: string };
        Returns: boolean;
      };
      toggle_comment_reaction: {
        Args: {
          p_comment_id: string;
          p_user_id: string;
          p_reaction_type: Database['public']['Enums']['reaction_type'];
        };
        Returns: {
          action_taken: string;
          reaction_counts: Json;
        }[];
      };
      user_has_tenant_access: {
        Args: {
          target_tenant_id: string;
          required_role?: Database['public']['Enums']['member_role'];
        };
        Returns: boolean;
      };
      user_is_tenant_member: {
        Args: { tenant_uuid: string };
        Returns: boolean;
      };
      validate_collective_tenant_consistency: {
        Args: Record<PropertyKey, never>;
        Returns: {
          collective_id: string;
          tenant_id: string;
          issue_type: string;
        }[];
      };
    };
    Enums: {
      agreement_type:
        | 'subscription'
        | 'one_time_payment'
        | 'revenue_share'
        | 'membership_fee'
        | 'ownership_transfer'
        | 'other';
      chain_reaction_type: 'like' | 'rechain';
      chain_status: 'active' | 'deleted' | 'shadow_hidden';
      chain_visibility: 'public' | 'followers' | 'private' | 'unlisted';
      collective_member_role: 'admin' | 'editor' | 'author' | 'owner';
      comment_entity_type: 'video' | 'post' | 'collective' | 'profile';
      conversation_type: 'channel' | 'group' | 'direct';
      interaction_entity_type: 'collective' | 'post' | 'user' | 'chain';
      interaction_type:
        | 'like'
        | 'unlike'
        | 'recommended_interested'
        | 'recommended_not_interested'
        | 'view'
        | 'chain_view';
      member_entity_type: 'user' | 'collective';
      member_role: 'owner' | 'admin' | 'editor' | 'member';
      notification_type:
        | 'follow'
        | 'unfollow'
        | 'post_like'
        | 'post_comment'
        | 'comment_reply'
        | 'comment_like'
        | 'post_published'
        | 'collective_invite'
        | 'collective_join'
        | 'collective_leave'
        | 'subscription_created'
        | 'subscription_cancelled'
        | 'mention'
        | 'post_bookmark'
        | 'featured_post';
      post_status_type: 'draft' | 'active' | 'removed';
      post_type_enum: 'text' | 'video';
      price_interval: 'month' | 'year' | 'week' | 'day';
      price_type: 'recurring' | 'one_time';
      reaction_type:
        | 'like'
        | 'heart'
        | 'laugh'
        | 'angry'
        | 'sad'
        | 'wow'
        | 'dislike';
      report_status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
      subscription_status:
        | 'trialing'
        | 'active'
        | 'canceled'
        | 'incomplete'
        | 'incomplete_expired'
        | 'past_due'
        | 'unpaid'
        | 'paused';
      subscription_target_type: 'user' | 'collective';
      tenant_type: 'personal' | 'collective';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      agreement_type: [
        'subscription',
        'one_time_payment',
        'revenue_share',
        'membership_fee',
        'ownership_transfer',
        'other',
      ],
      chain_reaction_type: ['like', 'rechain'],
      chain_status: ['active', 'deleted', 'shadow_hidden'],
      chain_visibility: ['public', 'followers', 'private', 'unlisted'],
      collective_member_role: ['admin', 'editor', 'author', 'owner'],
      comment_entity_type: ['video', 'post', 'collective', 'profile'],
      conversation_type: ['channel', 'group', 'direct'],
      interaction_entity_type: ['collective', 'post', 'user', 'chain'],
      interaction_type: [
        'like',
        'unlike',
        'recommended_interested',
        'recommended_not_interested',
        'view',
        'chain_view',
      ],
      member_entity_type: ['user', 'collective'],
      member_role: ['owner', 'admin', 'editor', 'member'],
      notification_type: [
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
      ],
      post_status_type: ['draft', 'active', 'removed'],
      post_type_enum: ['text', 'video'],
      price_interval: ['month', 'year', 'week', 'day'],
      price_type: ['recurring', 'one_time'],
      reaction_type: [
        'like',
        'heart',
        'laugh',
        'angry',
        'sad',
        'wow',
        'dislike',
      ],
      report_status: ['pending', 'reviewed', 'resolved', 'dismissed'],
      subscription_status: [
        'trialing',
        'active',
        'canceled',
        'incomplete',
        'incomplete_expired',
        'past_due',
        'unpaid',
        'paused',
      ],
      subscription_target_type: ['user', 'collective'],
      tenant_type: ['personal', 'collective'],
    },
  },
} as const;
