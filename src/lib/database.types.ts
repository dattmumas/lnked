export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      collective_invites: {
        Row: {
          accepted_at: string | null
          collective_id: string
          created_at: string
          email: string
          id: string
          invite_code: string
          invited_by_user_id: string | null
          role: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          collective_id: string
          created_at?: string
          email: string
          id?: string
          invite_code: string
          invited_by_user_id?: string | null
          role: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          collective_id?: string
          created_at?: string
          email?: string
          id?: string
          invite_code?: string
          invited_by_user_id?: string | null
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "collective_invites_collective_id_fkey"
            columns: ["collective_id"]
            isOneToOne: false
            referencedRelation: "collectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collective_invites_invited_by_user_id_fkey"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      collective_members: {
        Row: {
          collective_id: string
          created_at: string | null
          id: string
          member_id: string
          member_type: string | null
          role: string | null
          share_percentage: number | null
          updated_at: string | null
        }
        Insert: {
          collective_id: string
          created_at?: string | null
          id?: string
          member_id: string
          member_type?: string | null
          role?: string | null
          share_percentage?: number | null
          updated_at?: string | null
        }
        Update: {
          collective_id?: string
          created_at?: string | null
          id?: string
          member_id?: string
          member_type?: string | null
          role?: string | null
          share_percentage?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collective_members_collective_id_fkey"
            columns: ["collective_id"]
            isOneToOne: false
            referencedRelation: "collectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collective_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      collectives: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          governance_model: string | null
          id: string
          intro_video_url: string | null
          logo_url: string | null
          name: string
          owner_id: string | null
          pinned_post_id: string | null
          slug: string
          stripe_account_id: string | null
          stripe_account_type: string | null
          stripe_customer_id: string | null
          tags: string[] | null
          tsv: unknown | null
          updated_at: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          governance_model?: string | null
          id?: string
          intro_video_url?: string | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          pinned_post_id?: string | null
          slug: string
          stripe_account_id?: string | null
          stripe_account_type?: string | null
          stripe_customer_id?: string | null
          tags?: string[] | null
          tsv?: unknown | null
          updated_at?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          governance_model?: string | null
          id?: string
          intro_video_url?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          pinned_post_id?: string | null
          slug?: string
          stripe_account_id?: string | null
          stripe_account_type?: string | null
          stripe_customer_id?: string | null
          tags?: string[] | null
          tsv?: unknown | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collectives_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collectives_pinned_post_id_fkey"
            columns: ["pinned_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          parent_id: string | null
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string | null
          id: string
          is_muted: boolean | null
          is_pinned: boolean | null
          joined_at: string | null
          last_read_at: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          id?: string
          is_muted?: boolean | null
          is_pinned?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          id?: string
          is_muted?: boolean | null
          is_pinned?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          archived: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_private: boolean | null
          last_message_at: string | null
          title: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_private?: boolean | null
          last_message_at?: string | null
          title?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_private?: boolean | null
          last_message_at?: string | null
          title?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          id: string
          stripe_customer_id: string
        }
        Insert: {
          id: string
          stripe_customer_id: string
        }
        Update: {
          id?: string
          stripe_customer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_posts: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          owner_id: string
          owner_type: string
          post_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          owner_id: string
          owner_type: string
          post_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          owner_id?: string
          owner_type?: string
          post_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "featured_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          following_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          following_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          following_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          interaction_type: string
          metadata: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          interaction_type: string
          metadata?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          interaction_type?: string
          metadata?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      live_streams: {
        Row: {
          collective_id: string | null
          created_at: string | null
          description: string | null
          ended_at: string | null
          id: string
          is_public: boolean | null
          latency_mode: string | null
          max_continuous_duration: number | null
          mux_metadata: Json | null
          mux_playback_ids: Json | null
          mux_stream_id: string
          owner_id: string
          playback_policy: string | null
          reconnect_window: number | null
          record_stream: boolean | null
          recorded_asset_id: string | null
          started_at: string | null
          status: string
          stream_key: string
          title: string
          tsv: unknown | null
          updated_at: string | null
        }
        Insert: {
          collective_id?: string | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          is_public?: boolean | null
          latency_mode?: string | null
          max_continuous_duration?: number | null
          mux_metadata?: Json | null
          mux_playback_ids?: Json | null
          mux_stream_id: string
          owner_id: string
          playback_policy?: string | null
          reconnect_window?: number | null
          record_stream?: boolean | null
          recorded_asset_id?: string | null
          started_at?: string | null
          status?: string
          stream_key: string
          title: string
          tsv?: unknown | null
          updated_at?: string | null
        }
        Update: {
          collective_id?: string | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          is_public?: boolean | null
          latency_mode?: string | null
          max_continuous_duration?: number | null
          mux_metadata?: Json | null
          mux_playback_ids?: Json | null
          mux_stream_id?: string
          owner_id?: string
          playback_policy?: string | null
          reconnect_window?: number | null
          record_stream?: boolean | null
          recorded_asset_id?: string | null
          started_at?: string | null
          status?: string
          stream_key?: string
          title?: string
          tsv?: unknown | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_streams_collective_id_fkey"
            columns: ["collective_id"]
            isOneToOne: false
            referencedRelation: "collectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_streams_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_streams_recorded_asset_id_fkey"
            columns: ["recorded_asset_id"]
            isOneToOne: false
            referencedRelation: "video_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      message_read_receipts: {
        Row: {
          id: string
          message_id: string | null
          read_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          message_id?: string | null
          read_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          message_id?: string | null
          read_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_read_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_read_receipts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          id: string
          message_type: string | null
          metadata: Json | null
          reply_to_id: string | null
          sender_id: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mux_webhooks: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          live_stream_id: string | null
          mux_webhook_id: string
          payload: Json
          processed_at: string | null
          retry_count: number | null
          signature: string
          status: string
          updated_at: string | null
          video_asset_id: string | null
          webhook_type: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          live_stream_id?: string | null
          mux_webhook_id: string
          payload: Json
          processed_at?: string | null
          retry_count?: number | null
          signature: string
          status?: string
          updated_at?: string | null
          video_asset_id?: string | null
          webhook_type: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          live_stream_id?: string | null
          mux_webhook_id?: string
          payload?: Json
          processed_at?: string | null
          retry_count?: number | null
          signature?: string
          status?: string
          updated_at?: string | null
          video_asset_id?: string | null
          webhook_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "mux_webhooks_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mux_webhooks_video_asset_id_fkey"
            columns: ["video_asset_id"]
            isOneToOne: false
            referencedRelation: "video_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          push_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notification_type?: Database["public"]["Enums"]["notification_type"]
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          metadata: Json | null
          read_at: string | null
          recipient_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read_at?: string | null
          recipient_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read_at?: string | null
          recipient_id?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_bookmarks: {
        Row: {
          created_at: string | null
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string | null
          post_id: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          post_id: string
          type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          post_id?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          id: string
          post_id: string
          updated_at: string | null
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          id?: string
          post_id: string
          updated_at?: string | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          id?: string
          post_id?: string
          updated_at?: string | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author: string | null
          author_id: string
          collective_id: string | null
          content: string | null
          created_at: string | null
          dislike_count: number | null
          id: string
          is_public: boolean | null
          like_count: number | null
          meta_description: string | null
          metadata: Json
          post_type: Database["public"]["Enums"]["post_type_enum"]
          published_at: string | null
          seo_title: string | null
          slug: string | null
          status: string | null
          subtitle: string | null
          thumbnail_url: string | null
          title: string
          tsv: unknown | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author?: string | null
          author_id: string
          collective_id?: string | null
          content?: string | null
          created_at?: string | null
          dislike_count?: number | null
          id?: string
          is_public?: boolean | null
          like_count?: number | null
          meta_description?: string | null
          metadata?: Json
          post_type?: Database["public"]["Enums"]["post_type_enum"]
          published_at?: string | null
          seo_title?: string | null
          slug?: string | null
          status?: string | null
          subtitle?: string | null
          thumbnail_url?: string | null
          title: string
          tsv?: unknown | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author?: string | null
          author_id?: string
          collective_id?: string | null
          content?: string | null
          created_at?: string | null
          dislike_count?: number | null
          id?: string
          is_public?: boolean | null
          like_count?: number | null
          meta_description?: string | null
          metadata?: Json
          post_type?: Database["public"]["Enums"]["post_type_enum"]
          published_at?: string | null
          seo_title?: string | null
          slug?: string | null
          status?: string | null
          subtitle?: string | null
          thumbnail_url?: string | null
          title?: string
          tsv?: unknown | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_collective_id_fkey"
            columns: ["collective_id"]
            isOneToOne: false
            referencedRelation: "collectives"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          created_at: string | null
          score: number
          suggested_collective_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          score: number
          suggested_collective_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          score?: number
          suggested_collective_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_suggested_collective_id_fkey"
            columns: ["suggested_collective_id"]
            isOneToOne: false
            referencedRelation: "collectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created: string
          current_period_end: string
          current_period_start: string
          ended_at: string | null
          id: string
          inserted_at: string | null
          metadata: Json | null
          quantity: number | null
          status: string
          stripe_price_id: string | null
          target_entity_id: string
          target_entity_type: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created: string
          current_period_end: string
          current_period_start: string
          ended_at?: string | null
          id?: string
          inserted_at?: string | null
          metadata?: Json | null
          quantity?: number | null
          status: string
          stripe_price_id?: string | null
          target_entity_id: string
          target_entity_type: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created?: string
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          id?: string
          inserted_at?: string | null
          metadata?: Json | null
          quantity?: number | null
          status?: string
          stripe_price_id?: string | null
          target_entity_id?: string
          target_entity_type?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_sessions: {
        Row: {
          completed_at: string | null
          content_type: string
          created_at: string
          error_details: Json | null
          expires_at: string
          file_size: number
          filename: string
          id: string
          metadata: Json | null
          progress: Json | null
          resume_info: Json | null
          status: string
          updated_at: string
          upload_id: string
          upload_url: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          content_type: string
          created_at?: string
          error_details?: Json | null
          expires_at: string
          file_size: number
          filename: string
          id?: string
          metadata?: Json | null
          progress?: Json | null
          resume_info?: Json | null
          status?: string
          updated_at?: string
          upload_id: string
          upload_url: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          content_type?: string
          created_at?: string
          error_details?: Json | null
          expires_at?: string
          file_size?: number
          filename?: string
          id?: string
          metadata?: Json | null
          progress?: Json | null
          resume_info?: Json | null
          status?: string
          updated_at?: string
          upload_id?: string
          upload_url?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_image_url: string | null
          embedding: string | null
          full_name: string | null
          id: string
          is_profile_public: boolean | null
          pinned_post_id: string | null
          role: string | null
          show_comments: boolean | null
          show_followers: boolean | null
          show_subscriptions: boolean | null
          social_links: Json | null
          stripe_account_id: string | null
          stripe_account_type: string | null
          stripe_customer_id: string | null
          tags: string[] | null
          terms_accepted_at: string | null
          tsv: unknown | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_image_url?: string | null
          embedding?: string | null
          full_name?: string | null
          id?: string
          is_profile_public?: boolean | null
          pinned_post_id?: string | null
          role?: string | null
          show_comments?: boolean | null
          show_followers?: boolean | null
          show_subscriptions?: boolean | null
          social_links?: Json | null
          stripe_account_id?: string | null
          stripe_account_type?: string | null
          stripe_customer_id?: string | null
          tags?: string[] | null
          terms_accepted_at?: string | null
          tsv?: unknown | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_image_url?: string | null
          embedding?: string | null
          full_name?: string | null
          id?: string
          is_profile_public?: boolean | null
          pinned_post_id?: string | null
          role?: string | null
          show_comments?: boolean | null
          show_followers?: boolean | null
          show_subscriptions?: boolean | null
          social_links?: Json | null
          stripe_account_id?: string | null
          stripe_account_type?: string | null
          stripe_customer_id?: string | null
          tags?: string[] | null
          terms_accepted_at?: string | null
          tsv?: unknown | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_pinned_post_id_fkey"
            columns: ["pinned_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      video_analytics: {
        Row: {
          browser: string | null
          country_code: string | null
          created_at: string | null
          device_type: string | null
          id: string
          ip_address: unknown | null
          live_stream_id: string | null
          metadata: Json | null
          metric_type: string
          playback_duration: number | null
          playback_position: number | null
          quality: string | null
          session_id: string | null
          user_agent: string | null
          video_asset_id: string | null
          viewer_id: string | null
        }
        Insert: {
          browser?: string | null
          country_code?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown | null
          live_stream_id?: string | null
          metadata?: Json | null
          metric_type: string
          playback_duration?: number | null
          playback_position?: number | null
          quality?: string | null
          session_id?: string | null
          user_agent?: string | null
          video_asset_id?: string | null
          viewer_id?: string | null
        }
        Update: {
          browser?: string | null
          country_code?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown | null
          live_stream_id?: string | null
          metadata?: Json | null
          metric_type?: string
          playback_duration?: number | null
          playback_position?: number | null
          quality?: string | null
          session_id?: string | null
          user_agent?: string | null
          video_asset_id?: string | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_analytics_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_analytics_video_asset_id_fkey"
            columns: ["video_asset_id"]
            isOneToOne: false
            referencedRelation: "video_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_analytics_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      video_assets: {
        Row: {
          aspect_ratio: string | null
          collective_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          duration: number | null
          encoding_tier: string | null
          error_details: Json | null
          file_size: number | null
          file_type: string | null
          id: string
          is_public: boolean | null
          max_resolution_tier: string | null
          mp4_support: string | null
          mux_asset_id: string | null
          mux_metadata: Json | null
          mux_playback_id: string | null
          mux_upload_id: string | null
          normalize_audio: boolean | null
          original_filename: string | null
          playback_policy: string | null
          post_id: string | null
          processed_at: string | null
          resolution_tier: string | null
          status: string
          title: string | null
          tsv: unknown | null
          updated_at: string | null
        }
        Insert: {
          aspect_ratio?: string | null
          collective_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          duration?: number | null
          encoding_tier?: string | null
          error_details?: Json | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_public?: boolean | null
          max_resolution_tier?: string | null
          mp4_support?: string | null
          mux_asset_id?: string | null
          mux_metadata?: Json | null
          mux_playback_id?: string | null
          mux_upload_id?: string | null
          normalize_audio?: boolean | null
          original_filename?: string | null
          playback_policy?: string | null
          post_id?: string | null
          processed_at?: string | null
          resolution_tier?: string | null
          status?: string
          title?: string | null
          tsv?: unknown | null
          updated_at?: string | null
        }
        Update: {
          aspect_ratio?: string | null
          collective_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          duration?: number | null
          encoding_tier?: string | null
          error_details?: Json | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_public?: boolean | null
          max_resolution_tier?: string | null
          mp4_support?: string | null
          mux_asset_id?: string | null
          mux_metadata?: Json | null
          mux_playback_id?: string | null
          mux_upload_id?: string | null
          normalize_audio?: boolean | null
          original_filename?: string | null
          playback_policy?: string | null
          post_id?: string | null
          processed_at?: string | null
          resolution_tier?: string | null
          status?: string
          title?: string | null
          tsv?: unknown | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_assets_collective_id_fkey"
            columns: ["collective_id"]
            isOneToOne: false
            referencedRelation: "collectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_assets_owner_id_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_assets_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_notifications: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      create_default_notification_preferences: {
        Args: {
          p_user_id: string
          p_notification_type: Database["public"]["Enums"]["notification_type"]
        }
        Returns: undefined
      }
      create_notification: {
        Args: {
          p_recipient_id: string
          p_actor_id: string
          p_type: Database["public"]["Enums"]["notification_type"]
          p_title: string
          p_message: string
          p_entity_type?: string
          p_entity_id?: string
          p_metadata?: Json
        }
        Returns: string
      }
      extract_name_from_email: {
        Args: { email: string }
        Returns: string
      }
      get_unread_message_count: {
        Args: { p_user_id: string; p_conversation_id: string }
        Returns: number
      }
      get_unread_notification_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_email: {
        Args: { user_id: string }
        Returns: string
      }
      mark_messages_as_read: {
        Args: { p_user_id: string; p_conversation_id: string }
        Returns: undefined
      }
      mark_notifications_as_read: {
        Args: { p_user_id: string; p_notification_ids?: string[] }
        Returns: number
      }
    }
    Enums: {
      notification_type:
        | "follow"
        | "unfollow"
        | "post_like"
        | "post_comment"
        | "comment_reply"
        | "comment_like"
        | "post_published"
        | "collective_invite"
        | "collective_join"
        | "collective_leave"
        | "subscription_created"
        | "subscription_cancelled"
        | "mention"
        | "post_bookmark"
        | "featured_post"
      post_type_enum: "text" | "video"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      notification_type: [
        "follow",
        "unfollow",
        "post_like",
        "post_comment",
        "comment_reply",
        "comment_like",
        "post_published",
        "collective_invite",
        "collective_join",
        "collective_leave",
        "subscription_created",
        "subscription_cancelled",
        "mention",
        "post_bookmark",
        "featured_post",
      ],
      post_type_enum: ["text", "video"],
    },
  },
} as const

