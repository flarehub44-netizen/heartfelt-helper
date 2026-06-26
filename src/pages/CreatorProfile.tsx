import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Heart, Star, Lock, MessageCircle, Share2, ChevronLeft, Check, Zap, Users, UserPlus, UserCheck, Settings, Pencil, Trash2, FileText, Link2, Video, Calendar, Radio } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Navbar from "@/components/Navbar";
import { useCreatorProfile } from "@/hooks/useCreatorProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { useFollow } from "@/hooks/useFollow";
import { toast } from "sonner";
import { sendMetaEvent } from "@/lib/metaCapi";
import { PixPaymentModal } from "@/components/PixPaymentModal";
import TipCoinsButton from "@/components/TipCoinsButton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAffiliateLinks } from "@/hooks/useAffiliateLinks";
import { useMyAffiliateRequest, useCreateAffiliateRequest } from "@/hooks/useAffiliateRequests";
import { useCreatorPixel } from "@/hooks/useCreatorPixel";
import { getLoginPath } from "@/lib/authRedirect";
import { normalizePlanName, PLAN_LABELS, PLAN_BADGES, PLAN_ORDER, planRank, getUpgradePriceDiff } from "@/lib/plans";
import { trackConversion } from "@/lib/conversionEvents";
import { useMeta } from "@/hooks/useMeta";
import { useCreatorLives, useManageLives } from "@/hooks/useCreatorLives";
import { ScheduleLiveModal } from "@/components/ScheduleLiveModal";
import { LiveChat } from "@/components/LiveChat";
import { NativeLivePlayer } from "@/components/NativeLivePlayer";
import { SignedImage } from "@/components/SignedMedia";
import { useSimilarCreators } from "@/hooks/useSimilarCreators";


const defaultPlans = [
  {
    name: "Fã",
    emoji: "💖",
    desc: "Acesso ao feed exclusivo e mensagens",
    perks: ["Feed exclusivo", "Fotos exclusivas", "Mensagem direta"],
    multiplier: 1,
    popular: false,
  },
  {
    name: "Super Fã",
    emoji: "🔥",
    desc: "Tudo do plano Fã + conteúdo premium",
    perks: ["Tudo do plano Fã", "Vídeos em HD", "Lives privadas", "Desconto em PPV"],
    multiplier: 2.5,
    popular: true,
  },
  {
    name: "VIP",
    emoji: "💎",
    desc: "Experiência completa e exclusiva",
    perks: ["Tudo do Super Fã", "Chat em grupo VIP", "Conteúdo 4K", "Acesso antecipado"],
    multiplier: 5,
    popular: false,
  },
];

const postTypes = ["Todos", "Fotos", "Vídeos", "Lives"];

const CreatorProfile = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const { profile: realProfile, plans: realPlans, posts: realPosts, subscriberCount, recentSubsCount } = useCreatorProfile(id, user);
  const { subscription, isSubscribed, hasAccessTo } = useSubscription(id);
  const { isFollowing, followersCount, toggle: toggleFollow, isPending: followPending } = useFollow(id);
  const { data: similarCreators = [] } = useSimilarCreators(id, realProfile?.category);

  const [activeTab, setActiveTab] = useState("Todos");
  const [liked, setLiked] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(0);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState(10);
  const [showTipPicker, setShowTipPicker] = useState(false);
  const [scheduleLiveOpen, setScheduleLiveOpen] = useState(false);

  // Capture ref code from URL
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      sessionStorage.setItem("affiliate_ref", ref);
    }
  }, [searchParams]);


  // Affiliate link management
  const { links: affiliateLinks, createLink: createAffiliateLink } = useAffiliateLinks(id);
  const { data: affiliateRequest, isLoading: affReqLoading } = useMyAffiliateRequest();
  const createAffiliateRequest = useCreateAffiliateRequest();

  const handleShare = async () => {
    const url = `${window.location.origin}/creator/${id}`;
    const shareData = { title: realProfile.name, text: `Conheça ${realProfile.name} na Flare!`, url };
    if (navigator.share && navigator.canShare?.(shareData)) {
      try { await navigator.share(shareData); } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    }
  };

  const handleShareAffiliate = async () => {
    if (!user) {
      toast.info("Faça login para compartilhar como afiliado");
      return;
    }

    // Check affiliate request status
    if (!affiliateRequest) {
      // No request yet — create one
      try {
        await createAffiliateRequest.mutateAsync();
        toast.info("Sua solicitação de afiliado foi enviada! Aguarde aprovação do admin.");
      } catch {
        toast.error("Erro ao enviar solicitação de afiliado");
      }
      return;
    }

    if (affiliateRequest.status === "pending") {
      toast.info("Sua solicitação de afiliado está aguardando aprovação.");
      return;
    }

    if (affiliateRequest.status === "rejected") {
      toast.error("Sua solicitação de afiliado foi negada.");
      return;
    }

    // approved — generate/copy link
    const existing = affiliateLinks.find((l: any) => l.creator_id === id);
    if (existing) {
      const url = `${window.location.origin}/creator/${id}?ref=${existing.code}`;
      navigator.clipboard.writeText(url);
      toast.success("Link de afiliado copiado!");
      return;
    }
    try {
      const newLink = await createAffiliateLink.mutateAsync(id!);
      const url = `${window.location.origin}/creator/${id}?ref=${newLink.code}`;
      navigator.clipboard.writeText(url);
      toast.success("Link de afiliado gerado e copiado!");
    } catch {
      toast.error("Erro ao gerar link de afiliado");
    }
  };

  // Owner management state
  const queryClient = useQueryClient();
  const isOwner = !!user && !!id && user.id === id;

  interface MyPost { id: string; text: string | null; media_url: string | null; media_type: string | null; min_plan: string; created_at: string; }
  const [editPost, setEditPost] = useState<MyPost | null>(null);
  const [editText, setEditText] = useState("");
  const [editPlan, setEditPlan] = useState("free");
  const [deletePost, setDeletePost] = useState<MyPost | null>(null);

  const { data: myPosts = [] } = useQuery<MyPost[]>({
    queryKey: ["ownerPosts", id],
    enabled: isOwner,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, text, media_url, media_type, min_plan, created_at")
        .eq("creator_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MyPost[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ postId, text, minPlan }: { postId: string; text: string; minPlan: string }) => {
      const { error } = await supabase.from("posts").update({ text, min_plan: minPlan }).eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ownerPosts", id] });
      toast.success("Post atualizado!");
      setEditPost(null);
    },
    onError: () => toast.error("Erro ao atualizar post"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ownerPosts", id] });
      toast.success("Post excluído!");
      setDeletePost(null);
    },
    onError: () => toast.error("Erro ao excluir post"),
  });

  const POST_PLAN_LABELS = PLAN_BADGES;

  const openEdit = (post: MyPost) => {
    setEditPost(post);
    setEditText(post.text ?? "");
    setEditPlan(post.min_plan);
  };

  // Extract creator pixel info from profile
  const creatorSocial = (realProfile?.social_links as any) ?? {};
  const creatorPixelId = creatorSocial.meta_pixel_id || undefined;
  const creatorAccessToken = creatorSocial.meta_access_token || undefined;

  useCreatorPixel(creatorPixelId);

  // Fire ViewContent when profile is loaded
  useEffect(() => {
    if (realProfile && id) {
      sendMetaEvent({ event_name: "ViewContent", creator_pixel_id: creatorPixelId, creator_access_token: creatorAccessToken });
      trackConversion("profile_view", { creatorId: id });
    }
  }, [realProfile?.id, id]);

  // SEO — must be before any early return (React rules of hooks)
  useMeta({
    title: realProfile ? `${realProfile.name} (@${realProfile.handle ?? "criador"})` : undefined,
    description: (realProfile as any)?.bio
      ? String((realProfile as any).bio).slice(0, 160)
      : realProfile
        ? `Assine ${realProfile.name} na Flare e acesse conteúdo exclusivo.`
        : undefined,
    image: realProfile?.avatar_url ?? undefined,
    url: `${window.location.origin}/creator/${id}`,
  });

  // Lives
  const { data: lives = [] } = useCreatorLives(id);
  const { remove: removeLive, update: updateLive } = useManageLives(isOwner ? id : undefined);

  // Auto-open PIX modal when redirected with ?openSubscribe=1 (optionally ?plan=<key>)
  // Must be declared before any early return (React rules of hooks)
  useEffect(() => {
    const open = searchParams.get("openSubscribe");
    const planKey = searchParams.get("plan");
    if (open === "1" && user && !authLoading && realProfile) {
      if (planKey) {
        const idx = realPlans.findIndex((p) => p.plan_name === planKey);
        if (idx >= 0) setSelectedPlan(idx);
      }
      setPixModalOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("openSubscribe");
      next.delete("plan");
      navigate(
        `/creator/${id}${next.toString() ? `?${next.toString()}` : ""}`,
        { replace: true }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user, authLoading, realProfile]);

  // If no real profile found, show 404
  if (!realProfile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-2xl pt-32 pb-16 text-center">
          <h1 className="font-display text-4xl font-bold text-foreground mb-4">Criador não encontrado</h1>
          <p className="text-muted-foreground mb-6">Este perfil não existe ou foi removido.</p>
          <Link to="/discover" className="rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-105 transition-transform">
            Explorar criadores
          </Link>
        </div>
      </div>
    );
  }


  const creator = {
    ...realProfile,
    avatar: realProfile.avatar_url || "/placeholder.svg",
    cover: realProfile.cover_url || "/placeholder.svg",
    price: realPlans.length ? realPlans[0].price : 0,
    subscribers: subscriberCount || 0,
    posts: realPosts.length,
    rating: 4.8,
    verified: true,
    tags: realProfile.category ? [realProfile.category] : [],
    handle: realProfile.handle || "criador",
  };

  type PlanCard = {
    name: string;
    planKey: string;
    emoji: string;
    desc: string;
    perks: string[];
    price: number;
    popular: boolean;
  };

  const plans: PlanCard[] = realPlans.length
    ? realPlans.map((p, i) => ({
        name: PLAN_LABELS[p.plan_name] ?? p.plan_name,
        planKey: p.plan_name,
        emoji: ["💖", "🔥", "💎"][i % 3],
        desc: (p as { description?: string }).description || (defaultPlans[i % 3]?.desc ?? ""),
        perks: defaultPlans[i % 3]?.perks ?? [],
        price: Number(p.price),
        popular: i === 1,
      }))
    : defaultPlans.map((p, i) => ({
        name: p.name,
        planKey: PLAN_ORDER[i] ?? "fan",
        emoji: p.emoji,
        desc: p.desc,
        perks: p.perks,
        price: creator.price * p.multiplier,
        popular: p.popular,
      }));

  // Build display posts from real data
  const displayPosts = realPosts.map((post) => ({
    id: post.id,
    locked: post.min_plan !== "free" && !hasAccessTo(post.min_plan),
    type: post.media_type === "video" ? "video" : "photo",
    mediaUrl: post.media_url,
    minPlan: post.min_plan,
  }));

  const filteredPosts =
    activeTab === "Fotos"
      ? displayPosts.filter((p) => p.type === "photo")
      : activeTab === "Vídeos"
        ? displayPosts.filter((p) => p.type === "video")
        : displayPosts;




  const handleLockedPostClick = (minPlan: string) => {
    if (!user) {
      navigate(getLoginPath(`/creator/${id}?openSubscribe=1`));
      return;
    }
    if (!hasAccessTo(minPlan)) {
      const idx = plans.findIndex((p) => normalizePlanName(p.planKey ?? p.name) === normalizePlanName(minPlan));
      setSelectedPlan(idx >= 0 ? idx : 0);
      setPixModalOpen(true);
    }
  };

  const currentSubRank = subscription?.plan ? planRank(subscription.plan) : 0;
  const upgradePlanIndex = isSubscribed
    ? plans.findIndex((p) => planRank(p.planKey) > currentSubRank)
    : -1;

  const highestLockedPlan = displayPosts
    .filter((p) => p.locked && p.minPlan !== "free")
    .map((p) => p.minPlan)
    .sort((a, b) => planRank(b) - planRank(a))[0];

  const contextualUpgradeIndex =
    isSubscribed && highestLockedPlan
      ? plans.findIndex(
          (p) =>
            planRank(p.planKey) >= planRank(highestLockedPlan) &&
            planRank(p.planKey) > currentSubRank
        )
      : -1;

  const effectiveUpgradeIndex =
    contextualUpgradeIndex >= 0 ? contextualUpgradeIndex : upgradePlanIndex;

  const dbPlans = realPlans.map((p) => ({ plan_name: p.plan_name, price: Number(p.price) }));

  // Next plan after the one being purchased (for upsell after payment)
  const upsellPlanIndex = selectedPlan < plans.length - 1 ? selectedPlan + 1 : -1;
  const upsellPlan = upsellPlanIndex >= 0 ? plans[upsellPlanIndex] : null;
  const upsellDiff = upsellPlan
    ? Math.max(0, upsellPlan.price - (plans[selectedPlan]?.price ?? 0))
    : 0;

  const handleUpgradeAfterSuccess = () => {
    if (upsellPlanIndex >= 0) {
      setSelectedPlan(upsellPlanIndex);
      setPixModalOpen(true);
    }
  };

  const getCheckoutAmount = (planIdx: number) => {
    if (isSubscribed && subscription?.plan && planIdx >= 0) {
      const targetKey = plans[planIdx].planKey;
      const diff = getUpgradePriceDiff(dbPlans, subscription.plan, targetKey);
      return diff > 0 ? diff : plans[planIdx].price;
    }
    return plans[planIdx]?.price ?? 0;
  };

  const handleSubscribe = () => {
    if (!user) {
      navigate(getLoginPath(`/creator/${id}?openSubscribe=1`));
      return;
    }
    if (isSubscribed) {
      if (effectiveUpgradeIndex >= 0) {
        setSelectedPlan(effectiveUpgradeIndex);
      } else {
        toast.info("Você já é assinante!");
        return;
      }
    }
    const planIdx = isSubscribed && effectiveUpgradeIndex >= 0 ? effectiveUpgradeIndex : selectedPlan;
    sendMetaEvent({
      event_name: "InitiateCheckout",
      user_email: user.email,
      value: getCheckoutAmount(planIdx),
      currency: "BRL",
      creator_pixel_id: creatorPixelId,
      creator_access_token: creatorAccessToken,
    });
    trackConversion("checkout_initiated", { creatorId: id, metadata: { plan: plans[planIdx].planKey } });
    setPixModalOpen(true);
  };

  const canMessage = isOwner || (subscription?.plan === "vip" && isSubscribed);

  const handleMessage = () => {
    if (!user) {
      navigate(getLoginPath(`/creator/${id}`));
      return;
    }
    if (!canMessage) {
      toast.info("Mensagens diretas são exclusivas para assinantes VIP");
      return;
    }
    navigate(`/messages?contact=${id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Cover */}
      <div className="relative h-72 md:h-96 mt-16">
        <img src={creator.cover} alt="" className="h-full w-full object-cover"  loading="lazy" decoding="async" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 flex items-center gap-1.5 rounded-full bg-background/60 backdrop-blur-sm border border-border/50 px-3 py-2 text-sm font-medium text-foreground hover:bg-background/80 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar
        </button>
        <div className="absolute top-6 right-6 flex gap-2">
          <button
            onClick={handleShare}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-background/60 backdrop-blur-sm border border-border/50 text-foreground hover:bg-background/80 transition-colors"
            title="Compartilhar perfil"
          >
            <Share2 className="h-4 w-4" />
          </button>
          {user && !isOwner && (
            <button
              onClick={handleShareAffiliate}
              className="flex items-center gap-1.5 rounded-full bg-background/60 backdrop-blur-sm border border-border/50 px-3 py-2 text-sm font-medium text-foreground hover:bg-background/80 transition-colors"
            >
              <Link2 className="h-4 w-4" />
              Afiliado
            </button>
          )}
        </div>
      </div>

      <div className="container max-w-6xl">
        {/* Profile header */}
        <div className="relative -mt-20 mb-8 flex flex-col md:flex-row md:items-end gap-6 md:gap-8">
          <div className="relative flex-shrink-0">
            <div className="h-32 w-32 rounded-2xl border-4 border-background overflow-hidden bg-muted ring-2 ring-primary/40 shadow-glow">
              <img src={creator.avatar} alt={creator.name} className="h-full w-full object-cover"  loading="lazy" decoding="async" />
            </div>
            {creator.verified && (
              <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
                <Check className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>

          <div className="flex-1 md:pb-2">
            <div className="flex flex-wrap items-start gap-3 mb-2">
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-extrabold text-foreground leading-tight">
                  {creator.name}
                </h1>
                <p className="text-muted-foreground text-sm">@{creator.handle}</p>
              </div>
              {creator.category && (
                <span className="mt-1 rounded-full bg-primary/10 border border-primary/20 px-3 py-0.5 text-xs font-medium text-primary">
                  {creator.category}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-5 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">{creator.subscribers.toLocaleString("pt-BR")}</span> fãs
              </div>
              <div className="text-muted-foreground">
                <span className="font-semibold text-foreground">{creator.posts}</span> posts
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Star className="h-4 w-4 text-accent fill-current" />
                <span className="font-semibold text-foreground">{creator.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 md:pb-2">
            <button
              onClick={toggleFollow}
              disabled={followPending}
              className={`flex items-center gap-2 h-11 px-4 rounded-xl border font-medium text-sm transition-all duration-200 ${
                isFollowing
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border/60 bg-card text-muted-foreground hover:text-primary hover:border-primary/40"
              }`}
            >
              {isFollowing ? (
                <><UserCheck className="h-4 w-4" /> Seguindo</>
              ) : (
                <><UserPlus className="h-4 w-4" /> Seguir</>
              )}
            </button>
            <button
              onClick={() => setLiked(!liked)}
              className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-200 ${
                liked
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border/60 bg-card text-muted-foreground hover:text-primary hover:border-primary/40"
              }`}
            >
              <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
            </button>
            <button
              onClick={handleMessage}
              title={canMessage ? "Enviar mensagem" : "Exclusivo assinantes VIP"}
              className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-200 ${
                canMessage
                  ? "border-border/60 bg-card text-muted-foreground hover:text-foreground hover:border-border"
                  : "border-border/40 bg-muted/30 text-muted-foreground/50 cursor-not-allowed"
              }`}
            >
              <MessageCircle className="h-5 w-5" />
            </button>
            {isOwner && (
              <button
                onClick={() => navigate("/settings")}
                className="flex items-center gap-2 h-11 px-4 rounded-xl border border-border/60 bg-card text-muted-foreground hover:text-foreground hover:border-border transition-all duration-200 text-sm font-medium"
              >
                <Settings className="h-4 w-4" />
                Gerenciar perfil
              </button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_340px] gap-8">
          {/* Left — Posts */}
          <div>
            <div className="flex gap-1 mb-6 rounded-xl bg-muted p-1 w-fit">
              {postTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    activeTab === t
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {activeTab === "Lives" ? (
              /* Lives tab */
              <div className="space-y-4">
                {isOwner && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setScheduleLiveOpen(true)}
                      className="flex items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-105 transition-transform"
                    >
                      <Video className="h-3.5 w-3.5" />
                      Iniciar Live
                    </button>
                  </div>
                )}

                {lives.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-14 text-center border border-dashed border-border/50 rounded-2xl">
                    <Video className="h-10 w-10 text-muted-foreground/30" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Nenhuma live por aqui ainda</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isOwner ? "Agende sua primeira live e avise seus fãs." : `${creator.name} ainda não agendou nenhuma live.`}
                      </p>
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => setScheduleLiveOpen(true)}
                        className="rounded-full bg-gradient-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-glow hover:scale-105 transition-transform mt-1"
                      >
                        Agendar agora
                      </button>
                    )}
                  </div>
                ) : (
                  lives.map((live) => {
                    const canView = live.min_plan === "free" || (!!user && hasAccessTo(live.min_plan));
                    const isNative = !live.stream_url || live.stream_url === "native";
                    const isLive = live.status === "live";
                    const isScheduled = live.status === "scheduled";
                    const isEnded = live.status === "ended";

                    return (
                      <div
                        key={live.id}
                        className={`rounded-2xl border overflow-hidden ${isLive ? "border-red-500/40" : "border-border/50"}`}
                      >
                        {/* Header */}
                        <div className={`flex items-start gap-3 p-4 ${isLive ? "bg-red-500/5" : "bg-card"}`}>
                          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${isLive ? "bg-red-500/20" : isScheduled ? "bg-primary/10" : "bg-muted/40"}`}>
                            {isLive ? (
                              <Radio className="h-4 w-4 text-red-400" />
                            ) : isScheduled ? (
                              <Calendar className="h-4 w-4 text-primary" />
                            ) : (
                              <Video className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-foreground">{live.title}</p>
                              {isLive && (
                                <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
                                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                                  AO VIVO
                                </span>
                              )}
                              {isEnded && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Encerrada</span>
                              )}
                            </div>
                            {live.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{live.description}</p>
                            )}
                            {live.scheduled_at && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {isScheduled
                                  ? `Agendada para ${format(new Date(live.scheduled_at), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}`
                                  : isLive
                                    ? "Ao vivo agora"
                                    : `Encerrada em ${format(new Date(live.scheduled_at), "d 'de' MMMM", { locale: ptBR })}`}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {live.min_plan === "free" ? "🌐 Todos" : live.min_plan === "fan" ? "💖 Fãs" : live.min_plan === "superfan" ? "🔥 Super Fãs" : "💎 VIP"}
                            </p>
                          </div>
                          {isOwner && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isScheduled && (
                                <button
                                  onClick={() => updateLive.mutate({ id: live.id, status: "live" })}
                                  className="rounded-lg bg-red-500/90 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-500 transition-colors"
                                >
                                  Iniciar
                                </button>
                              )}
                              {isLive && (
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
                          )}
                        </div>

                        {/* Player / locked state */}
                        {isLive && (
                          canView ? (
                            <div>
                              {isNative ? (
                                <NativeLivePlayer
                                  liveId={live.id}
                                  isHost={isOwner}
                                  onEnd={isOwner ? () => updateLive.mutate({ id: live.id, status: "ended" }) : undefined}
                                />
                              ) : (
                                <div className="flex flex-col items-center gap-2 py-8 bg-muted/20 text-center">
                                  <Radio className="h-8 w-8 text-red-400 animate-pulse" />
                                  <p className="text-sm font-medium text-foreground">Live em andamento</p>
                                  {live.stream_url && (
                                    <a
                                      href={live.stream_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline"
                                    >
                                      Abrir link da live →
                                    </a>
                                  )}
                                </div>
                              )}
                              <LiveChat liveId={live.id} className="rounded-none border-x-0 border-b-0 border-t border-border/40" />
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-3 py-10 bg-muted/20 text-center">
                              <Lock className="h-8 w-8 text-primary" />
                              <div>
                                <p className="text-sm font-semibold text-foreground">Live exclusiva</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Assine o plano {live.min_plan === "fan" ? "Fã" : live.min_plan === "superfan" ? "Super Fã" : "VIP"} para assistir.
                                </p>
                              </div>
                              <button
                                onClick={handleSubscribe}
                                className="rounded-full bg-gradient-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-glow hover:scale-105 transition-transform"
                              >
                                Desbloquear agora
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : authLoading ? (
              /* Auth still hydrating — render nothing to avoid flash */
              <div className="grid grid-cols-3 gap-2 select-none pointer-events-none opacity-20">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-xl bg-muted border border-border/40 animate-pulse" />
                ))}
              </div>
            ) : !user ? (
              /* Unauthenticated: show free posts + teaser locked + signup banner */
              (() => {
                const freePosts = displayPosts.filter((p) => p.minPlan === "free");
                const paidPosts = displayPosts.filter((p) => p.minPlan !== "free");
                const teaserPosts = paidPosts.slice(0, 3);

                return freePosts.length === 0 && paidPosts.length === 0 ? (
                  <div className="col-span-3 py-16 text-center text-muted-foreground">
                    <p className="text-sm">Nenhum post publicado ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      {/* Free posts — fully visible */}
                      {freePosts.map((post) => (
                        <div
                          key={post.id}
                          className="group relative aspect-square rounded-xl overflow-hidden bg-muted border border-border/40 cursor-pointer"
                        >
                          {post.mediaUrl ? (
                            <img
                              src={post.mediaUrl}
                              alt=""
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                             loading="lazy" decoding="async" />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-muted to-secondary flex items-center justify-center">
                              <span className="text-muted-foreground text-xs">Sem mídia</span>
                            </div>
                          )}
                          {post.type === "video" && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm">
                                <Zap className="h-4 w-4 text-primary fill-current" />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Teaser locked posts — blurred */}
                      {teaserPosts.map((post) => (
                        <div
                          key={post.id}
                          onClick={() => {
                            toast.info("Crie uma conta para acessar conteúdo exclusivo");
                            navigate("/signup");
                          }}
                          className="group relative aspect-square rounded-xl overflow-hidden bg-muted border border-border/40 cursor-pointer"
                        >
                          {post.mediaUrl ? (
                            <img
                              src={post.mediaUrl}
                              alt=""
                              className="h-full w-full object-cover blur-xl scale-110"
                             loading="lazy" decoding="async" />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-muted to-secondary blur-sm" />
                          )}
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm border border-border/60">
                              <Lock className="h-4 w-4 text-primary" />
                            </div>
                            <p className="text-[10px] font-medium text-foreground/80">Conteúdo exclusivo</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Signup banner */}
                    {(paidPosts.length > 0 || freePosts.length > 0) && (
                      <div className="flex flex-col items-center gap-4 rounded-2xl bg-card border border-border/40 p-8 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/30">
                          <Lock className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-display font-bold text-foreground text-base mb-1">
                            Crie sua conta para ver mais conteúdo
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Cadastro gratuito. Acesse posts exclusivos de {creator.name}.
                          </p>
                        </div>
                        <Link
                          to="/signup"
                          className="rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-glow hover:scale-105 transition-transform"
                        >
                          Cadastrar agora
                        </Link>
                        <Link to="/login" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                          Já tenho conta → Entrar
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : filteredPosts.length === 0 ? (
              <div className="col-span-3 py-16 text-center text-muted-foreground">
                <p className="text-sm">Nenhum post publicado ainda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={post.locked ? () => handleLockedPostClick(post.minPlan) : undefined}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-muted border border-border/40 cursor-pointer"
                  >
                    {post.locked ? (
                      <>
                        {post.mediaUrl ? (
                          <img
                            src={post.mediaUrl}
                            alt=""
                            className="h-full w-full object-cover blur-xl scale-110"
                           loading="lazy" decoding="async" />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-primary/15 to-secondary/20" />
                        )}
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/40 backdrop-blur-[2px]">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border/60">
                            <Lock className="h-4 w-4 text-primary" />
                          </div>
                          <p className="text-[10px] font-semibold text-foreground">Exclusivo</p>
                        </div>
                      </>
                    ) : (
                      <>
                        {post.mediaUrl ? (
                          <img
                            src={post.mediaUrl}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                           loading="lazy" decoding="async" />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-muted to-secondary flex items-center justify-center">
                            <span className="text-muted-foreground text-xs">Sem mídia</span>
                          </div>
                        )}
                        {post.type === "video" && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm">
                              <Zap className="h-4 w-4 text-primary fill-current" />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right — Subscription plans */}
          <div className="space-y-4">
            {isSubscribed && effectiveUpgradeIndex >= 0 && highestLockedPlan && (
              <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 space-y-2">
                <p className="font-display font-bold text-foreground">
                  Upgrade para {plans[effectiveUpgradeIndex].name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Você tem {displayPosts.filter((p) => p.locked).length} conteúdo(s) bloqueado(s) no tier{" "}
                  {PLAN_LABELS[highestLockedPlan] ?? highestLockedPlan}. Faça upgrade para desbloquear.
                </p>
                <p className="text-sm font-semibold text-primary">
                  Apenas R$ {getCheckoutAmount(effectiveUpgradeIndex).toFixed(2).replace(".", ",")} (diferença do plano atual)
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlan(effectiveUpgradeIndex);
                    setPixModalOpen(true);
                  }}
                  className="w-full rounded-xl bg-gradient-primary py-2.5 text-sm font-bold text-primary-foreground"
                >
                  Fazer upgrade agora
                </button>
              </div>
            )}

            <h2 className="font-display text-lg font-bold text-foreground">Planos de assinatura</h2>
            {recentSubsCount > 0 && (
              <p className="text-xs text-green-400 flex items-center gap-1 -mt-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                {recentSubsCount} {recentSubsCount === 1 ? "nova adesão" : "novas adesões"} nos últimos 30 dias
              </p>
            )}

            {plans.map((plan, i) => {
              const price = plan.price.toFixed(2).replace(".", ",");
              return (
                <div
                  key={plan.name}
                  onClick={() => setSelectedPlan(i)}
                  className={`relative rounded-2xl border p-5 cursor-pointer transition-all duration-200 ${
                    plan.popular
                      ? `border-primary/60 ring-1 ring-primary/30 ${selectedPlan === i ? "bg-primary/5 shadow-glow" : "bg-gradient-card"}`
                      : selectedPlan === i
                        ? "border-primary/60 bg-primary/5 shadow-glow"
                        : "border-border/50 bg-gradient-card hover:border-primary/30"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-3 py-0.5 text-xs font-bold text-primary-foreground shadow-glow whitespace-nowrap">
                      Mais popular
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{plan.emoji}</span>
                      <div>
                        <p className="font-display font-bold text-foreground">{plan.name}</p>
                        <p className="text-xs text-muted-foreground">{plan.desc}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-extrabold text-primary">R$ {price}</p>
                      <p className="text-xs text-muted-foreground">/mês</p>
                    </div>
                  </div>

                  <ul className="space-y-1.5">
                    {plan.perks.map((perk) => (
                      <li key={perk} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}

            <button
              onClick={handleSubscribe}
              disabled={isSubscribed && effectiveUpgradeIndex < 0}
              className="w-full rounded-2xl bg-gradient-primary py-4 font-display font-bold text-primary-foreground shadow-glow transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_30px_hsl(340_80%_58%_/_0.5)] disabled:opacity-60 disabled:hover:scale-100"
            >
              {isSubscribed && effectiveUpgradeIndex < 0
                ? "Já assinado ✓"
                : isSubscribed && effectiveUpgradeIndex >= 0
                  ? `Upgrade por R$ ${getCheckoutAmount(effectiveUpgradeIndex).toFixed(2).replace(".", ",")}`
                  : `Assinar por R$ ${plans[selectedPlan].price.toFixed(2).replace(".", ",")}/mês`}
            </button>

            {user && !isOwner && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowTipPicker((v) => !v)}
                  className="w-full rounded-2xl border border-border/60 py-3 text-sm font-semibold text-foreground hover:border-primary/40 transition-colors"
                >
                  Enviar gorjeta via Pix 💸
                </button>
                {showTipPicker && (
                  <div className="rounded-2xl border border-border/40 bg-card p-3 space-y-3">
                    <p className="text-xs text-muted-foreground text-center">Escolha o valor</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[5, 10, 25, 50].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setTipAmount(v)}
                          className={`rounded-xl border py-2 text-sm font-bold transition-all ${tipAmount === v ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-foreground hover:border-primary/40"}`}
                        >
                          R${v}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowTipPicker(false); setTipModalOpen(true); }}
                      className="w-full rounded-xl bg-gradient-primary py-2.5 text-sm font-bold text-primary-foreground shadow-glow hover:scale-[1.02] transition-all"
                    >
                      Enviar R$ {tipAmount} via Pix
                    </button>
                  </div>
                )}
                <TipCoinsButton creatorId={creator.id} creatorName={creator.name} />
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              Cancele quando quiser. Sem fidelidade.
            </p>
          </div>
        </div>

        {/* Owner — Meus Posts management section */}
        {isOwner && (
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-bold text-foreground">Meus Posts</h2>
              <span className="text-sm text-muted-foreground">({myPosts.length})</span>
            </div>

            {myPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/50 rounded-2xl">
                <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum post publicado ainda.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Publique conteúdo pelo dashboard.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {myPosts.map((post) => {
                  const planInfo = POST_PLAN_LABELS[post.min_plan] ?? POST_PLAN_LABELS.free;
                  return (
                    <div key={post.id} className="group relative aspect-square rounded-xl overflow-hidden bg-muted border border-border/40">
                      {post.media_url ? (
                        <SignedImage
                          src={post.media_url}
                          alt=""
                          transform={{ width: 400, quality: 70, resize: "cover" }}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-muted to-secondary flex items-center justify-center p-3">
                          <p className="text-xs text-muted-foreground text-center line-clamp-4">{post.text || "Post sem mídia"}</p>
                        </div>
                      )}

                      {/* Plan badge */}
                      <div className="absolute top-2 left-2 rounded-full bg-background/80 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-foreground">
                        {planInfo.emoji} {planInfo.label}
                      </div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button
                          onClick={() => openEdit(post)}
                          className="flex items-center gap-1.5 rounded-xl bg-card border border-border px-3 py-2 text-xs font-semibold text-foreground hover:border-primary/60 hover:text-primary transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </button>
                        <button
                          onClick={() => setDeletePost(post)}
                          className="flex items-center gap-1.5 rounded-xl bg-card border border-border px-3 py-2 text-xs font-semibold text-foreground hover:border-destructive/60 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="h-24" />

      {user && (
        <>
          <PixPaymentModal
            open={pixModalOpen}
            onClose={() => setPixModalOpen(false)}
            onSuccess={() => {}}
            creatorId={id!}
            creatorName={creator.name}
            planName={plans[selectedPlan].planKey}
            amount={getCheckoutAmount(selectedPlan)}
            fanId={user.id}
            fanEmail={user.email ?? ""}
            creatorPixelId={creatorPixelId}
            creatorAccessToken={creatorAccessToken}
            nextPlanName={upsellPlan?.name}
            nextPlanDiff={upsellDiff}
            onUpgrade={handleUpgradeAfterSuccess}
          />
          <PixPaymentModal
            open={tipModalOpen}
            onClose={() => { setTipModalOpen(false); setShowTipPicker(false); }}
            onSuccess={() => toast.success("Gorjeta enviada! Obrigado pelo apoio.")}
            creatorId={id!}
            creatorName={creator.name}
            planName="tip"
            amount={tipAmount}
            fanId={user.id}
            fanEmail={user.email ?? ""}
            creatorPixelId={creatorPixelId}
            creatorAccessToken={creatorAccessToken}
          />
        </>
      )}

      {/* Similar creators */}
      {similarCreators.length > 0 && (
        <div className="container max-w-6xl pb-10">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">Você também pode gostar</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {similarCreators.map((c) => (
              <Link
                key={c.id}
                to={`/creator/${c.id}`}
                className="glass-card rounded-2xl p-3 flex flex-col items-center gap-2 text-center hover:border-primary/40 transition-colors group"
              >
                <div className="h-14 w-14 rounded-xl overflow-hidden bg-muted flex-shrink-0 ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt={c.name} className="h-full w-full object-cover"  loading="lazy" decoding="async" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-primary text-primary-foreground text-lg font-bold">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 w-full">
                  <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                  {c.handle && (
                    <p className="text-[10px] text-muted-foreground truncate">@{c.handle}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Sticky mobile CTA — biggest conversion lever on /u/:handle */}
      {!isOwner && plans.length > 0 && (
        <>
          <div className="md:hidden h-20" aria-hidden />
          <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 border-t border-border/50 bg-background/95 backdrop-blur-xl px-4 py-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none mb-0.5">
                {isSubscribed && effectiveUpgradeIndex < 0 ? "Plano atual" : "A partir de"}
              </p>
              <p className="font-display text-base font-bold text-primary truncate leading-tight">
                {isSubscribed && effectiveUpgradeIndex < 0
                  ? `${PLAN_LABELS[subscription?.plan ?? "fan"] ?? "Assinante"} ✓`
                  : `R$ ${(isSubscribed && effectiveUpgradeIndex >= 0
                      ? getCheckoutAmount(effectiveUpgradeIndex)
                      : plans[0].price
                    ).toFixed(2).replace(".", ",")}${isSubscribed && effectiveUpgradeIndex >= 0 ? "" : "/mês"}`}
              </p>
            </div>
            <button
              onClick={handleSubscribe}
              disabled={isSubscribed && effectiveUpgradeIndex < 0}
              className="flex-shrink-0 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow active:scale-95 transition-transform disabled:opacity-60"
            >
              {isSubscribed && effectiveUpgradeIndex < 0
                ? "Assinante"
                : isSubscribed
                  ? "Fazer upgrade"
                  : "Assinar agora"}
            </button>
          </div>
        </>
      )}

      {isOwner && (
        <ScheduleLiveModal
          open={scheduleLiveOpen}
          onClose={() => setScheduleLiveOpen(false)}
          creatorId={id!}
          onCreated={() => setActiveTab("Lives")}
        />

      )}

      {/* Edit post modal */}
      <Dialog open={!!editPost} onOpenChange={(open) => !open && setEditPost(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar post</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Legenda</label>
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Escreva a legenda..."
                className="resize-none min-h-[100px]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Nível de acesso</label>
              <Select value={editPlan} onValueChange={setEditPlan}>
                <SelectTrigger>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPost(null)}>Cancelar</Button>
            <Button
              onClick={() => editPost && updateMutation.mutate({ postId: editPost.id, text: editText, minPlan: editPlan })}
              disabled={updateMutation.isPending}
              className="bg-gradient-primary text-primary-foreground shadow-glow"
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletePost} onOpenChange={(open) => !open && setDeletePost(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir post?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O post será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePost && deleteMutation.mutate(deletePost.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CreatorProfile;
