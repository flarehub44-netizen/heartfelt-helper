import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CreatorWithStats } from "@/types/profile";

type CreatorRow = {
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
  min_price: number;
  subscriber_count: number;
  post_count: number;
};

export type CreatorListParams = {
  search?: string;
  category?: string | null;
  sort?: "popular" | "preco" | "novo";
  limit?: number;
};

function mapRow(row: CreatorRow): CreatorWithStats {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    bio: row.bio,
    avatar_url: row.avatar_url,
    cover_url: row.cover_url,
    category: row.category,
    role: row.role,
    created_at: row.created_at,
    social_links: row.social_links,
    price: Number(row.min_price),
    subscribers: Number(row.subscriber_count),
    postCount: Number(row.post_count),
    avatar: row.avatar_url || "",
    cover: row.cover_url || "",
    posts: Number(row.post_count),
    rating: 4.8,
    verified: true,
    tags: row.category ? [row.category] : [],
  };
}

async function fetchCreatorPage(
  params: CreatorListParams,
  offset: number
): Promise<CreatorWithStats[]> {
  const limit = params.limit ?? 24;
  const { data, error } = await supabase.rpc("get_creator_list", {
    p_limit: limit,
    p_offset: offset,
    p_category: params.category && params.category !== "Todos" ? params.category : null,
    p_search: params.search?.trim() || null,
    p_sort: params.sort ?? "popular",
  });
  if (error) {
    // Fallback if 5-arg RPC not deployed yet
    const fallback = await supabase.rpc("get_creator_list", {
      p_limit: limit,
      p_offset: offset,
      p_category: params.category && params.category !== "Todos" ? params.category : null,
      p_search: params.search?.trim() || null,
    });
    if (fallback.error) throw fallback.error;
    return (fallback.data ?? []).map((row: CreatorRow) => mapRow(row));
  }
  return (data ?? []).map((row: CreatorRow) => mapRow(row));
}

/** Default list (feed suggestions, onboarding) — first page popular. */
export function useCreators() {
  return useQuery({
    queryKey: ["creators"],
    queryFn: () => fetchCreatorPage({ limit: 50, sort: "popular" }, 0),
  });
}

export function useCreatorsInfinite(params: CreatorListParams) {
  const pageSize = params.limit ?? 24;
  return useInfiniteQuery({
    queryKey: [
      "creators-infinite",
      params.search ?? "",
      params.category ?? "Todos",
      params.sort ?? "popular",
      pageSize,
    ],
    queryFn: ({ pageParam }) =>
      fetchCreatorPage({ ...params, limit: pageSize }, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastOffset) =>
      lastPage.length < pageSize ? undefined : lastOffset + pageSize,
  });
}
