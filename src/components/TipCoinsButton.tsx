import { useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const PRESETS = [10, 25, 50, 100, 250, 500];

export default function TipCoinsButton({ creatorId, creatorName }: { creatorId: string; creatorName: string }) {
  const { user } = useAuth();
  const { data: wallet } = useWallet();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(10);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const balance = wallet?.balance ?? 0;

  const send = async () => {
    if (!user) return;
    if (amount <= 0) { toast.error("Valor inválido"); return; }
    if (balance < amount) { toast.error("Saldo insuficiente"); return; }
    setSending(true);
    const { error } = await supabase.rpc("tip_with_coins", {
      p_creator_id: creatorId, p_amount: amount, p_message: msg || null,
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Você enviou ${amount} moedas para ${creatorName}!`);
    qc.invalidateQueries({ queryKey: ["wallet", user.id] });
    setOpen(false);
    setMsg("");
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Heart className="h-4 w-4 text-pink-400" />
          Enviar gorjeta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Gorjeta para {creatorName}</span>
            <span className="text-xs font-normal text-yellow-400">{balance} 🪙</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  amount === v ? "border-primary bg-primary/20 text-primary" : "border-border/60 text-foreground hover:border-primary/50"
                }`}
              >
                {v} 🪙
              </button>
            ))}
          </div>
          <Input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value || "0", 10)))}
            placeholder="Valor personalizado"
          />
          <Input
            value={msg}
            onChange={(e) => setMsg(e.target.value.slice(0, 200))}
            placeholder="Mensagem (opcional)"
          />
          {balance < amount ? (
            <Link to="/wallet" className="block">
              <Button variant="outline" className="w-full">Comprar moedas</Button>
            </Link>
          ) : (
            <Button onClick={send} disabled={sending} className="w-full">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Enviar ${amount} moedas`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
