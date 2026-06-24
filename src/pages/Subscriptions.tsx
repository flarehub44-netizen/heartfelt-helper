import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CreditCard, Clock, Loader2, TrendingUp, DollarSign, Users, Bookmark, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useMySubscriptionsDetail } from "@/hooks/useMySubscriptions";
import { useMyAffiliateEarnings } from "@/hooks/useMyAffiliateEarnings";
import { useAuth } from "@/contexts/AuthContext";
import { PLAN_LABELS } from "@/lib/plans";
import { PixPaymentModal } from "@/components/PixPaymentModal";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Subscriptions = () => {
  const { user } = useAuth();
  const { data: subs = [], isLoading } = useMySubscriptionsDetail();
  const { data: affiliateData } = useMyAffiliateEarnings();
  const [pixModal, setPixModal] = useState<{
    creatorId: string;
    creatorName: string;
    planName: string;
    amount: number;
  } | null>(null);

  const [cancelConfirm, setCancelConfirm] = useState<{
    subId: string;
    creatorName: string;
  } | null>(null);

  const qc = useQueryClient();

  const cancelSub = useMutation({
    mutationFn: async (subId: string) => {
      const { error } = await supabase.rpc("cancel_subscription" as any, { p_sub_id: subId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mySubscriptions"] });
      toast.success("Assinatura cancelada.");
      setCancelConfirm(null);
    },
    onError: () => toast.error("Erro ao cancelar assinatura. Tente novamente."),
  });

  // Fire renewal reminders for subscriptions expiring in ≤ 3 days (fire-and-forget)
  useEffect(() => {
    if (!subs.length) return;
    subs.forEach((sub) => {
      const days = daysUntil(sub.expires_at);
      if (days !== null && days <= 3 && days > 0) {
        void supabase.rpc("send_renewal_reminder" as any, { p_sub_id: sub.id });
      }
    });
  }, [subs.length]);

  const daysUntil = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-2xl pt-24 pb-16">
        <div className="flex items-center gap-3 mb-8">
          <CreditCard className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold text-foreground">Minhas assinaturas</h1>
          <Link
            to="/bookmarks"
            className="ml-auto flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
          >
            <Bookmark className="h-3.5 w-3.5" />
            Salvos
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : subs.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <p className="text-muted-foreground mb-4">Você ainda não tem assinaturas ativas.</p>
            <Link
              to="/discover"
              className="inline-flex rounded-full bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow hover:scale-105 transition-transform"
            >
              Descobrir criadores
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {subs.map((sub) => {
              const days = daysUntil(sub.expires_at);
              const expiringSoon = days !== null && days <= 7 && days > 0;
              return (
                <div
                  key={sub.id}
                  className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <img
                    src={sub.creator_avatar || "/placeholder.svg"}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/30"
                  />
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/creator/${sub.creator_id}`}
                      className="font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      {sub.creator_name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      Plano {PLAN_LABELS[sub.plan] ?? sub.plan} · R${" "}
                      {sub.price.toFixed(2).replace(".", ",")}/mês
                    </p>
                    {sub.expires_at && (
                      <p className={`text-xs mt-1 flex items-center gap-1 ${expiringSoon ? "text-amber-500" : "text-muted-foreground"}`}>
                        <Clock className="h-3 w-3" />
                        Expira em {format(new Date(sub.expires_at), "dd MMM yyyy", { locale: ptBR })}
                        {expiringSoon && ` (${days} dias)`}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <button
                      onClick={() =>
                        setPixModal({
                          creatorId: sub.creator_id,
                          creatorName: sub.creator_name,
                          planName: sub.plan,
                          amount: sub.price,
                        })
                      }
                      className="rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow hover:scale-105 transition-transform whitespace-nowrap"
                    >
                      Renovar
                    </button>
                    <button
                      onClick={() => setCancelConfirm({ subId: sub.id, creatorName: sub.creator_name })}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                    >
                      <X className="h-3 w-3" />
                      Cancelar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Affiliate earnings section */}
      {affiliateData && affiliateData.conversions > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-5">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h2 className="font-display text-xl font-bold text-foreground">Ganhos de Afiliado</h2>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="glass-card rounded-2xl p-4 text-center">
              <DollarSign className="h-5 w-5 text-green-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">
                R$ {affiliateData.totalEarned.toFixed(2).replace(".", ",")}
              </p>
              <p className="text-xs text-muted-foreground">Total ganho</p>
            </div>
            <div className="glass-card rounded-2xl p-4 text-center">
              <Clock className="h-5 w-5 text-amber-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">
                R$ {affiliateData.pendingPayout.toFixed(2).replace(".", ",")}
              </p>
              <p className="text-xs text-muted-foreground">A receber</p>
            </div>
            <div className="glass-card rounded-2xl p-4 text-center">
              <Users className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{affiliateData.conversions}</p>
              <p className="text-xs text-muted-foreground">Conversões</p>
            </div>
          </div>

          <div className="space-y-2">
            {affiliateData.earnings.slice(0, 10).map((e) => (
              <div key={e.id} className="glass-card rounded-xl p-4 flex items-center gap-3">
                <img
                  src={e.creatorAvatar || "/placeholder.svg"}
                  alt={e.creatorName}
                  className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{e.creatorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true, locale: ptBR })}
                    {" · "}comissão {(e.commissionRate * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-green-400">
                    +R$ {e.commissionAmount.toFixed(2).replace(".", ",")}
                  </p>
                  <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${e.status === "paid" ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400"}`}>
                    {e.status === "paid" ? "Pago" : "Pendente"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {user && pixModal && (
        <PixPaymentModal
          open={!!pixModal}
          onClose={() => setPixModal(null)}
          onSuccess={() => setPixModal(null)}
          creatorId={pixModal.creatorId}
          creatorName={pixModal.creatorName}
          planName={pixModal.planName}
          amount={pixModal.amount}
          fanId={user.id}
          fanEmail={user.email ?? ""}
        />
      )}

      {/* Cancellation retention dialog */}
      <AlertDialog open={!!cancelConfirm} onOpenChange={(o) => !o && setCancelConfirm(null)}>
        <AlertDialogContent className="max-w-sm bg-card border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl text-foreground">
              Cancelar assinatura?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Ao cancelar, você perde <span className="font-semibold text-foreground">acesso imediato</span> a todo o
              conteúdo exclusivo de{" "}
              <span className="font-semibold text-foreground">{cancelConfirm?.creatorName}</span>.
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogCancel
              className="w-full rounded-xl bg-gradient-primary text-primary-foreground font-bold shadow-glow border-0 hover:scale-[1.02] transition-transform order-first"
            >
              Manter minha assinatura
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelConfirm && cancelSub.mutate(cancelConfirm.subId)}
              disabled={cancelSub.isPending}
              className="w-full rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/30 transition-colors"
            >
              {cancelSub.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Cancelar mesmo assim"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Subscriptions;
