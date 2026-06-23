import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const becomeCreatorSchema = z.object({
  bio: z.string().trim().max(500).optional(),
});

export const becomeCreator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => becomeCreatorSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("profiles")
      .update({ is_creator: true, ...(data.bio ? { bio: data.bio } : {}) })
      .eq("id", userId);

    // adiciona role creator (ignora conflito de unicidade)
    await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "creator" });

    // tiers padrão se não existirem
    const { data: existing } = await supabase
      .from("tiers")
      .select("id")
      .eq("creator_id", userId)
      .limit(1);
    if (!existing || existing.length === 0) {
      await supabase.from("tiers").insert([
        {
          creator_id: userId,
          slug: "fan",
          name: "Fã",
          description: "Acesso ao feed básico",
          price_brl_cents: 1990,
          benefits: ["Posts exclusivos", "Acesso à comunidade"],
          sort_order: 0,
        },
        {
          creator_id: userId,
          slug: "super_fan",
          name: "Super Fã",
          description: "Conteúdo extra e bastidores",
          price_brl_cents: 3990,
          benefits: [
            "Tudo do Fã",
            "Conteúdo bastidores",
            "Lives mensais",
          ],
          sort_order: 1,
        },
        {
          creator_id: userId,
          slug: "vip",
          name: "VIP",
          description: "Experiência completa e mensagens diretas",
          price_brl_cents: 9990,
          benefits: [
            "Tudo do Super Fã",
            "Mensagens diretas prioritárias",
            "Conteúdo VIP exclusivo",
          ],
          sort_order: 2,
        },
      ]);
    }

    return { ok: true };
  });

const updateProfileSchema = z.object({
  display_name: z.string().trim().min(1).max(60),
  bio: z.string().trim().max(500),
  avatar_url: z.string().url().or(z.literal("")).optional(),
  cover_url: z.string().url().or(z.literal("")).optional(),
});

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateProfileSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: data.display_name,
        bio: data.bio,
        avatar_url: data.avatar_url || null,
        cover_url: data.cover_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
