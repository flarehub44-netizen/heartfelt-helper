import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getPostAuthPath } from "@/lib/authRedirect";
import { Flame, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const { signIn, user, profile, loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (loading || !user) return;
    if (!profile) return;
    const fanOnboarded =
      profile.fan_onboarded === true ||
      localStorage.getItem("fan_onboarded") === "true";
    navigate(
      getPostAuthPath(returnTo, profile.role, fanOnboarded, profile.approved),
      { replace: true }
    );
  }, [user, profile, loading, navigate, returnTo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      toast({
        title: "Erro ao entrar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast({
        title: "Informe seu e-mail",
        description: "Digite o e-mail da conta para receber o link de redefinição.",
        variant: "destructive",
      });
      return;
    }
    setResetSending(true);
    const redirectTo = `${window.location.origin}/login`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setResetSending(false);
    if (error) {
      toast({
        title: "Não foi possível enviar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "E-mail enviado",
      description: "Se existir uma conta com esse e-mail, você receberá o link para redefinir a senha.",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md px-6 py-12 flex flex-col items-center gap-8">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow animate-pulse-glow">
            <Flame className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold text-gradient">Flare</span>
        </Link>

        <div className="glass-card w-full rounded-2xl p-8 flex flex-col gap-6">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-foreground">Bem-vinda de volta</h1>
            <p className="text-sm text-muted-foreground mt-1">Entre na sua conta Flare</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-9 bg-muted/20 border-border/50 focus-visible:ring-primary/50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <button
                  type="button"
                  onClick={() => void handleForgotPassword()}
                  disabled={resetSending}
                  className="text-xs text-primary hover:underline disabled:opacity-50"
                >
                  {resetSending ? "Enviando..." : "Esqueceu a senha?"}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-9 pr-10 bg-muted/20 border-border/50 focus-visible:ring-primary/50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:scale-[1.02] transition-transform h-11"
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link
              to={returnTo ? `/signup?returnTo=${encodeURIComponent(returnTo)}` : "/signup"}
              className="text-primary hover:underline font-medium"
            >
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
