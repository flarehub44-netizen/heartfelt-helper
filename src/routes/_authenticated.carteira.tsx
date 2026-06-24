import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, relativeTimePtBR } from "@/lib/format";
import { Copy, Wallet, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/carteira")({
  component: WalletPage,
});

function WalletPage() {
  const { user } = useAuth();

  const { data: aff } = useQuery({
    queryKey: ["affiliate", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_links")
        .select("code")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ["referrals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_referrals")
        .select("commission_brl_cents, created_at, referred_user_id")
        .eq("affiliate_user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("id, amount_brl_cents, status, created_at, paid_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  const totalCommission = referrals.reduce((s, r) => s + r.commission_brl_cents, 0);
  const link = aff?.code
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/auth?ref=${aff.code}`
    : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-4xl">Carteira & Afiliados</h1>
      <p className="text-muted-foreground">Ganhos por indicação e histórico de pagamentos.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <StatCard icon={Wallet} label="Comissão acumulada" value={formatBRL(totalCommission)} />
        <StatCard icon={Users} label="Indicações pagas" value={String(referrals.length)} />
        <StatCard icon={TrendingUp} label="Comissão por indicação" value="20%" />
      </div>

      <section className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-2xl">Seu link de afiliado</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Compartilhe e ganhe 20% da primeira assinatura de cada novo usuário indicado.
        </p>
        <div className="mt-4 flex gap-2">
          <code className="flex-1 truncate rounded-lg bg-muted px-3 py-2 text-sm">{link || "Carregando..."}</code>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(link);
              toast.success("Link copiado!");
            }}
            disabled={!link}
            className="gradient-primary text-primary-foreground"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl">Histórico de pagamentos</h2>
        <div className="mt-4 space-y-2">
          {payments.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-muted-foreground">
              Nenhum pagamento ainda.
            </p>
          )}
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div>
                <p className="font-semibold">{formatBRL(p.amount_brl_cents)}</p>
                <p className="text-xs text-muted-foreground">
                  Pix · {relativeTimePtBR(p.paid_at ?? p.created_at)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  p.status === "paid"
                    ? "bg-success/20 text-success"
                    : p.status === "pending"
                    ? "bg-vip/20 text-vip"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {p.status === "paid" ? "pago" : p.status === "pending" ? "pendente" : p.status}
              </span>
            </div>
          ))}
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
