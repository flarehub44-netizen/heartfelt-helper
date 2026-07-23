import { useEffect } from "react";
import {
  Clock,
  Home,
  LogOut,
  Pencil,
  MessageCircle,
  CheckCircle2,
  Circle,
  FileText,
  DollarSign,
  Image,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function PendingApproval() {
  const { signOut, profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.approved) {
      navigate("/dashboard", { replace: true });
      return;
    }

    const interval = setInterval(() => {
      refreshProfile();
    }, 30000);

    return () => clearInterval(interval);
  }, [profile?.approved, refreshProfile, navigate]);

  const { data: checklist } = useQuery({
    queryKey: ["pending-checklist", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const [plans, posts] = await Promise.all([
        supabase
          .from("creator_plans")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", user.id),
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", user.id),
      ]);
      return {
        hasAvatar: !!profile?.avatar_url,
        hasBio: !!(profile?.bio && profile.bio.trim().length > 10),
        hasHandle: !!profile?.handle,
        plansCount: plans.count ?? 0,
        postsCount: posts.count ?? 0,
      };
    },
    enabled: !!user && !!profile,
  });

  const items = [
    {
      done: checklist?.hasHandle,
      label: "Definir @handle público",
      href: "/onboarding",
      icon: Pencil,
    },
    {
      done: checklist?.hasAvatar,
      label: "Adicionar foto de perfil",
      href: "/onboarding",
      icon: Image,
    },
    {
      done: checklist?.hasBio,
      label: "Escrever bio (mín. 10 caracteres)",
      href: "/onboarding",
      icon: FileText,
    },
    {
      done: (checklist?.plansCount ?? 0) > 0,
      label: "Configurar planos de assinatura",
      href: "/settings",
      icon: DollarSign,
    },
    {
      done: (checklist?.postsCount ?? 0) > 0,
      label: "Preparar o 1º post (bio e planos primeiro)",
      href: "/onboarding",
      icon: FileText,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="h-10 w-10 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Cadastro em análise</h1>
          <p className="text-muted-foreground">
            Seu perfil de criador está aguardando aprovação. Enquanto isso, complete o
            checklist para publicar mais rápido assim que for liberado.
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-1">
          <p>O processo leva geralmente até 24 horas.</p>
          <p>Esta página atualiza automaticamente a cada 30 segundos.</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card text-left p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Prepare-se enquanto aguarda
          </p>
          {items.map((item) => {
            const Icon = item.done ? CheckCircle2 : Circle;
            return (
              <Link
                key={item.label}
                to={item.href}
                className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/40 transition-colors"
              >
                <Icon
                  className={`h-5 w-5 flex-shrink-0 ${
                    item.done ? "text-emerald-500" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-sm flex-1 ${
                    item.done ? "text-muted-foreground line-through" : "text-foreground"
                  }`}
                >
                  {item.label}
                </span>
                <item.icon className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>

        <div className="flex flex-col gap-3">
          <Button
            asChild
            className="bg-gradient-primary text-primary-foreground shadow-glow hover:scale-[1.02] transition-all"
          >
            <Link to="/onboarding">
              <Pencil className="h-4 w-4 mr-2" />
              Completar perfil agora
            </Link>
          </Button>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" asChild>
              <Link to="/settings">
                <Home className="h-4 w-4 mr-2" />
                Configurações
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <a href="mailto:suporte@flare.com.br">
                <MessageCircle className="h-4 w-4 mr-2" />
                Falar com suporte
              </a>
            </Button>
            <Button variant="ghost" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
