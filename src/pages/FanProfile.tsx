import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users, Heart, ChevronLeft, UserCircle2,
  Pencil, Trash2, Video, MessageSquare, Globe, Flame, Diamond, Bookmark,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { SignedImage } from "@/components/SignedMedia";

interface FanProfileData {
  id: string;
  name: string;
  handle: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  created_at: string;
  role: string;
}

interface FollowedCreator {
  creator_id: string;
  profiles: {
    id: string;
    name: string;
    handle: string | null;
    avatar_url: string | null;
  } | null;
}

interface SubscribedCreator {
  creator_id: string;
  profiles: {
    id: string;
    name: string;
    handle: string | null;
    avatar_url: string | null;
  } | null;
}

interface Post {
  id: string;
  text: string | null;
  media_url: string | null;
  media_type: string | null;
  min_plan: string;
  created_at: string;
  likes_count: number;
}

const PLAN_LABELS: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  free: { label: "Todos", icon: <Globe className="h-3 w-3" />, className: "bg-muted text-muted-foreground" },
  fan: { label: "Fã", icon: <Heart className="h-3 w-3" />, className: "bg-primary/10 text-primary border border-primary/20" },
  superfan: { label: "Super Fã", icon: <Flame className="h-3 w-3" />, className: "bg-orange-500/10 text-orange-500 border border-orange-500/20" },
  vip: { label: "VIP", icon: <Diamond className="h-3 w-3" />, className: "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" },
};

const FanProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile: authProfile } = useAuth();
  const isOwn = user?.id === id;
  const queryClient = useQueryClient();

  // Edit modal state
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [editText, setEditText] = useState("");
  const [editPlan, setEditPlan] = useState("free");

  // Delete modal state
  const [deletePostId, setDeletePostId] = useState<string | null>(null);

  // ── Profile ──────────────────────────────────────────────────────────
  const { data: fan, isLoading: loadingFan } = useQuery({
    queryKey: ["fanProfile", id],
    queryFn: async (): Promise<FanProfileData | null> => {
      if (!id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("id, name, handle, avatar_url, cover_url, created_at, role")
        .eq("id", id)
        .single();
      return data;
    },
    enabled: !!id,
  });

  // ── Follows ───────────────────────────────────────────────────────────
  const { data: followed = [] } = useQuery({
    queryKey: ["fanFollows", id],
    queryFn: async (): Promise<FollowedCreator[]> => {
      if (!id) return [];
      const { data } = await supabase
        .from("follows")
        .select("creator_id, profiles:creator_id(id, name, handle, avatar_url)")
        .eq("fan_id", id);
      return (data as unknown as FollowedCreator[]) ?? [];
    },
    enabled: !!id,
  });

  // ── Subscriptions ─────────────────────────────────────────────────────
  const { data: subscribed = [] } = useQuery({
    queryKey: ["fanSubscriptions", id],
    queryFn: async (): Promise<SubscribedCreator[]> => {
      if (!id) return [];
      const { data } = await supabase
        .from("subscriptions")
        .select("creator_id, profiles:creator_id(id, name, handle, avatar_url)")
        .eq("fan_id", id)
        .eq("active", true);
      return (data as unknown as SubscribedCreator[]) ?? [];
    },
    enabled: !!id,
  });

  // ── My Posts (only when isOwn + creator) ─────────────────────────────
  const isCreatorOwner = isOwn && (authProfile?.role === "creator" || fan?.role === "creator");

  const { data: myPosts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ["myPosts", id],
    queryFn: async (): Promise<Post[]> => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("posts")
        .select("id, text, media_url, media_type, min_plan, created_at, likes_count")
        .eq("creator_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: isCreatorOwner,
  });

  // ── Edit mutation ─────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({ postId, text, min_plan }: { postId: string; text: string; min_plan: string }) => {
      const { error } = await supabase
        .from("posts")
        .update({ text, min_plan })
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myPosts", id] });
      setEditPost(null);
      toast({ title: "Post atualizado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar o post", variant: "destructive" });
    },
  });

  // ── Delete mutation ───────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myPosts", id] });
      setDeletePostId(null);
      toast({ title: "Post excluído com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir o post", variant: "destructive" });
    },
  });

  const openEdit = (post: Post) => {
    setEditPost(post);
    setEditText(post.text ?? "");
    setEditPlan(post.min_plan);
  };

  // ── Loading ───────────────────────────────────────────────────────────
  if (loadingFan) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-2xl pt-32 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!fan) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-2xl pt-32 pb-16 text-center">
          <h1 className="font-display text-4xl font-bold text-foreground mb-4">Perfil não encontrado</h1>
          <p className="text-muted-foreground mb-6">Este perfil não existe ou foi removido.</p>
          <Link to="/" className="rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-105 transition-transform">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  const memberSince = format(new Date(fan.created_at), "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Cover */}
      <div className="relative h-56 md:h-72 mt-16">
        {fan.cover_url ? (
          <img src={fan.cover_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/20 via-secondary/30 to-accent/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <Link
          to="/"
          className="absolute top-6 left-6 flex items-center gap-1.5 rounded-full bg-background/60 backdrop-blur-sm border border-border/50 px-3 py-2 text-sm font-medium text-foreground hover:bg-background/80 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Link>
      </div>

      <div className="container max-w-4xl">
        {/* Profile header */}
        <div className="relative -mt-16 mb-8 flex flex-col md:flex-row md:items-end gap-5 md:gap-7">
          <div className="h-28 w-28 rounded-2xl border-4 border-background overflow-hidden bg-muted ring-2 ring-primary/30 shadow-glow flex-shrink-0">
            {fan.avatar_url ? (
              <img src={fan.avatar_url} alt={fan.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-primary">
                <UserCircle2 className="h-12 w-12 text-primary-foreground/70" />
              </div>
            )}
          </div>

          <div className="flex-1 md:pb-2">
            <h1 className="font-display text-2xl md:text-3xl font-extrabold text-foreground leading-tight mb-1">
              {fan.name}
            </h1>
            <p className="text-muted-foreground text-sm">
              {fan.handle ? `@${fan.handle} · ` : ""}Membro desde {memberSince}
            </p>

            <div className="flex gap-6 mt-3">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">{followed.length}</span> seguindo
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Heart className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">{subscribed.length}</span> assinaturas
              </div>
            </div>
          </div>

          {isOwn && (
            <Link
              to="/settings"
              className="md:pb-2 text-sm font-medium text-muted-foreground border border-border/60 rounded-xl px-4 py-2 hover:text-foreground hover:border-primary/40 transition-colors"
            >
              Editar perfil
            </Link>
          )}
        </div>

        {/* Content grid */}
        <div className="grid md:grid-cols-2 gap-6 pb-8">
          {/* Followed creators */}
          <div className="glass-card rounded-2xl p-5">
            <h2 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Criadores que segue
              <span className="ml-auto text-xs font-normal text-muted-foreground">{followed.length}</span>
            </h2>
            {followed.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Ainda não segue nenhum criador</p>
            ) : (
              <div className="flex flex-col gap-3">
                {followed.map((f) => {
                  const creator = f.profiles;
                  if (!creator) return null;
                  return (
                    <Link
                      key={f.creator_id}
                      to={`/creator/${creator.id}`}
                      className="flex items-center gap-3 hover:bg-muted/40 rounded-xl p-2 -mx-2 transition-colors"
                    >
                      <img
                        src={creator.avatar_url ?? "/placeholder.svg"}
                        alt={creator.name}
                        className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/20 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{creator.name}</p>
                        {creator.handle && (
                          <p className="text-xs text-muted-foreground">@{creator.handle}</p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Subscribed creators */}
          <div className="glass-card rounded-2xl p-5">
            <h2 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              Assinando agora
              <span className="ml-auto text-xs font-normal text-muted-foreground">{subscribed.length}</span>
            </h2>
            {subscribed.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sem assinaturas ativas</p>
            ) : (
              <div className="flex flex-col gap-3">
                {subscribed.map((s) => {
                  const creator = s.profiles;
                  if (!creator) return null;
                  return (
                    <Link
                      key={s.creator_id}
                      to={`/creator/${creator.id}`}
                      className="flex items-center gap-3 hover:bg-muted/40 rounded-xl p-2 -mx-2 transition-colors"
                    >
                      <img
                        src={creator.avatar_url ?? "/placeholder.svg"}
                        alt={creator.name}
                        className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/20 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{creator.name}</p>
                        {creator.handle && (
                          <p className="text-xs text-muted-foreground">@{creator.handle}</p>
                        )}
                      </div>
                      <span className="ml-auto flex-shrink-0 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Ativo
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bookmarks shortcut — visible only to profile owner */}
        {isOwn && !isCreatorOwner && (
          <div className="mb-6">
            <Link
              to="/bookmarks"
              className="glass-card rounded-2xl p-5 flex items-center gap-4 hover:border-primary/40 transition-colors group"
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Bookmark className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">Conteúdo salvo</p>
                <p className="text-xs text-muted-foreground mt-0.5">Posts que você marcou no feed</p>
              </div>
              <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180 flex-shrink-0" />
            </Link>
          </div>
        )}

        {/* ── My Posts (creator only) ───────────────────────────────── */}
        {isCreatorOwner && (
          <div className="pb-16">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-foreground text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Meus Posts
                <span className="ml-1 text-sm font-normal text-muted-foreground">({myPosts.length})</span>
              </h2>
            </div>

            {loadingPosts ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : myPosts.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center">
                <p className="text-muted-foreground text-sm">Você ainda não publicou nenhum post.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {myPosts.map((post) => {
                  const plan = PLAN_LABELS[post.min_plan] ?? PLAN_LABELS.free;
                  return (
                    <div
                      key={post.id}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-muted border border-border/40 cursor-pointer"
                    >
                      {/* Thumbnail */}
                      {post.media_url && post.media_type === "image" ? (
                        <SignedImage
                          src={post.media_url}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : post.media_url && post.media_type === "video" ? (
                        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/60">
                          <Video className="h-10 w-10 text-muted-foreground/60" />
                        </div>
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/60 p-3">
                          <p className="text-xs text-muted-foreground line-clamp-5 text-center leading-relaxed">
                            {post.text}
                          </p>
                        </div>
                      )}

                      {/* Plan badge */}
                      <div className={`absolute top-2 left-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${plan.className}`}>
                        {plan.icon}
                        {plan.label}
                      </div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
                        <button
                          onClick={() => openEdit(post)}
                          className="flex flex-col items-center gap-1 text-foreground hover:text-primary transition-colors"
                        >
                          <div className="h-9 w-9 rounded-full bg-background/80 border border-border flex items-center justify-center hover:border-primary/50 transition-colors">
                            <Pencil className="h-4 w-4" />
                          </div>
                          <span className="text-[10px] font-medium">Editar</span>
                        </button>
                        <button
                          onClick={() => setDeletePostId(post.id)}
                          className="flex flex-col items-center gap-1 text-foreground hover:text-destructive transition-colors"
                        >
                          <div className="h-9 w-9 rounded-full bg-background/80 border border-border flex items-center justify-center hover:border-destructive/50 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </div>
                          <span className="text-[10px] font-medium">Excluir</span>
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

      {/* ── Edit Modal ────────────────────────────────────────────────── */}
      <Dialog open={!!editPost} onOpenChange={(open) => !open && setEditPost(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar post</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Legenda</label>
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Escreva uma legenda..."
                className="resize-none min-h-[100px]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
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
            <Button variant="outline" onClick={() => setEditPost(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => editPost && updateMutation.mutate({ postId: editPost.id, text: editText, min_plan: editPlan })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ───────────────────────────────────────── */}
      <AlertDialog open={!!deletePostId} onOpenChange={(open) => !open && setDeletePostId(null)}>
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletePostId && deleteMutation.mutate(deletePostId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FanProfile;
