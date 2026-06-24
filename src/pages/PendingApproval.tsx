import { useEffect } from "react";
import { Clock, Home, LogOut, Pencil, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function PendingApproval() {
  const { signOut, profile, refreshProfile } = useAuth();
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="h-10 w-10 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Cadastro em análise</h1>
          <p className="text-muted-foreground">
            Seu perfil de criador está aguardando aprovação da nossa equipe. Assim que for aprovado, você receberá acesso completo ao dashboard.
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-1">
          <p>O processo leva geralmente até 24 horas.</p>
          <p>Esta página atualiza automaticamente a cada 30 segundos.</p>
        </div>

        <div className="flex flex-col gap-3">
          <Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow hover:scale-[1.02] transition-all">
            <Link to="/onboarding">
              <Pencil className="h-4 w-4 mr-2" />
              Editar meu perfil enquanto aguardo
            </Link>
          </Button>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" asChild>
              <Link to="/">
                <Home className="h-4 w-4 mr-2" />
                Voltar ao início
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
