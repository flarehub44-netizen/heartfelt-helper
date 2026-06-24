import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Lock, ChevronLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { SignedImage } from "@/components/SignedMedia";
import { PLAN_LABELS } from "@/lib/plans";

interface PostDetail {
  id: string;
  text: string | null;
  media_url: string | null;
  media_type: string | null;
  min_plan: string;
  likes_count: number;
  created_at: string;
  creator_id: string;
  creator: {
    id: string;
    name: string;
    handle: string | null;
    avatar_url: string | null;
    category: string | null;
  } | null;
}

const SITE = typeof window !== "undefined" ? window.location.origin : "";

const PostDetailPage = () => {
  const { id } = useParams<{ id: string }>();

  const { data: post, isLoading } = useQuery({
    queryKey: ["post-detail", id],
    enabled: !!id,
    queryFn: async (): Promise<PostDetail | null> => {
      const { data, error } = await supabase
        .from("posts")
        .select(
          "id, text, media_url, media_type, min_plan, likes_count, created_at, creator_id, creator:profiles!posts_creator_id_fkey(id, name, handle, avatar_url, category)"
        )
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as PostDetail | null;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Carregando…</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground font-semibold mb-2">Post não encontrado</p>
          <Link to="/" className="text-primary text-sm">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  const locked = post.min_plan !== "free";
  const title = post.creator
    ? `${post.creator.name}${post.text ? ` — ${post.text.slice(0, 60)}` : ""}`
    : "Post";
  const description =
    post.text?.slice(0, 155) ||
    (locked
      ? `Conteúdo exclusivo para ${PLAN_LABELS[post.min_plan] ?? "assinantes"} de ${post.creator?.name}.`
      : `Confira este post de ${post.creator?.name}.`);
  const url = `${SITE}/p/${post.id}`;
  const creatorUrl = post.creator?.handle ? `/u/${post.creator.handle}` : `/creator/${post.creator_id}`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Helmet>

      <Navbar />

      <div className="container max-w-2xl pt-24 pb-24">
        <Link to={creatorUrl} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="h-4 w-4" /> Voltar ao criador
        </Link>

        <article className="glass-card rounded-2xl overflow-hidden">
          {/* Header */}
          <Link to={creatorUrl} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
            {post.creator?.avatar_url ? (
              <img src={post.creator.avatar_url} alt={post.creator.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{post.creator?.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                @{post.creator?.handle ?? "—"} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </Link>

          {post.text && <p className="px-4 pb-3 text-sm text-foreground">{post.text}</p>}

          {post.media_url && (
            <div className="relative">
              {post.media_type === "video" && !locked ? (
                <video src={post.media_url} controls className="w-full" />
              ) : (
                <SignedImage
                  src={post.media_url}
                  alt={post.text ?? ""}
                  transform={{ width: 1000, quality: 80, resize: "cover" }}
                  className={`w-full aspect-[4/3] object-cover ${locked ? "blur-xl scale-105" : ""}`}
                />
              )}
              {locked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-sm">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
                    <Lock className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    Exclusivo para {PLAN_LABELS[post.min_plan] ?? "assinantes"}
                  </p>
                  <Link
                    to={`/creator/${post.creator_id}?openSubscribe=1&plan=${post.min_plan}`}
                    className="rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow hover:scale-105 transition-transform"
                  >
                    Desbloquear conteúdo
                  </Link>
                </div>
              )}
            </div>
          )}

          <div className="p-4 text-xs text-muted-foreground">
            ❤️ {post.likes_count} curtidas
          </div>
        </article>
      </div>
    </div>
  );
};

export default PostDetailPage;
