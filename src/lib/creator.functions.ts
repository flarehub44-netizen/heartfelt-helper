import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createPostSchema = z.object({
  title: z.string().trim().min(1).max(140),
  body: z.string().trim().max(5000),
  media_urls: z.array(z.string().url()).max(8).default([]),
  min_tier_sort_order: z.number().int().min(0).max(2),
});

export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createPostSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("posts")
      .insert({
        creator_id: userId,
        title: data.title,
        body: data.body,
        media_urls: data.media_urls,
        min_tier_sort_order: data.min_tier_sort_order,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const tierUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.enum(["fan", "super_fan", "vip"]),
  name: z.string().trim().min(1).max(40),
  description: z.string().trim().max(300).default(""),
  price_brl_cents: z.number().int().min(0).max(100000000),
  benefits: z.array(z.string().trim().min(1).max(120)).max(10).default([]),
  sort_order: z.number().int().min(0).max(2),
});

export const upsertTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => tierUpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.id) {
      const { error } = await supabase
        .from("tiers")
        .update({
          name: data.name,
          description: data.description,
          price_brl_cents: data.price_brl_cents,
          benefits: data.benefits,
        })
        .eq("id", data.id)
        .eq("creator_id", userId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabase
      .from("tiers")
      .insert({
        creator_id: userId,
        slug: data.slug,
        name: data.name,
        description: data.description,
        price_brl_cents: data.price_brl_cents,
        benefits: data.benefits,
        sort_order: data.sort_order,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
