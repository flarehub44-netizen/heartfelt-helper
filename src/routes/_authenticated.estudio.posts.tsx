import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { createPost } from "@/lib/creator.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { tierBadgeClass, tierLabel, relativeTimePtBR } from "@/lib/format";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/estudio/posts")({
  component: PostsPage,
});

function PostsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const create = useServerFn(createPost);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [minTier, setMinTier] = useState("0");

  const { data: posts = [] } = useQuery({
    queryKey: ["my-posts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, body, media_urls, min_tier_sort_order, published_at")
        .eq("creator_id", user!.id)
        .order("published_at", { ascending: false });
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          title,
          body,
          media_urls: mediaUrl ? [mediaUrl] : [],
          min_tier_sort_order: parseInt(minTier, 10),
        },
      }),
    onSuccess: () => {
      toast.success("Post publicado");
      setTitle("");
      setBody("");
      setMediaUrl("");
      qc.invalidateQueries({ queryKey: ["my-posts", user?.id] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  async function remove(id: string) {
    await supabase.from("posts").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-posts", user?.id] });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h2 className="font-display text-3xl">Novo post</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="mt-4 space-y-4 rounded-3xl border border-border bg-card p-6 shadow-card"
      >
        <div className="space-y-1.5">
          <Label htmlFor="t">Título</Label>
          <Input id="t" required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b">Conteúdo</Label>
          <Textarea id="b" rows={5} value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m">URL de imagem (opcional)</Label>
          <Input id="m" type="url" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div className="space-y-1.5">
          <Label>Camada mínima de acesso</Label>
          <Select value={minTier} onValueChange={setMinTier}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Fã (todos os assinantes)</SelectItem>
              <SelectItem value="1">Super Fã ou maior</SelectItem>
              <SelectItem value="2">Apenas VIP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={mutation.isPending || !title} className="gradient-primary text-primary-foreground shadow-glow">
          {mutation.isPending ? "Publicando..." : "Publicar"}
        </Button>
      </form>

      <h2 className="mt-10 font-display text-3xl">Seus posts</h2>
      <div className="mt-4 space-y-3">
        {posts.length === 0 && <p className="text-muted-foreground">Nenhum post ainda.</p>}
        {posts.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tierBadgeClass(p.min_tier_sort_order)}`}>
                    {tierLabel(p.min_tier_sort_order)}
                  </span>
                  <span className="text-xs text-muted-foreground">{relativeTimePtBR(p.published_at)}</span>
                </div>
                <h3 className="mt-2 font-semibold">{p.title}</h3>
                {p.body && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.body}</p>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
