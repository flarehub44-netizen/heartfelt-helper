import { Link } from "react-router-dom";
import { Coins, Plus } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";

const LOW_BALANCE_THRESHOLD = 20;

export default function CoinBadge() {
  const { data } = useWallet();
  const balance = data?.balance ?? 0;
  const isLow = balance < LOW_BALANCE_THRESHOLD;

  return (
    <Link
      to="/wallet"
      title={isLow ? "Saldo baixo — recarregar carteira" : "Minha carteira"}
      className={`relative flex items-center gap-1.5 rounded-full border px-3 h-9 text-sm font-semibold transition-colors ${
        isLow
          ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15"
          : "border-border/60 bg-muted/30 text-foreground hover:border-primary/50 hover:text-primary"
      }`}
    >
      <Coins className={`h-4 w-4 ${isLow ? "text-primary" : "text-yellow-400"}`} />
      <span>{balance.toLocaleString("pt-BR")}</span>
      {isLow && (
        <>
          <span className="hidden sm:inline text-xs font-medium opacity-80">Recarregar</span>
          <span className="sm:hidden flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Plus className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
        </>
      )}
    </Link>
  );
}
