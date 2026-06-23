import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Logo, PageContainer } from "@/components/brand";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/explorar")({
  head: () => ({
    meta: [
      { title: "Explorar criadores — Vibe" },
      {
        name: "description",
        content: "Descubra criadores brasileiros na Vibe e assine suas camadas exclusivas.",
      },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  const [q, setQ] = useState("");
  const { data: creators = [], isLoading } = useQuery({
    queryKey: ["creators-explore"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, handle, display_name, bio, avatar_url, cover_url")
        .eq("is_creator", true)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = creators.filter(
    (c) =>
      !q ||
      c.handle.toLowerCase().includes(q.toLowerCase()) ||
      c.display_name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <PageContainer>
          <div className="flex h-16 items-center justify-between">
            <Logo />
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
              Entrar
            </Link>
          </div>
        </PageContainer>
      </header>
      <PageContainer>
        <div className="py-10">
          <h1 className="font-display text-5xl">Explorar criadores</h1>
          <p className="mt-2 text-muted-foreground">
            Descubra novos criadores brasileiros e assine suas camadas exclusivas.
          </p>
          <Input
            placeholder="Buscar por nome ou @"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mt-6 max-w-md"
          />
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-16 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-primary" />
            <p className="mt-4 font-display text-2xl">Nenhum criador ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Seja um dos primeiros! Crie sua conta e ative o modo criador.
            </p>
            <Link to="/auth" className="mt-6 inline-block rounded-full gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
              Criar conta
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 pb-16 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Link
                key={c.id}
                to="/c/$handle"
                params={{ handle: c.handle }}
                className="group overflow-hidden rounded-3xl border border-border bg-card shadow-card transition hover:border-primary/40 hover:shadow-elevated"
              >
                <div
                  className="h-28 w-full"
                  style={{
                    background: c.cover_url
                      ? `url(${c.cover_url}) center/cover`
                      : "var(--gradient-primary)",
                  }}
                />
                <div className="px-5 pb-5">
                  <div className="-mt-8 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-card bg-surface text-2xl font-bold uppercase">
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt={c.display_name} className="h-full w-full rounded-xl object-cover" />
                    ) : (
                      c.display_name[0]
                    )}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{c.display_name}</h3>
                  <p className="text-sm text-muted-foreground">@{c.handle}</p>
                  {c.bio && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.bio}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
