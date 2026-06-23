import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Compass, Lock, Sparkles } from "lucide-react";
import { tierBadgeClass, tierLabel, relativeTimePtBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/feed")({
  component: FeedPage,
});

function FeedPage() {
  const { user } = useAuth();

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["my-subs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("creator_id, status, tier_id, tier:tiers(name, sort_order), creator:profiles!subscriptions_creator_id_fkey(handle, display_name, avatar_url)")
        .eq("fan_id", user!.id)
        .eq("status", "active");
      if (error) console.error(error);
      return data ?? [];
    },
  });

  const creatorIds = subscriptions.map((s) => s.creator_id);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["feed", creatorIds.join(",")],
    enabled: creatorIds.length >= 0,
    queryFn: async () => {
      if (creatorIds.length === 0) return [];
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, body, media_urls, min_tier_sort_order, published_at, creator_id, creator:profiles!posts_creator_id_fkey(handle, display_name, avatar_url)")
        .in("creator_id", creatorIds)
        .order("published_at", { ascending: false })
        .limit(50);
      if (error) console.error(error);
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-8">
        <h1 className="font-display text-4xl">Seu feed</h1>
        <p className="text-muted-foreground">
          Posts das suas assinaturas ativas.
        </p>
      </header>

      {subscriptions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-4 font-display text-2xl">Você ainda não assina ninguém</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Encontre criadores que você gosta e assine suas camadas.
          </p>
          <Link
            to="/explorar"
            className="mt-6 inline-flex items-center gap-2 rounded-full gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            <Compass className="h-4 w-4" />
            Explorar criadores
          </Link>
        </div>
      ) : isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : posts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center">
          <p className="font-display text-2xl">Sem novidades por enquanto</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Seus criadores ainda não publicaram. Volte em breve.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {posts.map((p) => (
            <article key={p.id} className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
              <header className="flex items-center gap-3 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-sm font-bold uppercase">
                  {p.creator?.avatar_url ? (
                    <img src={p.creator.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    p.creator?.display_name?.[0] ?? "?"
                  )}
                </div>
                <div className="flex-1">
                  <Link to="/c/$handle" params={{ handle: p.creator?.handle ?? "" }} className="font-semibold hover:underline">
                    {p.creator?.display_name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    @{p.creator?.handle} · {relativeTimePtBR(p.published_at)}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tierBadgeClass(p.min_tier_sort_order)}`}>
                  {tierLabel(p.min_tier_sort_order)}
                </span>
              </header>
              <div className="px-5 pb-5">
                <h2 className="text-xl font-semibold">{p.title}</h2>
                {p.body && <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/85">{p.body}</p>}
                {p.media_urls && p.media_urls.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {p.media_urls.map((u: string, i: number) => (
                      <img key={i} src={u} alt="" className="aspect-square w-full rounded-xl object-cover" />
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
