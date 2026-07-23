import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, SlidersHorizontal, Flame, TrendingUp, Heart, Loader2, Radio } from "lucide-react";
import Navbar from "@/components/Navbar";
import CreatorCard from "@/components/CreatorCard";
import CreatorCardSkeleton from "@/components/CreatorCardSkeleton";
import { PendingCheckoutBanner } from "@/components/PendingCheckoutBanner";
import { RenewalBanner } from "@/components/RenewalBanner";
import { useCreators, useCreatorsInfinite } from "@/hooks/useCreators";
import { useLiveNow } from "@/hooks/useLiveNow";
import { useMeta } from "@/hooks/useMeta";
import { useFanPreferences } from "@/hooks/useFanPreferences";
import { creatorProfilePath, creatorLivePath } from "@/lib/creatorPaths";
import { Button } from "@/components/ui/button";
import { avatarUrl } from "@/lib/imageTransform";

const categories = ["Todos", "Fitness", "Arte", "Gastronomia", "Música", "Educação", "Lifestyle", "Moda", "Gaming"];

const Discover = () => {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [sortBy, setSortBy] = useState<"popular" | "preco" | "novo">("popular");
  const { data: prefCategories = [] } = useFanPreferences();

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useCreatorsInfinite({
    search: debouncedSearch,
    category: activeCategory,
    sort: sortBy,
    limit: 24,
  });

  const { data: trendingSource = [] } = useCreators();
  const { data: liveNow = [] } = useLiveNow();
  const liveCreatorIds = useMemo(() => new Set(liveNow.map((l) => l.creator_id)), [liveNow]);

  useMeta({
    title: "Descobrir Criadores",
    description:
      "Explore criadores exclusivos na Flare. Assine e acesse conteúdo privado, fotos, vídeos e lives com pagamento via Pix.",
  });

  const creators = useMemo(() => {
    const flat = data?.pages.flat() ?? [];
    if (!prefCategories.length) return flat;
    // Prefer preferred categories, then live creators, keep relative order otherwise
    return [...flat].sort((a, b) => {
      const aPref = prefCategories.includes(a.category ?? "") ? 1 : 0;
      const bPref = prefCategories.includes(b.category ?? "") ? 1 : 0;
      if (aPref !== bPref) return bPref - aPref;
      const aLive = liveCreatorIds.has(String(a.id)) ? 1 : 0;
      const bLive = liveCreatorIds.has(String(b.id)) ? 1 : 0;
      return bLive - aLive;
    });
  }, [data, prefCategories, liveCreatorIds]);

  const forYouCreators = useMemo(() => {
    if (!prefCategories.length) return [];
    return [...trendingSource]
      .filter((c) => prefCategories.includes(c.category ?? ""))
      .sort((a, b) => b.subscribers - a.subscribers)
      .slice(0, 8);
  }, [trendingSource, prefCategories]);

  const trendingCreators = useMemo(
    () => [...trendingSource].sort((a, b) => b.subscribers - a.subscribers).slice(0, 6),
    [trendingSource]
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="relative pt-16 pb-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/8 to-transparent pointer-events-none" />
        <div className="container pt-10">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-5 w-5 text-primary" />
            <p className="text-sm font-medium text-primary">Descobrir</p>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-foreground mb-2">
            Encontre seus criadores favoritos
          </h1>
          <p className="text-muted-foreground">
            Explore, filtre e assine criadores ativos na plataforma
          </p>
        </div>
      </div>

      <div className="container pb-24">
        <div className="flex flex-col gap-3 mb-6">
          <PendingCheckoutBanner />
          <RenewalBanner />
        </div>
        {!debouncedSearch && liveNow.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Radio className="h-4 w-4 text-red-400" />
              <h2 className="font-semibold text-foreground text-sm">Ao vivo agora</h2>
              <span className="text-xs text-muted-foreground">{liveNow.length}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {liveNow.map((live) => (
                <Link
                  key={live.id}
                  to={creatorLivePath(live.creator_id, live.id, live.creator?.handle)}
                  className="flex-shrink-0 w-40 rounded-2xl border border-red-500/30 bg-card hover:border-red-500/50 hover:scale-[1.03] transition-all overflow-hidden"
                >
                  <div className="relative h-24 bg-muted/30">
                    <img
                      src={avatarUrl(live.creator?.avatar_url ?? "/placeholder.svg", 160)}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute top-2 left-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                      Live
                    </span>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-foreground truncate">{live.creator?.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{live.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!debouncedSearch && forYouCreators.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-foreground text-sm">Para você</h2>
              <span className="text-xs text-muted-foreground">
                {prefCategories.slice(0, 3).join(" · ")}
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {forYouCreators.map((c) => (
                <Link
                  key={c.id}
                  to={creatorProfilePath(c.id, c.handle)}
                  className="flex-shrink-0 w-36 rounded-2xl border border-primary/20 bg-card hover:border-primary/40 hover:scale-[1.03] transition-all overflow-hidden"
                >
                  <div className="relative h-20">
                    <img
                      src={c.cover_url || "/placeholder.svg"}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    {liveCreatorIds.has(String(c.id)) && (
                      <span className="absolute top-2 left-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                        Live
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 -mt-5 relative">
                    <img
                      src={c.avatar_url || "/placeholder.svg"}
                      alt={c.name}
                      className="h-9 w-9 rounded-full border-2 border-primary/50 object-cover mb-1"
                      loading="lazy"
                      decoding="async"
                    />
                    <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {c.category}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!debouncedSearch && activeCategory === "Todos" && trendingCreators.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-foreground text-sm">Em alta agora</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {trendingCreators.map((c, i) => (
                <Link
                  key={c.id}
                  to={creatorProfilePath(c.id, c.handle)}
                  className="flex-shrink-0 w-36 rounded-2xl border border-border/50 bg-card hover:border-primary/40 hover:scale-[1.03] transition-all overflow-hidden"
                >
                  <div className="relative h-20">
                    <img
                      src={c.cover_url || "/placeholder.svg"}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    {i === 0 && (
                      <span className="absolute top-2 left-2 rounded-full bg-gradient-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-glow">
                        #1
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 -mt-5 relative">
                    <img
                      src={c.avatar_url || "/placeholder.svg"}
                      alt={c.name}
                      className="h-9 w-9 rounded-full border-2 border-primary/50 object-cover mb-1"
                      loading="lazy"
                      decoding="async"
                    />
                    <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                      <Heart className="h-2.5 w-2.5 text-primary" />
                      {c.subscribers.toLocaleString("pt-BR")} fãs
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar criadores..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border/60 bg-card pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-all"
            >
              <option value="popular">Mais populares</option>
              <option value="preco">Menor preço</option>
              <option value="novo">Mais recentes</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                activeCategory === cat
                  ? "bg-gradient-primary text-primary-foreground shadow-glow scale-105"
                  : "border border-border/60 bg-card text-muted-foreground hover:text-foreground hover:border-primary/40"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <CreatorCardSkeleton key={i} />
            ))}
          </div>
        ) : creators.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {creators.map((creator, i) => (
                <div
                  key={creator.id}
                  style={{ animationDelay: `${Math.min(i, 12) * 0.07}s` }}
                  className="animate-fade-up opacity-0 [animation-fill-mode:forwards]"
                >
                  <CreatorCard creator={creator} isLive={liveCreatorIds.has(String(creator.id))} />
                </div>
              ))}
            </div>
            {hasNextPage && (
              <div className="flex justify-center mt-10">
                <Button
                  variant="outline"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                  className="rounded-full"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    "Carregar mais"
                  )}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-display text-lg font-semibold text-foreground mb-1">
              Nenhum criador encontrado
            </p>
            <p className="text-sm text-muted-foreground">Tente ajustar a busca ou os filtros</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Discover;
