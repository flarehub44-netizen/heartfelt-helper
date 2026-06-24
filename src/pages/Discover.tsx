import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, SlidersHorizontal, Flame, TrendingUp, Heart } from "lucide-react";
import Navbar from "@/components/Navbar";
import CreatorCard from "@/components/CreatorCard";
import CreatorCardSkeleton from "@/components/CreatorCardSkeleton";
import { useCreators } from "@/hooks/useCreators";
import { useMeta } from "@/hooks/useMeta";

const categories = ["Todos", "Fitness", "Arte", "Gastronomia", "Música", "Educação", "Lifestyle", "Moda", "Gaming"];

const Discover = () => {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [sortBy, setSortBy] = useState<"popular" | "preco" | "novo">("popular");

  const { data: creators = [], isLoading } = useCreators();

  useMeta({
    title: "Descobrir Criadores",
    description: "Explore criadores exclusivos na Flare. Assine e acesse conteúdo privado, fotos, vídeos e lives com pagamento via Pix.",
  });

  const trendingCreators = [...creators]
    .sort((a, b) => b.subscribers - a.subscribers)
    .slice(0, 6);

  const filtered = creators
    .filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.handle ?? "").toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        activeCategory === "Todos" || c.category === activeCategory;
      return matchSearch && matchCategory;
    })
    .sort((a, b) => {
      if (sortBy === "popular") return b.subscribers - a.subscribers;
      if (sortBy === "preco") return a.price - b.price;
      if (sortBy === "novo") {
        const aDate = new Date((a as { created_at?: string }).created_at ?? 0).getTime();
        const bDate = new Date((b as { created_at?: string }).created_at ?? 0).getTime();
        return bDate - aDate;
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero strip */}
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
            {creators.length} criadores ativos na plataforma
          </p>
        </div>
      </div>

      <div className="container pb-24">
        {/* Trending strip — only visible when not actively filtering */}
        {!search && activeCategory === "Todos" && trendingCreators.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-foreground text-sm">Em alta agora</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {trendingCreators.map((c, i) => (
                <Link
                  key={c.id}
                  to={`/creator/${c.id}`}
                  className="flex-shrink-0 w-36 rounded-2xl border border-border/50 bg-card hover:border-primary/40 hover:scale-[1.03] transition-all overflow-hidden"
                >
                  <div className="relative h-20">
                    <img src={(c as any).cover_url || "/placeholder.svg"} alt="" className="h-full w-full object-cover"  loading="lazy" decoding="async" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    {i === 0 && (
                      <span className="absolute top-2 left-2 rounded-full bg-gradient-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-glow">
                        #1
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 -mt-5 relative">
                    <img
                      src={(c as any).avatar_url || "/placeholder.svg"}
                      alt={c.name}
                      className="h-9 w-9 rounded-full border-2 border-primary/50 object-cover mb-1"
                     loading="lazy" decoding="async" />
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

        {/* Search + Sort */}
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

        {/* Category pills */}
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

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <CreatorCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((creator, i) => (
              <div
                key={creator.id}
                style={{ animationDelay: `${i * 0.07}s` }}
                className="animate-fade-up opacity-0 [animation-fill-mode:forwards]"
              >
                <CreatorCard creator={creator} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-display text-lg font-semibold text-foreground mb-1">Nenhum criador encontrado</p>
            <p className="text-sm text-muted-foreground">Tente ajustar a busca ou os filtros</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Discover;
