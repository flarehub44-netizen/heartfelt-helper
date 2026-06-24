import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { becomeCreator } from "@/lib/profile.functions";
import { Button } from "@/components/ui/button";
import { Crown, FileText, Layers, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/estudio")({
  component: StudioLayout,
});

function StudioLayout() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const become = useServerFn(becomeCreator);
  const path = useRouterState({ select: (s) => s.location.pathname });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["me-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("handle, display_name, avatar_url, is_creator, bio")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const onboard = useMutation({
    mutationFn: () => become({ data: {} }),
    onSuccess: () => {
      toast.success("Bem-vindo ao Estúdio!");
      qc.invalidateQueries();
    },
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  if (!profile?.is_creator) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-3xl border border-vip/40 p-10 text-center shadow-glow" style={{ background: "var(--gradient-surface)" }}>
          <Crown className="mx-auto h-12 w-12 text-vip" />
          <h1 className="mt-4 font-display text-4xl">Vire um criador</h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Configure suas camadas (Fã, Super Fã, VIP) e comece a publicar conteúdo exclusivo para sua audiência.
          </p>
          <Button
            onClick={() => onboard.mutate()}
            disabled={onboard.isPending}
            size="lg"
            className="mt-6 gradient-vip text-vip-foreground"
          >
            {onboard.isPending ? "Ativando..." : "Ativar modo criador"}
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { to: "/estudio", label: "Visão geral", icon: Users },
    { to: "/estudio/posts", label: "Posts", icon: FileText },
    { to: "/estudio/tiers", label: "Camadas", icon: Layers },
  ];

  return (
    <div>
      <header className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-primary">Estúdio</p>
            <h1 className="font-display text-3xl">Olá, {profile.display_name}</h1>
          </div>
          <Link to="/c/$handle" params={{ handle: profile.handle }} className="text-sm text-muted-foreground hover:text-foreground">
            Ver perfil público →
          </Link>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4">
          {tabs.map((t) => {
            const active = path === t.to;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm transition ${
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
