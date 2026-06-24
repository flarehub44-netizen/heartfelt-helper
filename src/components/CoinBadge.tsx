import { Link } from "react-router-dom";
import { Coins } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";

export default function CoinBadge() {
  const { data } = useWallet();
  const balance = data?.balance ?? 0;
  return (
    <Link
      to="/wallet"
      title="Minha carteira"
      className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3 h-9 text-sm font-semibold text-foreground hover:border-primary/50 hover:text-primary transition-colors"
    >
      <Coins className="h-4 w-4 text-yellow-400" />
      <span>{balance.toLocaleString("pt-BR")}</span>
    </Link>
  );
}
