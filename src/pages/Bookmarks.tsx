import { Link, useNavigate } from "react-router-dom";
import { Bookmark, Compass, Loader2, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useBookmarkedPosts } from "@/hooks/useBookmarks";
import { useToggleBookmark } from "@/hooks/useBookmarks";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { SignedImage } from "@/components/SignedMedia";

const PLAN_BADGE: Record<string, string> = {
  fan: "💖 Fã",
  superfan: "🔥 Super Fã",
  vip: "💎 VIP",
};

const Bookmarks = () => {
  const navigate = useNavigate();
  const { data: posts = [], isLoading } = useBookmarkedPosts();
  const toggleBookmark = useToggleBookmark();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-2xl pt-24 pb-20">
        <div className="flex items-center gap-3 mb-8">
          <Bookmark className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold text-foreground">Conteúdo salvo</h1>
          {posts.length > 0 && (
            <span className="ml-auto text-sm text-muted-foreground">{posts.length} item{posts.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="glass-card rounded-2xl p-14 text-center flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/30">
              <Bookmark className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Nenhum conteúdo salvo</p>
              <p className="text-sm text-muted-foreground mt-1">
                Salve posts do seu feed para encontrá-los aqui depois.
              </p>
            </div>
            <Link
              to="/feed"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow hover:scale-105 transition-transform mt-1"
            >
              <Compass className="h-4 w-4" />
              Ir para o feed
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="glass-card rounded-2xl overflow-hidden flex gap-0 group cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => post.creator && navigate(`/creator/${post.creator.id}`)}
              >
                {/* Thumbnail */}
                <div className="w-24 h-24 flex-shrink-0 bg-muted/30 relative overflow-hidden">
                  {post.media_url && post.media_type === "image" ? (
                    <SignedImage src={post.media_url} alt="" className="h-full w-full object-cover" />
                  ) : post.media_url && post.media_type === "video" ? (
                    <div className="h-full w-full flex items-center justify-center bg-muted/50">
                      <span className="text-2xl">🎬</span>
                    </div>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <span className="text-2xl">📝</span>
                    </div>
                  )}
                  {post.min_plan !== "free" && (
                    <div className="absolute top-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm">
                      <Lock className="h-3 w-3 text-primary" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 p-4 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {post.creator?.avatar_url ? (
                        <img src={post.creator.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-muted flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{post.creator?.name ?? "Criador"}</p>
                        {post.creator?.handle && (
                          <p className="text-[10px] text-muted-foreground">@{post.creator.handle}</p>
                        )}
                      </div>
                    </div>
                    {post.min_plan !== "free" && (
                      <span className="text-[9px] font-semibold rounded-full bg-primary/10 text-primary px-2 py-0.5 flex-shrink-0">
                        {PLAN_BADGE[post.min_plan] ?? post.min_plan}
                      </span>
                    )}
                  </div>

                  {post.text && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{post.text}</p>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[10px] text-muted-foreground/60">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark.mutate({ postId: post.id, isBookmarked: true });
                      }}
                      className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/70 transition-colors"
                    >
                      <Bookmark className="h-3.5 w-3.5 fill-primary" />
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Bookmarks;
