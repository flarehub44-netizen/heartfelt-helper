import { useState, useMemo, useRef, useEffect } from "react";
import { useFollow } from "@/hooks/useFollow";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Share2, Lock, MoreHorizontal, Bookmark, Send, Loader2, Flame, Copy, User } from "lucide-react";
import PostSkeleton from "@/components/PostSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import { RenewalBanner } from "@/components/RenewalBanner";
import { Compass } from "lucide-react";
import { usePosts } from "@/hooks/usePosts";
import { useCreators } from "@/hooks/useCreators";
import { useFanPreferences } from "@/hooks/useFanPreferences";
import { useAuth } from "@/contexts/AuthContext";
import { useMySubscriptionMap } from "@/hooks/useMySubscriptions";
import { useMyFollows } from "@/hooks/useMyFollows";
import { planMeetsMin, PLAN_LABELS, getCheapestPlanForMin } from "@/lib/plans";
import { getLoginPath } from "@/lib/authRedirect";
import { useComments } from "@/hooks/useComments";
import { PixPaymentModal } from "@/components/PixPaymentModal";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { avatarUrl, thumbUrl } from "@/lib/imageTransform";
import { trackPostView } from "@/hooks/usePostStats";
import { useBookmarks, useToggleBookmark } from "@/hooks/useBookmarks";
import { SignedImage } from "@/components/SignedMedia";

interface PixModalState {
  creatorId: string;
  creatorName: string;
  planName: string;
  amount: number;
}

function useCreatorPlansByCreator(creatorIds: string[]) {
  return useQuery({
    queryKey: ["creatorPlansByCreator", creatorIds.join(",")],
    queryFn: async () => {
      if (!creatorIds.length) return {} as Record<string, { plan_name: string; price: number }[]>;
      const { data, error } = await supabase
        .from("creator_plans")
        .select("creator_id, plan_name, price")
        .in("creator_id", creatorIds)
        .order("price", { ascending: true });
      if (error) throw error;
      const map: Record<string, { plan_name: string; price: number }[]> = {};
      for (const row of data ?? []) {
        if (!map[row.creator_id]) map[row.creator_id] = [];
        map[row.creator_id].push({ plan_name: row.plan_name, price: Number(row.price) });
      }
      return map;
    },
    enabled: creatorIds.length > 0,
  });
}

// Single comment row — used recursively for replies
function CommentRow({ c, onReply }: { c: import("@/hooks/useComments").Comment; onReply: (id: string, name: string) => void }) {
  return (
    <div className="flex items-start gap-2">
      <img
        src={c.author.avatar_url ?? "/placeholder.svg"}
        alt={c.author.name}
        className="h-7 w-7 rounded-full object-cover flex-shrink-0 ring-1 ring-border/40 mt-0.5"
       loading="lazy" decoding="async" />
      <div className="flex-1 min-w-0">
        <div className="bg-muted/50 rounded-xl px-3 py-1.5 inline-block max-w-full">
          <span className="text-xs font-semibold text-foreground mr-1.5">{c.author.name}</span>
          <span className="text-xs text-foreground/80">{c.text}</span>
        </div>
        <button
          onClick={() => onReply(c.id, c.author.name)}
          className="text-[10px] text-muted-foreground hover:text-primary ml-2 mt-0.5 transition-colors"
        >
          Responder
        </button>
        {c.replies && c.replies.length > 0 && (
          <div className="mt-2 pl-3 border-l border-border/40 flex flex-col gap-2">
            {c.replies.map((r) => (
              <CommentRow key={r.id} c={r} onReply={onReply} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Comment section for a single post
function CommentSection({ postId }: { postId: string }) {
  const { user, profile } = useAuth();
  const { comments, isLoading, addComment } = useComments(postId);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (!user) {
      toast.error("Faça login para comentar");
      return;
    }
    addComment.mutate(
      { text: text.trim(), authorId: user.id, parentId: replyTo?.id },
      { onSuccess: () => { setText(""); setReplyTo(null); } }
    );
  };

  const handleReply = (id: string, name: string) => setReplyTo({ id, name });

  return (
    <div className="border-t border-border/40 px-4 py-3 flex flex-col gap-3">
      {isLoading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-1">Seja o primeiro a comentar</p>
      ) : (
        <div className="flex flex-col gap-2.5 max-h-56 overflow-y-auto">
          {comments.map((c) => (
            <CommentRow key={c.id} c={c} onReply={handleReply} />
          ))}
        </div>
      )}

      {user && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
          {replyTo && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-1.5">
              Respondendo <span className="font-semibold text-foreground">@{replyTo.name}</span>
              <button type="button" onClick={() => setReplyTo(null)} className="ml-auto text-muted-foreground hover:text-foreground">×</button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <img
              src={profile?.avatar_url ?? "/placeholder.svg"}
              alt=""
              className="h-7 w-7 rounded-full object-cover flex-shrink-0"
             loading="lazy" decoding="async" />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={replyTo ? `Respondendo @${replyTo.name}...` : "Adicionar comentário..."}
              className="flex-1 bg-muted/50 border border-border/40 rounded-full px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <button
              type="submit"
              disabled={!text.trim() || addComment.isPending}
              className="text-primary disabled:text-muted-foreground transition-colors"
            >
              {addComment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// Follow button per suggestion item (needs its own component for hook rules)
function SuggestionItem({ creator }: { creator: { id: string | number; name: string; avatar_url?: string | null; avatar?: string; category?: string | null } }) {
  const { isFollowing, toggle, isPending } = useFollow(String(creator.id));
  return (
    <div className="flex items-center justify-between gap-2">
      <Link to={`/creator/${creator.id}`} className="flex items-center gap-2 min-w-0">
        <img src={creator.avatar_url || (creator as any).avatar || "/placeholder.svg"} alt={creator.name} className="h-9 w-9 rounded-full object-cover flex-shrink-0"  loading="lazy" decoding="async" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{creator.name}</p>
          <p className="text-xs text-muted-foreground">{creator.category}</p>
        </div>
      </Link>
      <button
        onClick={toggle}
        disabled={isPending}
        className={`text-xs font-semibold flex-shrink-0 transition-colors px-2 py-1 rounded-lg ${
          isFollowing
            ? "text-muted-foreground bg-muted/60"
            : "text-primary hover:text-primary/80"
        }`}
      >
        {isFollowing ? "Seguindo" : "Seguir"}
      </button>
    </div>
  );
}

function PostViewTracker({ postId }: { postId: string }) {
  useEffect(() => { trackPostView(postId); }, [postId]);
  return null;
}

const Feed = () => {
  const { posts: realPosts, likePost, isLoading: postsLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = usePosts();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const { data: realCreators, isLoading: creatorsLoading } = useCreators();
  const { data: prefCategories = [] } = useFanPreferences();

  const sortedPosts = useMemo(() => {
    if (!prefCategories.length) return realPosts;
    return [...realPosts].sort((a, b) => {
      const aCat = (a.creator as { category?: string | null }).category ?? "";
      const bCat = (b.creator as { category?: string | null }).category ?? "";
      const aMatch = prefCategories.includes(aCat);
      const bMatch = prefCategories.includes(bCat);
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
  }, [realPosts, prefCategories]);
  const { user, profile } = useAuth();
  const mySubscriptionMap = useMySubscriptionMap();
  const myFollows = useMyFollows();
  const [feedTab, setFeedTab] = useState<"following" | "discover">("following");
  const [localLikes, setLocalLikes] = useState<Set<string>>(new Set());
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [pixModal, setPixModal] = useState<PixModalState | null>(null);
  const { bookmarkedIds } = useBookmarks();
  const toggleBookmark = useToggleBookmark();

  const stories = realCreators?.slice(0, 6) ?? [];
  const suggestions = realCreators?.slice(0, 5) ?? [];

  // Tab filtering: "Seguindo" = creators the user follows OR subscribes to.
  const followingIds = useMemo(() => {
    const ids = new Set<string>(myFollows);
    mySubscriptionMap.forEach((_, k) => ids.add(k));
    return ids;
  }, [myFollows, mySubscriptionMap]);

  const visiblePosts = useMemo(() => {
    if (!user) return sortedPosts;
    if (feedTab === "following") {
      return sortedPosts.filter((p) => followingIds.has(p.creator_id));
    }
    // Discover = everything you DON'T already follow/sub to
    return sortedPosts.filter((p) => !followingIds.has(p.creator_id));
  }, [sortedPosts, feedTab, followingIds, user]);

  const creatorIds = [...new Set(visiblePosts.map((p) => p.creator_id))];
  const { data: plansByCreator = {} } = useCreatorPlansByCreator(creatorIds);

  const feedPosts = visiblePosts.map((p) => ({
    id: p.id,
    min_plan: p.min_plan,
    creator: {
      id: p.creator_id,
      name: p.creator.name,
      handle: p.creator.handle ?? "",
      avatar: p.creator.avatar_url ?? "/placeholder.svg",
      price: 0,
    },
    time: formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: ptBR }),
    text: p.text,
    image: p.media_url,
    locked:
      p.min_plan !== "free" &&
      !planMeetsMin(mySubscriptionMap.get(p.creator_id), p.min_plan),
    likes: p.likes_count,
    comments: 0,
    liked: localLikes.has(p.id),
  }));

  const toggleLike = (id: string) => {
    const post = realPosts.find((p) => p.id === id);
    if (post && !localLikes.has(id)) {
      setLocalLikes((prev) => new Set(prev).add(id));
      likePost.mutate({ postId: id });
      // Post-like tip nudge — surface once per session per creator
      if (user && user.id !== post.creator_id) {
        const key = `tip_nudge_${post.creator_id}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          const TIP = 10;
          toast(`Curtiu? Manda ${TIP} 🪙 para ${post.creator.name}`, {
            duration: 6000,
            action: {
              label: `Enviar ${TIP} 🪙`,
              onClick: async () => {
                const { error } = await supabase.rpc("tip_with_coins", {
                  p_creator_id: post.creator_id,
                  p_amount: TIP,
                  p_message: null,
                });
                if (error) {
                  toast.error(error.message.includes("saldo") ? "Saldo insuficiente — recarregue a carteira" : error.message);
                } else {
                  toast.success(`Enviou ${TIP} 🪙 para ${post.creator.name}!`);
                }
              },
            },
          });
        }
      }
    }
  };

  const toggleComments = (id: string) => {
    setOpenComments((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSubscribeFromPost = (post: typeof feedPosts[number] & { min_plan?: string }) => {
    if (!user) {
      window.location.href = getLoginPath(`/creator/${post.creator.id}?openSubscribe=1`);
      return;
    }
    const creatorPlans = plansByCreator[post.creator.id] ?? [];
    const minPlan = post.min_plan ?? "fan";
    const plan =
      getCheapestPlanForMin(creatorPlans, minPlan) ??
      creatorPlans[0];
    setPixModal({
      creatorId: String(post.creator.id),
      creatorName: post.creator.name,
      planName: plan?.plan_name ?? "fan",
      amount: plan?.price ?? 9.9,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-6xl pt-24 pb-24 md:pb-16 flex gap-8">
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          <RenewalBanner />
          <div className="glass-card rounded-2xl p-4">
            <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
              {creatorsLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                      <Skeleton className="h-16 w-16 rounded-full" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  ))
                : stories.map((creator) => (
                    <Link key={creator.id} to={`/creator/${creator.id}`} className="flex flex-col items-center gap-2 flex-shrink-0">
                      <div className="relative">
                        <div className="h-16 w-16 rounded-full p-0.5 bg-gradient-primary shadow-glow">
                          <img
                            src={avatarUrl((creator as any).avatar_url || (creator as any).avatar, 64)}
                            alt={creator.name}
                            className="h-full w-full rounded-full object-cover border-2 border-background"
                           loading="lazy" decoding="async" />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground max-w-[60px] truncate">{creator.name.split(" ")[0]}</span>
                    </Link>
                  ))}
            </div>
          </div>

          {/* Mobile suggestions */}
          <div className="flex lg:hidden gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {suggestions.map((creator) => (
              <Link key={creator.id} to={`/creator/${creator.id}`} className="flex items-center gap-2 flex-shrink-0 glass-card rounded-xl px-3 py-2">
                <img
                  src={(creator as any).avatar_url || (creator as any).avatar || "/placeholder.svg"}
                  alt={creator.name}
                  className="h-8 w-8 rounded-full object-cover"
                 loading="lazy" decoding="async" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate max-w-[80px]">{creator.name}</p>
                  <p className="text-[10px] text-muted-foreground">{(creator as any).category}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Tabs: Seguindo / Descobrir */}
          {user && (
            <div className="flex items-center gap-1 border-b border-border/50">
              {([
                { key: "following", label: "Seguindo", count: followingIds.size },
                { key: "discover", label: "Descobrir" },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setFeedTab(t.key)}
                  className={`relative px-4 py-3 text-sm font-semibold transition-colors ${
                    feedTab === t.key
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                  {feedTab === t.key && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Posts */}
          {postsLoading ? (
            Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)
          ) : feedPosts.length === 0 ? (
            <div className="flex flex-col gap-5">
              <div className="glass-card rounded-2xl p-8 text-center">
                <Compass className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                {feedTab === "following" && user ? (
                  <>
                    <p className="font-semibold text-foreground mb-1">
                      {followingIds.size === 0
                        ? "Você ainda não segue ninguém"
                        : "Sem novidades por enquanto"}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {followingIds.size === 0
                        ? "Siga ou assine criadores para ver o conteúdo deles aqui."
                        : "Quem você segue ainda não publicou. Que tal descobrir algo novo?"}
                    </p>
                    <button
                      onClick={() => setFeedTab("discover")}
                      className="inline-flex rounded-full bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow hover:scale-105 transition-transform"
                    >
                      Ver aba Descobrir
                    </button>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-foreground mb-1">Seu feed está vazio</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Assine ou siga criadores para ver o conteúdo deles aqui.
                    </p>
                    <Link
                      to="/discover"
                      className="inline-flex rounded-full bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow hover:scale-105 transition-transform"
                    >
                      Descobrir criadores
                    </Link>
                  </>
                )}
              </div>
              {(realCreators ?? []).length > 0 && (
                <div className="glass-card rounded-2xl p-5">
                  <p className="text-sm font-semibold text-foreground mb-4">
                    {feedTab === "following" && user
                      ? "Comece seguindo alguém"
                      : "Criadores em destaque"}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(realCreators ?? []).slice(0, 6).map((creator) => (
                      <Link
                        key={creator.id}
                        to={`/creator/${creator.id}`}
                        className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/10 p-3 hover:border-primary/40 transition-colors group"
                      >
                        <img
                          src={(creator as any).avatar_url || (creator as any).avatar || "/placeholder.svg"}
                          alt={creator.name}
                          className="h-10 w-10 rounded-full object-cover flex-shrink-0 ring-2 ring-transparent group-hover:ring-primary/30 transition-all"
                         loading="lazy" decoding="async" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{creator.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{(creator as any).category ?? "Criador"}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : feedPosts.map((post) => (
            <div key={post.id} className="glass-card rounded-2xl overflow-hidden">
              {!post.locked && <PostViewTracker postId={post.id} />}
              <div className="flex items-center justify-between p-4">

                <Link to={`/creator/${post.creator.id}`} className="flex items-center gap-3">
                  <img src={post.creator.avatar} alt={post.creator.name} className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/30"  loading="lazy" decoding="async" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{post.creator.name}</p>
                    <p className="text-xs text-muted-foreground">@{post.creator.handle} · {post.time}</p>
                  </div>
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setOpenMenu(openMenu === post.id ? null : post.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                  {openMenu === post.id && (
                    <div
                      className="absolute right-0 top-7 z-20 w-44 rounded-xl bg-card border border-border/50 shadow-lg overflow-hidden"
                      onMouseLeave={() => setOpenMenu(null)}
                    >
                      <Link
                        to={`/creator/${post.creator.id}`}
                        onClick={() => setOpenMenu(null)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        Ver perfil do criador
                      </Link>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/creator/${post.creator.id}`);
                          toast.success("Link copiado!");
                          setOpenMenu(null);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        Copiar link
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {post.text && (
                <p className="px-4 pb-3 text-sm text-foreground">{post.text}</p>
              )}

              {post.image ? (
                <div className="relative">
                  <SignedImage
                    src={post.image}
                    alt="Post"
                    transform={{ width: 800, quality: 75, resize: "cover" }}
                    className={`w-full aspect-[4/3] object-cover ${post.locked ? "blur-xl scale-105" : ""}`}
                  />
                  {post.locked && (() => {
                    const minPlan = (post as { min_plan?: string }).min_plan ?? "fan";
                    const creatorPlans = plansByCreator[post.creator.id] ?? [];
                    const plan = getCheapestPlanForMin(creatorPlans, minPlan) ?? creatorPlans[0];
                    const planLabel = PLAN_LABELS[minPlan] ? `${PLAN_LABELS[minPlan]}s` : "Assinantes";
                    const price = plan?.price ?? 9.9;
                    return (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-sm">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
                          <Lock className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          Exclusivo para {planLabel}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                          <Flame className="h-3.5 w-3.5" />
                          <span>Vagas limitadas</span>
                        </div>
                        <button
                          onClick={() => handleSubscribeFromPost(post)}
                          className="rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow hover:scale-105 transition-transform"
                        >
                          Desbloquear por R$ {price.toFixed(2).replace(".", ",")}/mês
                        </button>
                      </div>
                    );
                  })()}
                </div>
              ) : post.locked ? (() => {
                const minPlan = (post as { min_plan?: string }).min_plan ?? "fan";
                const creatorPlans = plansByCreator[post.creator.id] ?? [];
                const plan = getCheapestPlanForMin(creatorPlans, minPlan) ?? creatorPlans[0];
                const planLabel = PLAN_LABELS[minPlan] ? `${PLAN_LABELS[minPlan]}s` : "Assinantes";
                const price = plan?.price ?? 9.9;
                return (
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-primary/10 via-secondary/10 to-primary/5 flex flex-col items-center justify-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
                      <Lock className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Exclusivo para {planLabel}</p>
                    <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                      <Flame className="h-3.5 w-3.5" />
                      <span>Conteúdo bloqueado</span>
                    </div>
                    <button
                      onClick={() => handleSubscribeFromPost(post)}
                      className="rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow hover:scale-105 transition-transform"
                    >
                      Desbloquear por R$ {price.toFixed(2).replace(".", ",")}/mês
                    </button>
                  </div>
                );
              })() : null}

              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${post.liked ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                  >
                    <Heart className={`h-5 w-5 ${post.liked ? "fill-primary" : ""}`} />
                    <span>{post.likes.toLocaleString("pt-BR")}</span>
                  </button>
                  <button
                    onClick={() => toggleComments(post.id)}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${openComments.has(post.id) ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <MessageCircle className={`h-5 w-5 ${openComments.has(post.id) ? "fill-primary/20" : ""}`} />
                    <span>{openComments.has(post.id) ? "−" : "+"}</span>
                  </button>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/creator/${post.creator.id}`;
                      if (navigator.share) {
                        navigator.share({ title: `${post.creator.name} na Flare`, url });
                      } else {
                        navigator.clipboard.writeText(url);
                        toast.success("Link copiado!");
                      }
                    }}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={() => toggleBookmark.mutate({ postId: post.id, isBookmarked: bookmarkedIds.has(post.id) })}
                  className={`transition-colors ${bookmarkedIds.has(post.id) ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Bookmark className={`h-5 w-5 ${bookmarkedIds.has(post.id) ? "fill-primary" : ""}`} />
                </button>
              </div>

              {openComments.has(post.id) && (
                <CommentSection postId={post.id} />
              )}
            </div>
          ))}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-4" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          {!hasNextPage && realPosts.length > 0 && !postsLoading && (
            <p className="text-center text-xs text-muted-foreground py-6">Você chegou ao fim do feed.</p>
          )}
        </div>


        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col gap-4 w-72 flex-shrink-0">
          <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow flex-shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover"  loading="lazy" decoding="async" />
              ) : (
                <span className="text-primary-foreground font-bold text-lg">
                  {(profile?.name || "V").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm">{profile?.name || "Você"}</p>
              <p className="text-xs text-muted-foreground">@{profile?.handle || "voce"}</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4 flex flex-col gap-3">
            <p className="text-sm font-semibold text-foreground">Sugestões para você</p>
            {suggestions.map((creator) => (
              <SuggestionItem key={creator.id} creator={creator} />
            ))}
          </div>
        </aside>
      </div>

      {/* PIX Payment Modal — triggered from locked posts */}
      {pixModal && user && (
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
    </div>
  );
};

export default Feed;
