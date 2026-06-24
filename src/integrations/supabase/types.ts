export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      affiliate_links: {
        Row: {
          affiliate_id: string
          code: string
          created_at: string
          creator_id: string
          id: string
        }
        Insert: {
          affiliate_id: string
          code: string
          created_at?: string
          creator_id: string
          id?: string
        }
        Update: {
          affiliate_id?: string
          code?: string
          created_at?: string
          creator_id?: string
          id?: string
        }
        Relationships: []
      }
      affiliate_referrals: {
        Row: {
          affiliate_link_id: string
          commission_amount: number
          commission_rate: number
          created_at: string
          id: string
          status: string
          subscription_id: string
        }
        Insert: {
          affiliate_link_id: string
          commission_amount: number
          commission_rate: number
          created_at?: string
          id?: string
          status?: string
          subscription_id: string
        }
        Update: {
          affiliate_link_id?: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          id?: string
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_affiliate_link_id_fkey"
            columns: ["affiliate_link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_referrals_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_requests: {
        Row: {
          created_at: string
          id: string
          reviewed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      coin_packages: {
        Row: {
          active: boolean
          bonus: number
          coins: number
          created_at: string
          id: string
          label: string | null
          price_brl: number
          sort_order: number
        }
        Insert: {
          active?: boolean
          bonus?: number
          coins: number
          created_at?: string
          id?: string
          label?: string | null
          price_brl: number
          sort_order?: number
        }
        Update: {
          active?: boolean
          bonus?: number
          coins?: number
          created_at?: string
          id?: string
          label?: string | null
          price_brl?: number
          sort_order?: number
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          ref_id: string | null
          ref_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          ref_id?: string | null
          ref_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          ref_id?: string | null
          ref_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_events: {
        Row: {
          created_at: string
          creator_id: string | null
          event_name: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          creator_id?: string | null
          event_name: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          creator_id?: string | null
          event_name?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      creator_lives: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          id: string
          min_plan: string
          scheduled_at: string | null
          status: string
          stream_url: string | null
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          min_plan?: string
          scheduled_at?: string | null
          status?: string
          stream_url?: string | null
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          min_plan?: string
          scheduled_at?: string | null
          status?: string
          stream_url?: string | null
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_lives_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_plans: {
        Row: {
          creator_id: string
          description: string | null
          id: string
          plan_name: string
          price: number
        }
        Insert: {
          creator_id: string
          description?: string | null
          id?: string
          plan_name: string
          price: number
        }
        Update: {
          creator_id?: string
          description?: string | null
          id?: string
          plan_name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_plans_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fan_preferences: {
        Row: {
          categories: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          categories?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          categories?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fan_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fan_streaks: {
        Row: {
          current_streak: number
          last_check_in: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_check_in?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_check_in?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          creator_id: string
          fan_id: string
          id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          fan_id: string
          id?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          fan_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_fan_id_fkey"
            columns: ["fan_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gifts: {
        Row: {
          active: boolean
          cost: number
          emoji: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          cost: number
          emoji: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          cost?: number
          emoji?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      live_chat_messages: {
        Row: {
          created_at: string | null
          id: string
          live_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          live_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          live_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_messages_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "creator_lives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_chat_messages_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "creator_lives_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_gifts: {
        Row: {
          cost: number
          created_at: string
          creator_id: string
          gift_id: string
          id: string
          live_id: string
          sender_id: string
        }
        Insert: {
          cost: number
          created_at?: string
          creator_id: string
          gift_id: string
          id?: string
          live_id: string
          sender_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          creator_id?: string
          gift_id?: string
          id?: string
          live_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_gifts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_gifts_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_gifts_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "creator_lives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_gifts_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "creator_lives_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_gifts_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          id: string
          read: boolean
          receiver_id: string
          sender_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          read?: boolean
          receiver_id: string
          sender_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_checkouts: {
        Row: {
          amount: number
          created_at: string
          creator_id: string
          fan_id: string
          id: string
          plan_name: string
        }
        Insert: {
          amount: number
          created_at?: string
          creator_id: string
          fan_id: string
          id?: string
          plan_name: string
        }
        Update: {
          amount?: number
          created_at?: string
          creator_id?: string
          fan_id?: string
          id?: string
          plan_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_checkouts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_checkouts_fan_id_fkey"
            columns: ["fan_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_payments: {
        Row: {
          affiliate_ref: string | null
          amount: number
          created_at: string
          creator_id: string
          fan_id: string
          id: string
          plan: string
          syncpay_id: string
        }
        Insert: {
          affiliate_ref?: string | null
          amount: number
          created_at?: string
          creator_id: string
          fan_id: string
          id?: string
          plan: string
          syncpay_id: string
        }
        Update: {
          affiliate_ref?: string | null
          amount?: number
          created_at?: string
          creator_id?: string
          fan_id?: string
          id?: string
          plan?: string
          syncpay_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      post_bookmarks: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          text: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          text: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_unlocks: {
        Row: {
          coins_paid: number
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          coins_paid: number
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          coins_paid?: number
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_unlocks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_unlocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          viewer_id?: string | null
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
            foreignKeyName: "post_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          likes_count: number
          media_type: string | null
          media_url: string | null
          min_plan: string
          ppv_price: number | null
          text: string | null
          views_count: number
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          likes_count?: number
          media_type?: string | null
          media_url?: string | null
          min_plan?: string
          ppv_price?: number | null
          text?: string | null
          views_count?: number
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          likes_count?: number
          media_type?: string | null
          media_url?: string | null
          min_plan?: string
          ppv_price?: number | null
          text?: string | null
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved: boolean
          avatar_url: string | null
          bio: string | null
          category: string | null
          cover_url: string | null
          created_at: string
          handle: string | null
          id: string
          name: string
          role: string
          social_links: Json | null
        }
        Insert: {
          approved?: boolean
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string
          handle?: string | null
          id: string
          name: string
          role?: string
          social_links?: Json | null
        }
        Update: {
          approved?: boolean
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string
          handle?: string | null
          id?: string
          name?: string
          role?: string
          social_links?: Json | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          active: boolean
          created_at: string
          creator_id: string
          expires_at: string | null
          fan_id: string
          id: string
          plan: string
          syncpay_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          creator_id: string
          expires_at?: string | null
          fan_id: string
          id?: string
          plan: string
          syncpay_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          creator_id?: string
          expires_at?: string | null
          fan_id?: string
          id?: string
          plan?: string
          syncpay_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_fan_id_fkey"
            columns: ["fan_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tips: {
        Row: {
          amount: number
          created_at: string
          creator_id: string
          fan_id: string
          id: string
          syncpay_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          creator_id: string
          fan_id: string
          id?: string
          syncpay_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          creator_id?: string
          fan_id?: string
          id?: string
          syncpay_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tips_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_fan_id_fkey"
            columns: ["fan_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      creator_lives_public: {
        Row: {
          created_at: string | null
          creator_id: string | null
          description: string | null
          id: string | null
          min_plan: string | null
          scheduled_at: string | null
          status: string | null
          thumbnail_url: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string | null
          min_plan?: string | null
          scheduled_at?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string | null
          min_plan?: string | null
          scheduled_at?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_lives_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_ban_user: { Args: { p_user_id: string }; Returns: undefined }
      admin_delete_post: { Args: { p_post_id: string }; Returns: undefined }
      can_message_creator: { Args: { p_creator_id: string }; Returns: boolean }
      can_view_post_media: {
        Args: { p_creator_id: string; p_min_plan: string }
        Returns: boolean
      }
      cancel_subscription: { Args: { p_sub_id: string }; Returns: undefined }
      claim_welcome_bonus: { Args: never; Returns: number }
      credit_coins: {
        Args: {
          p_amount: number
          p_description: string
          p_ref_id: string
          p_ref_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      daily_check_in: { Args: never; Returns: Json }
      get_admin_creator_stats: {
        Args: never
        Returns: {
          active_subs: number
          creator_category: string
          creator_handle: string
          creator_id: string
          creator_name: string
          estimated_revenue: number
          post_count: number
        }[]
      }
      get_creator_list: {
        Args: {
          p_category?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
        }
        Returns: {
          avatar_url: string
          bio: string
          category: string
          cover_url: string
          created_at: string
          handle: string
          id: string
          min_price: number
          name: string
          post_count: number
          role: string
          social_links: Json
          subscriber_count: number
        }[]
      }
      get_creator_monthly_revenue: {
        Args: { p_creator_id: string }
        Returns: {
          month: string
          value: number
        }[]
      }
      get_creator_post_stats: {
        Args: { p_creator_id: string }
        Returns: {
          created_at: string
          likes_count: number
          media_type: string
          post_id: string
          text: string
          views_count: number
        }[]
      }
      get_feed_posts: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          creator: Json
          creator_id: string
          id: string
          likes_count: number
          media_type: string
          media_url: string
          min_plan: string
          ppv_price: number
          text: string
          unlocked: boolean
        }[]
      }
      get_platform_stats: {
        Args: never
        Returns: {
          estimated_revenue: number
          total_active_subs: number
          total_creators: number
          total_fans: number
          total_posts: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      plan_rank: { Args: { plan: string }; Returns: number }
      record_checkout_abandoned: {
        Args: {
          p_amount: number
          p_creator_id: string
          p_creator_name: string
          p_fan_id: string
          p_plan_name: string
        }
        Returns: undefined
      }
      send_live_gift: {
        Args: { p_gift_id: string; p_live_id: string }
        Returns: undefined
      }
      send_renewal_reminder: { Args: { p_sub_id: string }; Returns: undefined }
      tip_with_coins: {
        Args: { p_amount: number; p_creator_id: string; p_message?: string }
        Returns: undefined
      }
      track_post_view: { Args: { p_post_id: string }; Returns: undefined }
      unlock_post_with_coins: {
        Args: { p_post_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
