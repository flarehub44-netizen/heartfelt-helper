import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { createPixCharge, confirmPixMockPayment } from "@/lib/payments.functions";
import { useAuth } from "@/hooks/use-auth";
import { Logo, PageContainer } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatBRL, tierLabel, tierBadgeClass } from "@/lib/format";
import { Check, Crown, QrCode } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/c/$handle")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.handle} — Vibe` },
      { name: "description", content: `Perfil de @${params.handle} na Vibe — assine para ter acesso a conteúdo exclusivo.` },
      { property: "og:title", content: `@${params.handle} na Vibe` },
      { property: "og:description", content: `Assine @${params.handle} e desbloqueie posts, mensagens e mais.` },
    ],
  }),
  component: CreatorProfile,
});

function CreatorProfile() {
  const { handle } = useParams({ from: "/c/$handle" });

  const { data: creator } = useQuery({
    queryKey: ["creator", handle],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, handle, display_name, bio, avatar_url, cover_url, is_creator")
        .eq("handle", handle)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: tiers = [] } = useQuery({
    queryKey: ["tiers", creator?.id],
    queryFn: async () => {
      if (!creator) return [];
      const { data, error } = await supabase
        .from("tiers")
        .select("*")
        .eq("creator_id", creator.id)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!creator,
  });

  if (!creator) {
    return (
      <div className="min-h-screen">
        <PublicHeader />
        <PageContainer>
          <div className="py-32 text-center">
            <p className="font-display text-4xl">Criador não encontrado</p>
            <Link to="/explorar" className="mt-4 inline-block text-primary hover:underline">
              Ver outros criadores →
            </Link>
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <div
        className="h-56 w-full md:h-72"
        style={{
          background: creator.cover_url ? `url(${creator.cover_url}) center/cover` : "var(--gradient-primary)",
        }}
      />
      <PageContainer>
        <div className="-mt-16 flex flex-col items-start gap-4 md:flex-row md:items-end">
          <div className="flex h-32 w-32 items-center justify-center rounded-3xl border-4 border-background bg-surface text-5xl font-bold uppercase shadow-elevated">
            {creator.avatar_url ? (
              <img src={creator.avatar_url} alt={creator.display_name} className="h-full w-full rounded-2xl object-cover" />
            ) : (
              creator.display_name[0]
            )}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-4xl md:text-5xl">{creator.display_name}</h1>
            <p className="text-muted-foreground">@{creator.handle}</p>
            {creator.bio && <p className="mt-3 max-w-2xl text-foreground/80">{creator.bio}</p>}
          </div>
        </div>

        <section className="py-12">
          <h2 className="font-display text-3xl">Camadas de assinatura</h2>
          <p className="mt-1 text-muted-foreground">Escolha um nível e assine via Pix.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {tiers.map((t) => (
              <TierCard key={t.id} tier={t} creatorId={creator.id} />
            ))}
            {tiers.length === 0 && (
              <p className="col-span-3 text-muted-foreground">
                Este criador ainda não configurou camadas.
              </p>
            )}
          </div>
        </section>
      </PageContainer>
    </div>
  );
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <PageContainer>
        <div className="flex h-16 items-center justify-between">
          <Logo />
          <Link to="/explorar" className="text-sm text-muted-foreground hover:text-foreground">
            Explorar
          </Link>
        </div>
      </PageContainer>
    </header>
  );
}

function TierCard({
  tier,
  creatorId,
}: {
  tier: { id: string; name: string; description: string | null; price_brl_cents: number; benefits: string[]; sort_order: number };
  creatorId: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pixOpen, setPixOpen] = useState(false);
  const [pixData, setPixData] = useState<Awaited<ReturnType<typeof createPixCharge>> | null>(null);
  const qc = useQueryClient();

  const createCharge = useServerFn(createPixCharge);
  const confirm = useServerFn(confirmPixMockPayment);

  const startMutation = useMutation({
    mutationFn: () => createCharge({ data: { creatorId, tierId: tier.id } }),
    onSuccess: (d) => {
      setPixData(d);
      setPixOpen(true);
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirm({ data: { paymentId: pixData!.paymentId } }),
    onSuccess: () => {
      toast.success("Pagamento confirmado! Você agora tem acesso.");
      setPixOpen(false);
      qc.invalidateQueries();
      navigate({ to: "/feed" });
    },
  });

  const isVip = tier.sort_order >= 2;

  return (
    <div
      className={`relative flex flex-col rounded-3xl border p-6 transition ${
        isVip ? "border-vip/40 shadow-glow" : "border-border bg-card shadow-card"
      }`}
      style={isVip ? { background: "var(--gradient-surface)" } : undefined}
    >
      {isVip && (
        <div className="absolute -top-3 right-4 inline-flex items-center gap-1 rounded-full gradient-vip px-3 py-1 text-xs font-semibold text-vip-foreground">
          <Crown className="h-3 w-3" /> Recomendado
        </div>
      )}
      <span className={`inline-block w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${tierBadgeClass(tier.sort_order)}`}>
        {tierLabel(tier.sort_order)}
      </span>
      <h3 className="mt-4 text-2xl font-semibold">{tier.name}</h3>
      {tier.description && <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>}
      <p className="mt-5 font-display text-4xl">
        {formatBRL(tier.price_brl_cents)}
        <span className="text-base text-muted-foreground">/mês</span>
      </p>
      <ul className="mt-5 space-y-2 text-sm">
        {tier.benefits.map((b) => (
          <li key={b} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <Button
        onClick={() => {
          if (!user) {
            navigate({ to: "/auth", search: { redirect: window.location.pathname } });
            return;
          }
          startMutation.mutate();
        }}
        disabled={startMutation.isPending}
        className={`mt-6 w-full ${isVip ? "gradient-vip text-vip-foreground" : "gradient-primary text-primary-foreground shadow-glow"}`}
      >
        {startMutation.isPending ? "Gerando Pix..." : "Assinar com Pix"}
      </Button>

      <Dialog open={pixOpen} onOpenChange={setPixOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pague com Pix</DialogTitle>
            <DialogDescription>
              {pixData && `Valor: ${formatBRL(pixData.amountCents)}`} — Escaneie o QR ou copie o código.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="flex h-44 w-44 items-center justify-center rounded-2xl border border-border bg-surface">
              <QrCode className="h-32 w-32 text-foreground/80" />
            </div>
            {pixData && (
              <code className="block w-full max-w-full overflow-hidden truncate rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                {pixData.pixPayload}
              </code>
            )}
            <p className="text-center text-xs text-muted-foreground">
              Modo demonstração: clique abaixo para simular o pagamento.
            </p>
            <Button
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
              className="w-full gradient-primary text-primary-foreground"
            >
              {confirmMutation.isPending ? "Confirmando..." : "Simular pagamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
