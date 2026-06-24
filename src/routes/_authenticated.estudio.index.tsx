import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, tierLabel, tierBadgeClass } from "@/lib/format";
import { DollarSign, FileText, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/estudio/")({
  component: StudioOverview,
});

function StudioOverview() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["studio-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: subs }, { count: postCount }, { data: tiers }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("id, tier_id, tier:tiers(price_brl_cents, name, sort_order)")
          .eq("creator_id", user!.id)
          .eq("status", "active"),
        supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("creator_id", user!.id),
        supabase.from("tiers").select("id, name, sort_order").eq("creator_id", user!.id).order("sort_order"),
      ]);

      const mrr = (subs ?? []).reduce((sum, s) => sum + (s.tier?.price_brl_cents ?? 0), 0);
      const byTier = (tiers ?? []).map((t) => ({
        ...t,
        count: (subs ?? []).filter((s) => s.tier_id === t.id).length,
      }));
      return { mrr, subscribers: subs?.length ?? 0, postCount: postCount ?? 0, byTier };
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={DollarSign} label="MRR (Receita mensal)" value={formatBRL(stats?.mrr ?? 0)} />
        <StatCard icon={Users} label="Assinantes ativos" value={String(stats?.subscribers ?? 0)} />
        <StatCard icon={FileText} label="Posts publicados" value={String(stats?.postCount ?? 0)} />
      </div>

      <section className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-2xl">Distribuição por camada</h2>
        <div className="mt-4 space-y-3">
          {stats?.byTier.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl bg-surface/60 p-3">
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tierBadgeClass(t.sort_order)}`}>
                  {tierLabel(t.sort_order)}
                </span>
                <span className="font-medium">{t.name}</span>
              </div>
              <span className="font-display text-xl">{t.count}</span>
            </div>
          ))}
          {(!stats || stats.byTier.length === 0) && (
            <p className="text-muted-foreground">Configure suas camadas para começar.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow">
        <Icon className="h-5 w-5 text-primary-foreground" />
      </div>
      <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl">{value}</p>
    </div>
  );
}
