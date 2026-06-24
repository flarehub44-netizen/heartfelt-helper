import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatBRL, relativeTimePtBR, tierLabel, tierBadgeClass } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/assinaturas")({
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const { user } = useAuth();
  const { data: subs = [] } = useQuery({
    queryKey: ["my-subscriptions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("id, status, current_period_end, started_at, tier:tiers(name, sort_order, price_brl_cents), creator:profiles!subs_creator_profile_fkey(handle, display_name, avatar_url)")
        .eq("fan_id", user!.id)
        .order("started_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-4xl">Minhas assinaturas</h1>
      <p className="text-muted-foreground">Gerencie os criadores que você apoia.</p>

      <div className="mt-8 space-y-3">
        {subs.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
            Você ainda não tem assinaturas.
          </p>
        )}
        {subs.map((s) => (
          <Link
            key={s.id}
            to="/c/$handle"
            params={{ handle: s.creator?.handle ?? "" }}
            className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card transition hover:border-primary/40"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-sm font-bold uppercase">
                {s.creator?.avatar_url ? (
                  <img src={s.creator.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  s.creator?.display_name?.[0] ?? "?"
                )}
              </div>
              <div>
                <p className="font-semibold">{s.creator?.display_name}</p>
                <p className="text-xs text-muted-foreground">
                  @{s.creator?.handle}
                  {s.current_period_end && ` · renova ${relativeTimePtBR(s.current_period_end)}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-right">
              {s.tier && (
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tierBadgeClass(s.tier.sort_order)}`}>
                  {tierLabel(s.tier.sort_order)}
                </span>
              )}
              <div>
                <p className="text-sm font-semibold">{s.tier && formatBRL(s.tier.price_brl_cents)}</p>
                <p className="text-xs capitalize text-muted-foreground">
                  {s.status === "active" ? "ativa" : s.status === "pending" ? "pendente" : s.status}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
