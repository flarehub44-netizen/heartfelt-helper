import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { usePendingCheckouts } from "@/hooks/usePendingCheckouts";
import { PLAN_LABELS } from "@/lib/plans";
import { setCheckoutIntent, subscribePath } from "@/lib/checkoutIntent";

export function PendingCheckoutBanner() {
  const { data: pending = [] } = usePendingCheckouts();

  if (!pending.length) return null;

  const first = pending[0];
  const planLabel = PLAN_LABELS[first.plan_name] ?? first.plan_name;
  const amount = first.amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const creatorName = first.creator_name ?? "criadora";
  const href = subscribePath(first.creator_id, {
    handle: first.creator_handle,
    plan: first.plan_name,
  });

  return (
    <div className="glass-card rounded-2xl p-4 border border-orange-500/30 bg-orange-500/5 flex items-start gap-3">
      <Clock className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {pending.length === 1
            ? `Pix pendente · ${amount} · ${creatorName}`
            : `${pending.length} checkouts Pix pendentes`}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {pending.length === 1
            ? `Plano ${planLabel} — retome o pagamento para liberar o conteúdo.`
            : "Retome o pagamento mais recente para não perder o acesso."}
        </p>
      </div>
      <Link
        to={href}
        onClick={() =>
          setCheckoutIntent({
            creatorId: first.creator_id,
            handle: first.creator_handle,
            plan: first.plan_name,
            amount: first.amount,
          })
        }
        className="flex-shrink-0 rounded-full bg-gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow hover:scale-105 transition-transform"
      >
        Retomar Pix
      </Link>
    </div>
  );
}
