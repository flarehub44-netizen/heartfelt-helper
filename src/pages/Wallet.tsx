import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, Loader2, Sparkles, ArrowDownRight, ArrowUpRight, Gift, Heart, Lock } from "lucide-react";
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
            <span className="text-5xl font-bold">{(wallet?.balance ?? 0).toLocaleString("pt-BR")}</span>
            <span className="text-lg opacity-80 mt-2">moedas</span>
          </div>
        </section>

        {/* Packages */}
        <h2 className="text-xl font-bold mt-10 mb-4">Comprar moedas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {packages.map((p) => (
            <button
              key={p.id}
              onClick={() => setBuying(p)}
              className="group relative rounded-2xl border border-border/60 bg-card p-4 text-left hover:border-primary/60 hover:shadow-glow transition-all"
            >
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
          ))}
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
