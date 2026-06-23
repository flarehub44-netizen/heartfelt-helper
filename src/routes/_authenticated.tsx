import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/brand";
import {
  LayoutDashboard,
  MessageCircle,
  Wallet,
  Settings,
  Compass,
  Sparkles,
  LogOut,
  CreditCard,
  Crown,
  Menu,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full gradient-primary" />
      </div>
    );
  }

  return <AppShell />;
}

function AppShell() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar md:flex md:flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl md:hidden">
        <Logo />
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 h-full w-72 border-r border-border bg-sidebar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <Logo />
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div onClick={() => setOpen(false)}>
              <SidebarContent hideLogo />
            </div>
          </aside>
        </div>
      )}

      <main className="flex-1 pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}

function SidebarContent({ hideLogo }: { hideLogo?: boolean } = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["me-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("handle, display_name, avatar_url, is_creator")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const path = useRouterState({ select: (s) => s.location.pathname });

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const links = [
    { to: "/feed", label: "Feed", icon: LayoutDashboard },
    { to: "/explorar", label: "Explorar", icon: Compass },
    { to: "/mensagens", label: "Mensagens", icon: MessageCircle },
    { to: "/assinaturas", label: "Assinaturas", icon: CreditCard },
    { to: "/carteira", label: "Carteira", icon: Wallet },
  ];

  return (
    <div className="flex h-full flex-col">
      {!hideLogo && (
        <div className="border-b border-border px-5 py-5">
          <Logo />
        </div>
      )}
      <nav className="flex-1 space-y-1 p-3">
        {links.map((l) => {
          const active = path === l.to || path.startsWith(l.to + "/");
          return (
            <Link
              key={l.to}
              to={l.to}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
              }`}
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </Link>
          );
        })}

        <div className="my-3 border-t border-border" />

        {profile?.is_creator ? (
          <Link
            to="/estudio"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              path.startsWith("/estudio")
                ? "bg-sidebar-accent text-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
            }`}
          >
            <Sparkles className="h-4 w-4 text-primary" />
            Estúdio
          </Link>
        ) : (
          <Link
            to="/estudio"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-sidebar-accent/50 hover:text-foreground"
          >
            <Crown className="h-4 w-4 text-vip" />
            Virar criador
          </Link>
        )}
        <Link
          to="/configuracoes"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
            path === "/configuracoes"
              ? "bg-sidebar-accent text-foreground"
              : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
          }`}
        >
          <Settings className="h-4 w-4" />
          Configurações
        </Link>
      </nav>

      <div className="border-t border-border p-3">
        {profile && (
          <div className="flex items-center gap-3 rounded-xl p-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-sm font-bold uppercase">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                profile.display_name?.[0] ?? "?"
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{profile.display_name}</p>
              <p className="truncate text-xs text-muted-foreground">@{profile.handle}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
