import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useExpiringSubscriptions } from "@/hooks/useMySubscriptions";
import { PLAN_LABELS } from "@/lib/plans";
import { setCheckoutIntent, subscribePath } from "@/lib/checkoutIntent";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function RenewalBanner() {
  const { data: expiring = [] } = useExpiringSubscriptions(7);

  if (!expiring.length) return null;

  const first = expiring[0];
  const when = first.expires_at
    ? formatDistanceToNow(new Date(first.expires_at), { locale: ptBR, addSuffix: true })
    : "em breve";

  const renewHref =
    expiring.length === 1
      ? subscribePath(first.creator_id, {
          handle: first.creator_handle,
          plan: first.plan,
        })
      : "/subscriptions";

  return (
    <div className="glass-card rounded-2xl p-4 border border-amber-500/30 bg-amber-500/5 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {expiring.length === 1
            ? `Sua assinatura ${PLAN_LABELS[first.plan] ?? first.plan} com ${first.creator_name} expira ${when}`
            : `${expiring.length} assinaturas expiram nos próximos 7 dias`}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Renove via Pix para continuar com acesso ao conteúdo exclusivo.
        </p>
      </div>
      <Link
        to={renewHref}
        onClick={() => {
          if (expiring.length === 1) {
            setCheckoutIntent({
              creatorId: first.creator_id,
              handle: first.creator_handle,
              plan: first.plan,
              amount: first.price,
            });
          }
        }}
        className="flex-shrink-0 rounded-full bg-gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow hover:scale-105 transition-transform"
      >
        Renovar agora
      </Link>
    </div>
  );
}
