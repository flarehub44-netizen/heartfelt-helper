import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  postId: string;
  price: number;
  onUnlocked?: () => void;
}

export default function UnlockPostButton({ postId, price, onUnlocked }: Props) {
  const { user } = useAuth();
  const { data: wallet } = useWallet();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const balance = wallet?.balance ?? 0;

  if (!user) {
    return (
      <Link to="/login">
        <Button className="w-full"><Lock className="h-4 w-4 mr-2" />Entrar para desbloquear</Button>
      </Link>
    );
  }

  if (balance < price) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-center text-muted-foreground">
          Você tem <strong className="text-yellow-400">{balance} 🪙</strong>, precisa de <strong>{price} 🪙</strong>
        </p>
        <p className="text-[11px] text-center text-muted-foreground">
          Pagamento em moedas da carteira — não é Pix.
        </p>
        <Link to="/wallet">
          <Button className="w-full">Comprar moedas</Button>
        </Link>
      </div>
    );
  }

  const handleUnlock = async () => {
    setLoading(true);
    const { error } = await supabase.rpc("unlock_post_with_coins", { p_post_id: postId });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Conteúdo desbloqueado!");
    qc.invalidateQueries({ queryKey: ["wallet", user.id] });
    qc.invalidateQueries();
    onUnlocked?.();
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-center text-muted-foreground">
        Desbloqueio com moedas da carteira (não é Pix).
      </p>
      <Button onClick={handleUnlock} disabled={loading} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Lock className="h-4 w-4 mr-2" />Desbloquear por {price} 🪙</>}
      </Button>
    </div>
  );
}
