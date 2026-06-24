import type { Tables } from "@/integrations/supabase/types";

export interface CreatorWithStats {
  id: string;
  name: string;
  handle: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  category: string | null;
  role: string;
  created_at: string;
  social_links: unknown;
  // Aggregated
  price: number;
  subscribers: number;
  postCount: number;
  // Compat with mock Creator interface
  avatar: string;
  cover: string;
  posts: number;
  rating: number;
  verified: boolean;
  tags: string[];
}

export interface PostWithCreator {
  id: string;
  text: string | null;
  media_url: string | null;
  media_type: string | null;
  likes_count: number;
  min_plan: string;
  created_at: string;
  creator_id: string;
  creator: {
    id: string;
    name: string;
    handle: string | null;
    avatar_url: string | null;
    category?: string | null;
  };
}

export interface ConversationItem {
  contactId: string;
  contactName: string;
  contactAvatar: string | null;
  contactHandle: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}
