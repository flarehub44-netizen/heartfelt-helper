import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, Loader2, Sparkles, ArrowDownRight, ArrowUpRight, Gift, Heart, Lock, AlertCircle, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

const LOW_BALANCE_THRESHOLD = 50;


type Package = {
  id: string; coins: number; price_brl: number; bonus: number; label: string | null;
};

type Tx = {
  id: string; amount: number; type: string; description: string | null; created_at: string;
};

const TX_META: Record<string, { icon: typeof Coins; label: string; color: string }> = {
  purchase:       { icon: Coins,         label: "Compra de moedas",       color: "text-green-400" },
  gift_sent:      { icon: Gift,          label: "Presente enviado",       color: "text-red-400" },
  gift_received:  { icon: Gift,          label: "Presente recebido",      color: "text-green-400" },
  tip_sent:       { icon: Heart,         label: "Gorjeta enviada",        color: "text-red-400" },
  tip_received:   { icon: Heart,         label: "Gorjeta recebida",       color: "text-green-400" },
  ppv_spent:      { icon: Lock,          label: "Conteúdo desbloqueado",  color: "text-red-400" },
  ppv_received:   { icon: Lock,          label: "Venda PPV",              color: "text-green-400" },
  admin_adjust:   { icon: Sparkles,      label: "Ajuste",                 color: "text-blue-400" },
  refund:         { icon: ArrowDownRight,label: "Reembolso",              color: "text-green-400" },
};

export default function Wallet() {
  const { user } = useAuth();
  const { data: wallet } = useWallet();
  const qc = useQueryClient();
  const [buying, setBuying] = useState<Package | null>(null);

  const { data: packages = [] } = useQuery({
    queryKey: ["coin-packages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("coin_packages")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      return (data ?? []) as Package[];
    },
  });

  const { data: txs = [] } = useQuery({
    queryKey: ["coin-tx", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("coin_transactions")
        .select("id, amount, type, description, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      return (data ?? []) as Tx[];
    },
    enabled: !!user,
  });

  // First purchase = no "purchase" tx in history yet
  const { data: hasPurchasedBefore = false } = useQuery({
    queryKey: ["has-purchased", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { count } = await supabase
        .from("coin_transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("type", "purchase");
      return (count ?? 0) > 0;
    },
    enabled: !!user,
  });
  const isFirstPurchase = !hasPurchasedBefore;
  const balance = wallet?.balance ?? 0;
  const isLowBalance = balance < LOW_BALANCE_THRESHOLD;


  // Realtime: refresh balance when a new tx hits
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`wallet:${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["wallet", user.id] }),
      )
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "coin_transactions", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["coin-tx", user.id] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-3xl pt-24 pb-32 px-4">
        {/* Balance card */}
        <section className="rounded-3xl border border-border/50 bg-gradient-primary p-8 shadow-glow text-primary-foreground">
          <p className="text-sm opacity-80">Seu saldo</p>
          <div className="flex items-center gap-3 mt-2">
            <Coins className="h-8 w-8" />
            <span className="text-5xl font-bold">{balance.toLocaleString("pt-BR")}</span>
            <span className="text-lg opacity-80 mt-2">moedas</span>
          </div>
        </section>

        {/* Low balance banner */}
        {isLowBalance && balance > 0 && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-4">
            <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Seu saldo está baixo</p>
              <p className="text-xs text-muted-foreground">
                Recarregue para continuar desbloqueando posts e enviando gorjetas.
              </p>
            </div>
            <a
              href="#packages"
              className="rounded-full bg-yellow-500 text-black px-4 py-1.5 text-xs font-bold hover:scale-105 transition-transform flex-shrink-0"
            >
              Recarregar
            </a>
          </div>
        )}

        {/* First purchase promo */}
        {isFirstPurchase && (
          <div className="mt-4 relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary shadow-glow flex-shrink-0">
              <Flame className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">Oferta de boas-vindas</p>
              <p className="text-xs text-muted-foreground">
                Sua <strong className="text-foreground">primeira recarga</strong> vem com bônus extra. Escolha um pacote abaixo.
              </p>
            </div>
          </div>
        )}

        {/* Packages */}
        <h2 id="packages" className="text-xl font-bold mt-10 mb-4 scroll-mt-24">Comprar moedas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {packages.map((p, idx) => {
            // Highlight the "popular" middle package (or 2nd) as the first-purchase recommendation
            const isFeatured = isFirstPurchase && idx === Math.min(1, packages.length - 1);
            return (
              <button
                key={p.id}
                onClick={() => setBuying(p)}
                className={`group relative rounded-2xl border p-4 text-left transition-all ${
                  isFeatured
                    ? "border-primary/70 bg-primary/5 shadow-glow ring-1 ring-primary/40"
                    : "border-border/60 bg-card hover:border-primary/60 hover:shadow-glow"
                }`}
              >
                {isFeatured && (
                  <span className="absolute -top-2 left-3 rounded-full bg-gradient-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold shadow-glow whitespace-nowrap">
                    Recomendado p/ você
                  </span>
                )}
                {p.bonus > 0 && (
                  <span className="absolute -top-2 right-3 rounded-full bg-yellow-500 text-black px-2 py-0.5 text-[10px] font-bold">
                    +{p.bonus} bônus
                  </span>
                )}
                <Coins className="h-6 w-6 text-yellow-400 mb-2" />
                <p className="text-2xl font-bold text-foreground">{p.coins + p.bonus}</p>
                <p className="text-xs text-muted-foreground">moedas</p>
                <p className="mt-3 text-sm font-semibold text-primary">
                  R$ {Number(p.price_brl).toFixed(2).replace(".", ",")}
                </p>
                {p.label && <p className="text-[10px] text-muted-foreground mt-1">{p.label}</p>}
              </button>
            );
          })}
        </div>


        {/* History */}
        <h2 className="text-xl font-bold mt-10 mb-4">Histórico</h2>
        <div className="rounded-2xl border border-border/50 bg-card divide-y divide-border/40">
          {txs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma movimentação ainda.</p>
          )}
          {txs.map((tx) => {
            const meta = TX_META[tx.type] ?? { icon: Coins, label: tx.type, color: "text-foreground" };
            const Icon = meta.icon;
            return (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-9 w-9 rounded-full bg-muted/40 flex items-center justify-center flex-shrink-0">
                  <Icon className={`h-4 w-4 ${meta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{meta.label}</p>
                  {tx.description && <p className="text-xs text-muted-foreground truncate">{tx.description}</p>}
                  <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString("pt-BR")}</p>
                </div>
                <span className={`text-sm font-bold tabular-nums ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount}
                </span>
              </div>
            );
          })}
        </div>
      </main>

      {buying && <PurchaseDialog pkg={buying} onClose={() => setBuying(null)} />}
    </div>
  );
}

function PurchaseDialog({ pkg, onClose }: { pkg: Package; onClose: () => void }) {
  const [step, setStep] = useState<"form" | "pix">("form");
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [pix, setPix] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const totalCoins = pkg.coins + (pkg.bonus ?? 0);

  const handleBuy = async () => {
    if (!name.trim() || cpf.replace(/\D/g, "").length !== 11) {
      toast.error("Preencha nome e CPF válidos");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("coin-purchase", {
      body: { package_id: pkg.id, fan_name: name.trim(), fan_cpf: cpf },
    });
    setLoading(false);
    if (error || !data?.pix_code) {
      toast.error(data?.error ?? "Falha ao gerar PIX");
      return;
    }
    setPix(data.pix_code);
    setStep("pix");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Comprar {totalCoins} moedas — R$ {Number(pkg.price_brl).toFixed(2).replace(".", ",")}
          </DialogTitle>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-3">
            <Input placeholder="Seu nome completo" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              placeholder="CPF (apenas números)"
              value={cpf}
              onChange={(e) => setCpf(e.target.value.replace(/\D/g, "").slice(0, 11))}
              maxLength={11}
            />
            <Button onClick={handleBuy} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar PIX"}
            </Button>
          </div>
        )}

        {step === "pix" && pix && (
          <div className="space-y-4 text-center">
            <div className="flex justify-center bg-white p-3 rounded-xl">
              <QRCodeSVG value={pix} size={200} />
            </div>
            <p className="text-xs text-muted-foreground">
              Escaneie ou copie o código abaixo. As moedas são creditadas automaticamente após o pagamento.
            </p>
            <div className="flex gap-2">
              <Input value={pix} readOnly className="font-mono text-xs" />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(pix);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
            <Button variant="ghost" onClick={onClose} className="w-full">Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
