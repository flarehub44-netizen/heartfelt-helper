import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  DollarSign, Users, FileImage, TrendingUp, Upload, Settings,
  ArrowUpRight, ArrowDownRight, Plus, Eye, X, BarChart3, Repeat2,
  Video, Calendar, Trash2, Heart, CheckCircle2, Circle, Coins
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useMonthlyRevenue } from "@/hooks/useMonthlyRevenue";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { ScheduleLiveModal } from "@/components/ScheduleLiveModal";
import { useCreatorLives, useManageLives } from "@/hooks/useCreatorLives";
import { usePostStats } from "@/hooks/usePostStats";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCreatorPayouts } from "@/hooks/useCreatorPayouts";
import { useCreatorConversionStats, useCreatorRenewalPipeline } from "@/hooks/useCreatorGrowth";
import { creatorProfilePath, creatorLivePath } from "@/lib/creatorPaths";
import { Input } from "@/components/ui/input";
import NotificationBell from "@/components/NotificationBell";

const planColors: Record<string, string> = {
  "Fã": "bg-muted/50 text-muted-foreground",
  "Super Fã": "bg-primary/20 text-primary",
  "VIP": "bg-amber-500/20 text-amber-400",
};

const Dashboard = () => {
  const { profile, user } = useAuth();
  const { data: dashStats } = useDashboardStats();
  const { data: revenueData, isLoading: revenueLoading } = useMonthlyRevenue(user?.id);
  const [uploadHover, setUploadHover] = useState(false);
  const [postText, setPostText] = useState("");
  const [minPlan, setMinPlan] = useState("free");
  const [ppvPrice, setPpvPrice] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [liveModalOpen, setLiveModalOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchParams.get("live") === "1" || searchParams.get("action") === "live") {
      setLiveModalOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("live");
      next.delete("action");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: lives = [] } = useCreatorLives(user?.id);
  const { data: postStats = [] } = usePostStats();
  const { data: completion } = useProfileCompletion();
  const { remove: removeLive, update: updateLive } = useManageLives(user?.id);
  const { balance, eligibility, requestPayout, convertibleCoins, convertCoins } = useCreatorPayouts();
  const [dashWithdrawAmount, setDashWithdrawAmount] = useState("");
  const { data: conversion } = useCreatorConversionStats();
  const { data: renewalFans = [], notify: notifyRenewal, notifyAll } = useCreatorRenewalPipeline();

  const upcomingLives = lives.filter((l) => l.status !== "ended");
  const endedLives = lives.filter((l) => l.status === "ended");
  const expiringFans = renewalFans.filter((f) => f.bucket === "expiring_7d");
  const expiredFans = renewalFans.filter((f) => f.bucket === "expired_30d");
  const winbackCount = expiringFans.length + expiredFans.length;
  const convertibleCoinBalance = convertibleCoins.data ?? 0;

  const displayName = profile?.name || "Criador";

  // MoM revenue change from last two chart points
  const momPct = (() => {
    if (!revenueData || revenueData.length < 2) return null;
    const prev = Number(revenueData[revenueData.length - 2]?.value ?? 0);
    const curr = Number(revenueData[revenueData.length - 1]?.value ?? 0);
    if (prev <= 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  })();

  const recentSubscribers = dashStats?.recentSubscribers ?? [];
  const planBreakdown = dashStats?.planBreakdown ?? {};
  const churnByPlan = dashStats?.churnByPlan ?? {};
  const totalSubs = dashStats?.subscriberCount ?? 0;

  const PLAN_DISPLAY: Record<string, { label: string; color: string }> = {
    fan: { label: "Fã", color: "bg-primary/60" },
    superfan: { label: "Super Fã", color: "bg-primary" },
    vip: { label: "VIP", color: "bg-amber-400" },
  };

  const stats = [
    {
      label: "Receita Líquida",
      value: dashStats ? `R$ ${dashStats.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "R$ 0,00",
      sub: "após taxa de 20%",
      up: true,
      icon: DollarSign,
      color: "text-green-400",
    },
    {
      label: "MRR Bruto",
      value: dashStats ? `R$ ${dashStats.mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "R$ 0,00",
      sub: "receita mensal recorrente",
      up: true,
      icon: Repeat2,
      color: "text-emerald-400",
    },
    {
      label: "Assinantes",
      value: dashStats ? dashStats.subscriberCount.toLocaleString("pt-BR") : "0",
      sub: dashStats ? `${dashStats.churnRate.toFixed(1)}% churn/mês` : "—",
      up: (dashStats?.churnRate ?? 0) < 10,
      icon: Users,
      color: "text-primary",
    },
    {
      label: "Posts",
      value: dashStats ? dashStats.postCount.toString() : "0",
      sub: "publicados",
      up: true,
      icon: FileImage,
      color: "text-blue-400",
    },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewFile(file);
    setPreviewUrl(url);
    setPreviewOpen(true);
    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  const closePreview = () => {
    setPreviewOpen(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  const handlePublish = async () => {
    if (!previewFile || !user) return;
    setUploading(true);
    try {
      const ext = previewFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("content")
        .upload(path, previewFile);
      if (uploadError) throw uploadError;

      const mediaType = previewFile.type.startsWith("video") ? "video" : "image";

      // Bake watermark on images (non-fatal if it fails)
      if (mediaType === "image") {
        try {
          await supabase.functions.invoke("watermark-image", { body: { path } });
        } catch (wmErr) {
          console.warn("watermark failed, keeping original", wmErr);
        }
      }
      const ppv = parseInt(ppvPrice, 10);
      const { error: postError } = await supabase.from("posts").insert({
        creator_id: user.id,
        text: postText || null,
        media_url: path,
        media_type: mediaType,
        min_plan: minPlan,
        ppv_price: Number.isFinite(ppv) && ppv > 0 ? ppv : 0,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      } as never);
      if (postError) throw postError;

      toast.success(scheduledAt ? "Post agendado com sucesso!" : "Conteúdo publicado com sucesso!");
      setPostText("");
      setMinPlan("free");
      setPpvPrice("");
      setScheduledAt("");
      closePreview();
    } catch (err: any) {
      toast.error(err.message || "Erro ao publicar");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-6xl pt-24 pb-16 flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Olá, <span className="text-gradient">{displayName}</span> 👋
            </h1>
            <p className="text-muted-foreground mt-1">Aqui está o resumo da sua conta</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setLiveModalOpen(true)}
              className="hidden sm:flex items-center gap-2 rounded-full bg-gradient-primary text-primary-foreground shadow-glow hover:scale-105 transition-transform text-sm px-4 h-9"
            >
              <Video className="h-3.5 w-3.5" />
              Iniciar Live
            </Button>
            <NotificationBell />
            <Link to="/settings">
              <button className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:text-foreground transition-colors">
                <Settings className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </div>

        {/* Primary work CTAs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => document.getElementById("publish-section")?.scrollIntoView({ behavior: "smooth" })}
            className="glass-card rounded-2xl p-4 text-left hover:border-primary/40 border border-transparent transition-colors"
          >
            <p className="text-xs text-muted-foreground">Ação</p>
            <p className="font-semibold text-foreground flex items-center gap-2 mt-1">
              <Upload className="h-4 w-4 text-primary" /> Publicar
            </p>
            <p className="text-xs text-muted-foreground mt-1">Poste com PPV ou agende</p>
          </button>
          <div className="glass-card rounded-2xl p-4 border border-transparent hover:border-primary/40 transition-colors sm:col-span-1">
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p className="font-semibold text-foreground flex items-center gap-2 mt-1">
              <DollarSign className="h-4 w-4 text-green-400" /> Sacar
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              R$ {(eligibility.data?.eligible_brl ?? balance.data?.available_brl ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} elegível
            </p>
            <div className="mt-3 flex gap-2 items-center">
              <Input
                type="number"
                min={30}
                step="0.01"
                placeholder="Mín. 30"
                className="h-8 text-sm bg-muted/20 border-border/50"
                value={dashWithdrawAmount}
                onChange={(e) => setDashWithdrawAmount(e.target.value)}
              />
              <Button
                size="sm"
                className="h-8 rounded-full shrink-0"
                disabled={requestPayout.isPending}
                onClick={async () => {
                  const amt = parseFloat(dashWithdrawAmount.replace(",", "."));
                  if (!amt || amt < 30) {
                    toast.error("Mínimo R$ 30");
                    return;
                  }
                  try {
                    await requestPayout.mutateAsync(amt);
                    toast.success("Saque enviado ao Pix");
                    setDashWithdrawAmount("");
                  } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : "Erro no saque");
                  }
                }}
              >
                Pix
              </Button>
            </div>
            <Link to="/settings?tab=payments" className="text-[11px] text-primary hover:underline mt-2 inline-block">
              CPF, Pix e histórico →
            </Link>
            {convertibleCoinBalance > 0 && (
              <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Coins className="h-3 w-3 text-amber-400" />
                  {convertibleCoinBalance} moedas de gifts/tips/PPV prontas para Pix
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 mt-2 w-full text-xs"
                  disabled={convertCoins.isPending}
                  onClick={async () => {
                    try {
                      const net = await convertCoins.mutateAsync();
                      toast.success(
                        net > 0
                          ? `Convertido! +R$ ${net.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} líquido`
                          : "Nada a converter"
                      );
                    } catch (err: unknown) {
                      toast.error(err instanceof Error ? err.message : "Falha na conversão");
                    }
                  }}
                >
                  Converter moedas → Pix
                </Button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => document.getElementById("winback-section")?.scrollIntoView({ behavior: "smooth" })}
            className="glass-card rounded-2xl p-4 text-left hover:border-primary/40 border border-transparent transition-colors"
          >
            <p className="text-xs text-muted-foreground">Retenção</p>
            <p className="font-semibold text-foreground flex items-center gap-2 mt-1">
              <Users className="h-4 w-4 text-amber-400" /> Recuperar assinantes
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {winbackCount} precisam de atenção
            </p>
          </button>
        </div>

        {/* Profile completion widget — hidden when 100% done */}
        {completion && completion.completed < completion.total && (
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Complete seu perfil</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {completion.completed}/{completion.total} etapas concluídas
                </p>
              </div>
              <span className="text-xs font-bold text-primary bg-primary/10 rounded-full px-3 py-1">
                {Math.round((completion.completed / completion.total) * 100)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/40 mb-4 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-primary transition-all duration-500"
                style={{ width: `${(completion.completed / completion.total) * 100}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {completion.steps.map((step) => (
                <a
                  key={step.key}
                  href={step.link}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    step.done
                      ? "bg-green-500/10 text-green-400 pointer-events-none"
                      : "bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  {step.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                  {step.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-card rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-muted/30 ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <div className="flex items-center gap-1 text-xs">
                {stat.up ? (
                  <ArrowUpRight className="h-3 w-3 text-green-400" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-400" />
                )}
                <span className="text-muted-foreground">{stat.sub}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Revenue chart */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-semibold text-foreground">Receita Líquida</h2>
                <p className="text-sm text-muted-foreground">Últimos 6 meses</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">
                  {momPct == null
                    ? "—"
                    : `${momPct >= 0 ? "+" : ""}${momPct}% este mês`}
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(340 80% 58%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(340 80% 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", color: "hsl(var(--foreground))" }}
                  formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "Receita"]}
                />
                <Area type="monotone" dataKey="value" stroke="hsl(340 80% 58%)" strokeWidth={2} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Plan breakdown + recent subscribers */}
          <div className="glass-card rounded-2xl p-6 flex flex-col gap-5">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-foreground">Distribuição por Plano</h2>
              </div>
              {totalSubs === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum assinante ainda.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {Object.entries(PLAN_DISPLAY).map(([key, { label, color }]) => {
                    const count = planBreakdown[key] ?? 0;
                    const pct = totalSubs > 0 ? (count / totalSubs) * 100 : 0;
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">{label}</span>
                          <span className="text-xs font-semibold text-foreground">{count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${color} transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {Object.values(churnByPlan).some((v) => v.churned > 0) && (
              <div className="border-t border-border/40 pt-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Churn por Plano</h3>
                <div className="flex flex-col gap-2">
                  {Object.entries(PLAN_DISPLAY).map(([key, { label }]) => {
                    const data = churnByPlan[key];
                    if (!data || data.active + data.churned === 0) return null;
                    return (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground">{data.churned} saíram</span>
                          <span className={`font-bold ${data.rate > 15 ? "text-red-400" : data.rate > 5 ? "text-amber-400" : "text-green-400"}`}>
                            {data.rate.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="border-t border-border/40 pt-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Novos Assinantes</h3>
              <div className="flex flex-col gap-2.5">
                {recentSubscribers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum assinante recente.</p>
                ) : recentSubscribers.map((sub, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <img src={sub.avatar || "/placeholder.svg"} alt={sub.name} className="h-8 w-8 rounded-full object-cover flex-shrink-0"  loading="lazy" decoding="async" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{sub.name}</p>
                      <p className="text-[10px] text-muted-foreground">{sub.since}</p>
                    </div>
                    <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0 ${planColors[sub.plan] || "bg-muted/50 text-muted-foreground"}`}>
                      {sub.plan}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Lives section */}
        <div id="lives-section" className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-foreground">Suas Lives</h2>
              {upcomingLives.some((l) => l.status === "live") && (
                <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                  AO VIVO
                </span>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => setLiveModalOpen(true)}
              className="rounded-full bg-gradient-primary text-primary-foreground shadow-glow hover:scale-105 transition-transform text-xs px-3 h-8 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Agendar
            </Button>
          </div>

          {upcomingLives.length === 0 && endedLives.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center border border-dashed border-border/50 rounded-xl">
              <Video className="h-10 w-10 text-muted-foreground/30" />
              <div>
                <p className="text-sm font-medium text-foreground">Nenhuma live agendada</p>
                <p className="text-xs text-muted-foreground mt-0.5">Agende uma live e avise seus fãs com antecedência.</p>
              </div>
              <Button size="sm" onClick={() => setLiveModalOpen(true)} className="rounded-full bg-gradient-primary text-primary-foreground text-xs px-4 h-8 mt-1">
                Iniciar live
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {upcomingLives.map((live) => (
                <div key={live.id} className={`flex items-start gap-3 rounded-xl border p-3.5 ${live.status === "live" ? "border-red-500/30 bg-red-500/5" : "border-border/50 bg-muted/20"}`}>
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${live.status === "live" ? "bg-red-500/20" : "bg-muted/40"}`}>
                    {live.status === "live" ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-red-400 animate-pulse" />
                    ) : (
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">{live.title}</p>
                    {live.scheduled_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {live.status === "live"
                          ? "Ao vivo agora"
                          : format(new Date(live.scheduled_at), "d MMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {live.min_plan === "free" ? "🌐 Todos" : live.min_plan === "fan" ? "💖 Fãs" : live.min_plan === "superfan" ? "🔥 Super Fãs" : "💎 VIP"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {live.status === "scheduled" && (
                      <button
                        onClick={() => updateLive.mutate({ id: live.id, status: "live" })}
                        className="rounded-lg bg-red-500/90 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-500 transition-colors"
                      >
                        Iniciar
                      </button>
                    )}
                    {live.status === "live" && (
                      <button
                        onClick={() => updateLive.mutate({ id: live.id, status: "ended" })}
                        className="rounded-lg bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted/80 transition-colors"
                      >
                        Encerrar
                      </button>
                    )}
                    <button
                      onClick={() => removeLive.mutate(live.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Posts analytics */}
        {postStats.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Eye className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-foreground">Performance dos Posts</h2>
              <span className="text-xs text-muted-foreground ml-auto">Top 10 por views</span>
            </div>
            <div className="flex flex-col gap-2">
              {postStats.map((p, i) => {
                const maxViews = postStats[0]?.views_count ?? 1;
                const barPct = maxViews > 0 ? (p.views_count / maxViews) * 100 : 0;
                const label = p.text ? p.text.slice(0, 50) + (p.text.length > 50 ? "…" : "") : (p.media_type === "video" ? "📹 Vídeo" : "📷 Foto");
                return (
                  <div key={p.post_id} className="flex items-center gap-3 py-1.5">
                    <span className="w-5 text-xs text-muted-foreground text-right flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{label}</p>
                      <div className="mt-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-primary transition-all duration-500" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{p.views_count.toLocaleString("pt-BR")}</span>
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{p.likes_count.toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Revenue projection */}
        {dashStats && dashStats.mrr > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-foreground">Projeção de receita</h2>
            </div>
            {(() => {
              const avgPlanPrice = dashStats.subscriberCount > 0
                ? dashStats.mrr / dashStats.subscriberCount
                : 0;
              const netRate = 1 - 0.20;
              const scenarios = [5, 10, 20, 50];
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {scenarios.map((extra) => {
                    const projected = (dashStats.mrr + extra * avgPlanPrice) * netRate;
                    const diff = extra * avgPlanPrice * netRate;
                    return (
                      <div key={extra} className="rounded-xl border border-border/50 bg-muted/10 p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">+{extra} assinantes</p>
                        <p className="text-base font-bold text-foreground">
                          R$ {projected.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-green-400 mt-0.5 font-medium">
                          +R$ {diff.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}/mês
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <p className="text-xs text-muted-foreground mt-3">
              Baseado na sua receita média de R$ {dashStats.subscriberCount > 0 ? (dashStats.mrr / dashStats.subscriberCount).toFixed(2).replace(".", ",") : "0,00"} por assinante. Valor líquido após taxa de 20%.
            </p>
          </div>
        )}

        {/* Conversion analytics */}
        {conversion && (conversion.profile_views > 0 || conversion.activations > 0) && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-foreground">Conversão (30 dias)</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border/50 bg-muted/10 p-3 text-center">
                <p className="text-xs text-muted-foreground">Views perfil</p>
                <p className="text-lg font-bold text-foreground">{conversion.profile_views}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/10 p-3 text-center">
                <p className="text-xs text-muted-foreground">Cliques assinar</p>
                <p className="text-lg font-bold text-foreground">{conversion.subscribe_clicks}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/10 p-3 text-center">
                <p className="text-xs text-muted-foreground">Ativações</p>
                <p className="text-lg font-bold text-foreground">{conversion.activations}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/10 p-3 text-center">
                <p className="text-xs text-muted-foreground">Taxa</p>
                <p className="text-lg font-bold text-primary">{conversion.conversion_rate}%</p>
              </div>
            </div>
          </div>
        )}

        {/* Win-back CRM */}
        <div id="winback-section" className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Repeat2 className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-foreground">Recuperar assinantes</h2>
            </div>
            {winbackCount > 0 && (
              <Button
                size="sm"
                className="h-8 rounded-full bg-gradient-primary text-primary-foreground text-xs"
                disabled={notifyAll.isPending}
                onClick={async () => {
                  try {
                    const { ok, failed } = await notifyAll.mutateAsync({
                      fans: [...expiringFans, ...expiredFans],
                      message:
                        "Sua assinatura precisa de atenção — renove com um toque e continue acompanhando!",
                    });
                    if (ok > 0) toast.success(`Avisos enviados: ${ok}`);
                    if (failed > 0) toast.error(`${failed} avisos falharam`);
                  } catch {
                    toast.error("Não foi possível avisar todos");
                  }
                }}
              >
                Avisar todos ({winbackCount})
              </Button>
            )}
          </div>
          {expiringFans.length === 0 && expiredFans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma assinatura expirando ou expirada nos últimos 30 dias.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {expiringFans.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-400 mb-2">Expiram em até 7 dias</p>
                  <div className="flex flex-col gap-2">
                    {expiringFans.slice(0, 8).map((f) => (
                      <div key={`${f.fan_id}-${f.expires_at}`} className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/10 px-3 py-2">
                        <img src={f.fan_avatar || "/placeholder.svg"} alt="" className="h-8 w-8 rounded-full object-cover" loading="lazy" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{f.fan_name || "Fã"}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {f.plan} · até {format(new Date(f.expires_at), "d MMM", { locale: ptBR })}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={notifyRenewal.isPending}
                          onClick={async () => {
                            try {
                              await notifyRenewal.mutateAsync({ fanId: f.fan_id });
                              toast.success("Aviso enviado!");
                            } catch {
                              toast.error("Não foi possível avisar");
                            }
                          }}
                        >
                          Avisar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {expiredFans.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-400 mb-2">Expirados (30 dias)</p>
                  <div className="flex flex-col gap-2">
                    {expiredFans.slice(0, 8).map((f) => (
                      <div key={`${f.fan_id}-exp-${f.expires_at}`} className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/10 px-3 py-2">
                        <img src={f.fan_avatar || "/placeholder.svg"} alt="" className="h-8 w-8 rounded-full object-cover" loading="lazy" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{f.fan_name || "Fã"}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {f.plan} · expirou {format(new Date(f.expires_at), "d MMM", { locale: ptBR })}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-gradient-primary text-primary-foreground"
                          disabled={notifyRenewal.isPending}
                          onClick={async () => {
                            try {
                              await notifyRenewal.mutateAsync({
                                fanId: f.fan_id,
                                message: "Sentimos sua falta! Volte com um clique e continue acompanhando.",
                              });
                              toast.success("Convite de retorno enviado!");
                            } catch {
                              toast.error("Não foi possível avisar");
                            }
                          }}
                        >
                          Win-back
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upload new content */}
        <div id="publish-section" className="glass-card rounded-2xl p-6">
          <h2 className="font-semibold text-foreground mb-4">Publicar novo conteúdo</h2>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <Textarea
              placeholder="Escreva uma legenda para seu post..."
              className="bg-muted/20 border-border/50 resize-none flex-1"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
            />
            <div className="flex flex-col gap-3 sm:w-52">
              <div className="flex flex-col gap-2">
                <Label className="text-sm text-muted-foreground">Acesso mínimo</Label>
                <Select value={minPlan} onValueChange={setMinPlan}>
                  <SelectTrigger className="bg-muted/20 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">🌐 Todos (gratuito)</SelectItem>
                    <SelectItem value="fan">💖 Fã</SelectItem>
                    <SelectItem value="superfan">🔥 Super Fã</SelectItem>
                    <SelectItem value="vip">💎 VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-sm text-muted-foreground">PPV (moedas)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0 = sem PPV"
                  className="bg-muted/20 border-border/50"
                  value={ppvPrice}
                  onChange={(e) => setPpvPrice(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-sm text-muted-foreground">Agendar (opcional)</Label>
                <Input
                  type="datetime-local"
                  className="bg-muted/20 border-border/50"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            onMouseEnter={() => setUploadHover(true)}
            onMouseLeave={() => setUploadHover(false)}
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 transition-colors cursor-pointer ${
              uploadHover ? "border-primary/60 bg-primary/5" : "border-border/50 bg-muted/10"
            }`}
          >
            <div className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${uploadHover ? "bg-gradient-primary shadow-glow" : "bg-muted/30"}`}>
              <Upload className={`h-6 w-6 ${uploadHover ? "text-primary-foreground" : "text-muted-foreground"}`} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                Arraste arquivos ou clique para fazer upload
              </p>
              <p className="text-xs text-muted-foreground mt-1">Fotos e vídeos — máx. 500MB</p>
            </div>
            <Button
              className="rounded-full bg-gradient-primary text-primary-foreground shadow-glow hover:scale-105 transition-transform mt-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Selecionar arquivo
            </Button>
          </div>
        </div>
      </div>

      {user && (
        <ScheduleLiveModal
          open={liveModalOpen}
          onClose={() => setLiveModalOpen(false)}
          creatorId={user.id}
          onCreated={(status, live) => {
            if (status === "live" && live) {
              navigate(creatorLivePath(user.id, live.id, profile?.handle));
            } else {
              navigate(creatorProfilePath(user.id, profile?.handle, { tab: "Lives" }));
            }
          }}
        />
      )}


      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Preview do post
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {previewUrl && previewFile && (
              previewFile.type.startsWith("video") ? (
                <video src={previewUrl} controls className="w-full max-h-64 rounded-xl object-contain bg-black" />
              ) : (
                <img src={previewUrl} alt="Preview" className="w-full max-h-64 rounded-xl object-contain bg-muted/20"  loading="lazy" decoding="async" />
              )
            )}
            <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Legenda</p>
              <p className="text-sm text-foreground">
                {postText || <span className="text-muted-foreground italic">Sem legenda</span>}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Acesso mínimo:</span>
              <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                {minPlan === "free" ? "🌐 Todos" : minPlan === "fan" ? "💖 Fã" : minPlan === "superfan" ? "🔥 Super Fã" : "💎 VIP"}
              </span>
              {ppvPrice && Number(ppvPrice) > 0 && (
                <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5">
                  PPV {ppvPrice} moedas
                </span>
              )}
              {scheduledAt && (
                <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 rounded-full px-2 py-0.5">
                  Agendado
                </span>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closePreview} className="gap-2">
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button
              onClick={handlePublish}
              disabled={uploading}
              className="bg-gradient-primary text-primary-foreground shadow-glow hover:scale-[1.02] transition-transform gap-2"
            >
              {uploading ? "Publicando..." : scheduledAt ? "Agendar →" : "Publicar agora →"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
