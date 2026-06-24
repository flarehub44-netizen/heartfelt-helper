import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Loader2, X, Smartphone, Shield, ShieldCheck, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendMetaEvent } from "@/lib/metaCapi";
import { trackConversion } from "@/lib/conversionEvents";

interface PixPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  creatorId: string;
  creatorName: string;
  planName: string;
  amount: number;
  fanId: string;
  fanEmail: string;
  creatorPixelId?: string;
  creatorAccessToken?: string;
  nextPlanName?: string;
  nextPlanDiff?: number;
  onUpgrade?: () => void;
}

type Step = "form" | "pix" | "success";

function formatCPF(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function PixPaymentModal({
  open,
  onClose,
  onSuccess,
  creatorId,
  creatorName,
  planName,
  amount,
  fanId,
  fanEmail,
  creatorPixelId,
  creatorAccessToken,
  nextPlanName,
  nextPlanDiff,
  onUpgrade,
}: PixPaymentModalProps) {
  const [step, setStep] = useState<Step>("form");
  const [fanName, setFanName] = useState("");
  const [fanCpf, setFanCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [pixCode, setPixCode] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(1800);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep("form");
      setFanName("");
      setFanCpf("");
      setPixCode("");
      setIdentifier("");
      setCopied(false);
      setLoading(false);
      setSecondsLeft(1800);
      stopCountdown();
    } else {
      stopPolling();
      stopCountdown();
    }
  }, [open]);

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  function stopCountdown() {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }

  function startCountdown() {
    stopCountdown();
    setSecondsLeft(1800);
    countdownRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          stopCountdown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  useEffect(() => {
    return () => { stopPolling(); stopCountdown(); };
  }, []);

  // Track abandoned checkout when PIX expires (fire-and-forget)
  useEffect(() => {
    if (secondsLeft !== 0 || step !== "pix" || planName === "tip") return;
    void supabase.rpc("record_checkout_abandoned", {
      p_fan_id: fanId,
      p_creator_id: creatorId,
      p_plan_name: planName,
      p_amount: amount,
      p_creator_name: creatorName,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, step]);

  function startPolling() {
    stopPolling();
    const isTip = planName === "tip";
    pollingRef.current = setInterval(async () => {
      if (isTip) {
        if (!identifier) return;
        const { data } = await supabase
          .from("tips")
          .select("id")
          .eq("syncpay_id", identifier)
          .maybeSingle();
        if (data) {
          stopPolling();
          stopCountdown();
          setStep("success");
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1500);
        }
        return;
      }

      const { data } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("fan_id", fanId)
        .eq("creator_id", creatorId)
        .eq("active", true)
        .maybeSingle();

      if (data) {
        stopPolling();
        stopCountdown();
        trackConversion("subscription_activated", {
          creatorId,
          metadata: { plan: planName, amount },
        });
        sessionStorage.removeItem("affiliate_ref");
        sendMetaEvent({
          event_name: "Purchase",
          user_email: fanEmail,
          value: amount,
          currency: "BRL",
          creator_pixel_id: creatorPixelId,
          creator_access_token: creatorAccessToken,
        });
        setStep("success");
        // Auto-close only when there's no upsell to show
        if (!nextPlanName) {
          setTimeout(() => {
            onSuccess();
            onClose();
            toast.success("Assinatura ativada! Bem-vindo(a)! 🎉");
          }, 2000);
        } else {
          onSuccess();
          toast.success("Assinatura ativada! Bem-vindo(a)! 🎉");
        }
      }
    }, 3000);
  }

  async function handleGeneratePix() {
    if (!fanName.trim()) {
      toast.error("Informe seu nome completo");
      return;
    }
    const cpfDigits = fanCpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11) {
      toast.error("CPF inválido — deve ter 11 dígitos");
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/syncpay-cashin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            creator_id: creatorId,
            creator_name: creatorName,
            plan_name: planName,
            amount,
            fan_id: fanId,
            fan_email: fanEmail,
            fan_name: fanName.trim(),
            fan_cpf: cpfDigits,
            affiliate_ref: sessionStorage.getItem("affiliate_ref") || undefined,
          }),
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Erro ao gerar cobrança Pix");
      }

      setPixCode(json.pix_code);
      setIdentifier(json.identifier);
      trackConversion("pix_generated", {
        creatorId,
        metadata: { plan: planName, amount },
      });
      setStep("pix");
      startPolling();
      startCountdown();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar Pix");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    toast.success("Código Pix copiado!");
    setTimeout(() => setCopied(false), 3000);
  }

  function handleClose() {
    stopPolling();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md bg-card border-border/60">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold text-foreground">
            {step === "form" && "Assinar via Pix"}
            {step === "pix" && "QR Code Pix"}
            {step === "success" && "Pagamento confirmado! 🎉"}
          </DialogTitle>
        </DialogHeader>

        {/* STEP 1 — Form */}
        {step === "form" && (
          <div className="space-y-4 pt-2">
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{planName}</span>
              {" — "}
              <span className="text-primary font-bold text-base">
                R$ {amount.toFixed(2).replace(".", ",")}
              </span>
              /mês
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Nome completo
                </label>
                <Input
                  placeholder="Como aparece no seu banco"
                  value={fanName}
                  onChange={(e) => setFanName(e.target.value)}
                  className="bg-background border-border/60"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  CPF
                </label>
                <Input
                  placeholder="000.000.000-00"
                  value={fanCpf}
                  onChange={(e) => setFanCpf(formatCPF(e.target.value))}
                  inputMode="numeric"
                  className="bg-background border-border/60"
                />
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Exigido pelo gateway de pagamento. Não armazenamos seus dados.
                </p>
              </div>
            </div>

            <Button
              onClick={handleGeneratePix}
              disabled={loading}
              className="w-full bg-gradient-primary text-primary-foreground font-bold py-6 text-base rounded-xl shadow-glow hover:scale-[1.02] transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando QR Code...
                </>
              ) : (
                "Gerar QR Code Pix"
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>Pagamento seguro via Pix · Dados protegidos</span>
            </div>
          </div>
        )}

        {/* STEP 2 — QR Code */}
        {step === "pix" && (
          <div className="flex flex-col items-center gap-5 pt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/60 rounded-lg px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Aguardando pagamento...
            </div>

            <div className="rounded-2xl border-2 border-primary/20 p-4 bg-white shadow-lg">
              <QRCodeSVG
                value={pixCode}
                size={220}
                bgColor="#ffffff"
                fgColor="#1a1a2e"
                level="M"
              />
            </div>

            <div className="w-full space-y-2">
              <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                <Smartphone className="h-3.5 w-3.5" />
                Ou copie o código copia-e-cola
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={pixCode}
                  className="bg-muted/40 border-border/40 text-xs font-mono"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopy}
                  className="shrink-0 border-border/60"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {(() => {
              const mins = Math.floor(secondsLeft / 60);
              const secs = secondsLeft % 60;
              const colorClass = secondsLeft <= 300 ? "text-destructive" : secondsLeft <= 900 ? "text-yellow-500" : "text-primary";
              return (
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className={`h-4 w-4 ${colorClass}`} />
                    <span className={`text-sm font-bold tabular-nums ${colorClass}`}>
                      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                    </span>
                  </div>
                  <Progress value={(secondsLeft / 1800) * 100} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">
                    Sua assinatura será ativada automaticamente após o pagamento.
                  </p>
                </div>
              );
            })()}

            <button
              onClick={handleClose}
              className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* STEP 3 — Success */}
        {step === "success" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-primary shadow-glow text-4xl">
              🎉
            </div>
            <div>
              <p className="font-display text-lg font-bold text-foreground">
                Pagamento confirmado!
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Sua assinatura do plano{" "}
                <span className="font-semibold text-foreground">{planName}</span>{" "}
                está ativa.
              </p>
            </div>

            {nextPlanName && nextPlanDiff !== undefined && onUpgrade && (
              <div className="w-full rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  Quer ainda mais? ✨
                </p>
                <p className="text-xs text-muted-foreground">
                  Faça upgrade para o plano{" "}
                  <span className="font-semibold text-foreground">{nextPlanName}</span>{" "}
                  por apenas{" "}
                  <span className="text-primary font-bold">
                    +R$ {nextPlanDiff.toFixed(2).replace(".", ",")}
                  </span>
                  /mês a mais e desbloqueie benefícios exclusivos.
                </p>
                <Button
                  onClick={() => { onClose(); setTimeout(onUpgrade, 150); }}
                  className="w-full bg-gradient-primary text-primary-foreground font-bold rounded-xl shadow-glow hover:scale-[1.02] transition-all"
                >
                  Upgrade para {nextPlanName}
                </Button>
                <button
                  onClick={() => { onClose(); }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground underline transition-colors"
                >
                  Continuar com o plano atual
                </button>
              </div>
            )}

            {!nextPlanName && (
              <button
                onClick={onClose}
                className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
              >
                Fechar
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
