import { useState } from "react";
import { Gift, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type GiftItem = { id: string; name: string; emoji: string; cost: number };

export default function SendGiftButton({ liveId }: { liveId: string }) {
  const { user } = useAuth();
  const { data: wallet } = useWallet();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const { data: gifts = [] } = useQuery({
    queryKey: ["gifts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("gifts")
        .select("id, name, emoji, cost")
        .eq("active", true)
        .order("sort_order");
      return (data ?? []) as GiftItem[];
    },
  });

  const balance = wallet?.balance ?? 0;

  const send = async (g: GiftItem) => {
    if (!user) return;
    if (balance < g.cost) {
      toast.error("Saldo insuficiente", {
        action: {
          label: "Recarregar",
          onClick: () => {
            window.location.href = `/wallet#packages`;
          },
        },
      });
      return;
    }
    setSending(g.id);
    const { error } = await supabase.rpc("send_live_gift", {
      p_live_id: liveId, p_gift_id: g.id,
    });
    setSending(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Você enviou ${g.emoji} ${g.name}!`);
    qc.invalidateQueries({ queryKey: ["wallet", user.id] });
    setOpen(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors flex-shrink-0"
          title="Enviar presente"
        >
          <Gift className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Enviar presente</span>
            <span className="text-sm font-normal text-muted-foreground">
              Saldo: <strong className="text-yellow-400">{balance} 🪙</strong>
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          {gifts.map((g) => {
            const can = balance >= g.cost;
            return (
              <button
                key={g.id}
                onClick={() => send(g)}
                disabled={!can || sending !== null}
                className={`rounded-xl border p-3 flex flex-col items-center gap-1 transition-all ${
                  can
                    ? "border-border/60 hover:border-primary/60 hover:bg-muted/50"
                    : "border-border/30 opacity-40 cursor-not-allowed"
                }`}
              >
                <span className="text-3xl">{g.emoji}</span>
                <span className="text-[11px] font-semibold text-foreground">{g.name}</span>
                <span className="text-[10px] text-yellow-400 font-bold">
                  {sending === g.id ? <Loader2 className="h-3 w-3 animate-spin" /> : `${g.cost} 🪙`}
                </span>
              </button>
            );
          })}
        </div>
        {balance < (gifts[0]?.cost ?? 0) && (
          <Link to="/wallet">
            <Button variant="outline" className="w-full">Comprar moedas</Button>
          </Link>
        )}
      </DialogContent>
    </Dialog>
  );
}
