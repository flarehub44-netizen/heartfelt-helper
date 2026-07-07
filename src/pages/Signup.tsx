import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getPostAuthPath } from "@/lib/authRedirect";
import { Flame, Eye, EyeOff, Mail, Lock, User, AtSign, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sendMetaEvent } from "@/lib/metaCapi";

type Role = "fan" | "creator";

const Signup = () => {
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const initialRole = searchParams.get("role") === "creator" ? "creator" : "fan";
  const [role, setRole] = useState<Role>(initialRole);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp, user, profile, loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user && profile) {
      const fanOnboarded = localStorage.getItem("fan_onboarded") === "true";
      navigate(getPostAuthPath(returnTo, profile.role, fanOnboarded, profile.approved), { replace: true });
    }
  }, [user, profile, loading, navigate, returnTo]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    handle: "",
    category: "",
  });

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirm) {
      toast({ title: "Senhas não coincidem", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "Senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const metadata: Record<string, string> = { name: form.name, role };
    if (role === "creator") {
      metadata.handle = form.handle;
      metadata.category = form.category;
    }

    const { error } = await signUp(form.email, form.password, metadata);
    setIsLoading(false);

    if (error) {
      toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
    } else {
      sendMetaEvent({ event_name: "CompleteRegistration", user_email: form.email });
      toast({ title: "Conta criada com sucesso!" });
      if (returnTo && role === "fan") {
        navigate(returnTo, { replace: true });
      } else {
        navigate(role === "creator" ? "/onboarding" : "/fan-onboarding");
      }
    }
  };

  const categories = ["Fitness", "Arte", "Gastronomia", "Música", "Educação", "Lifestyle", "Moda", "Gaming"];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden py-12">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md px-6 flex flex-col items-center gap-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow animate-pulse-glow">
            <Flame className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold text-gradient">Flare</span>
        </Link>

        <div className="glass-card w-full rounded-2xl p-8 flex flex-col gap-6">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-foreground">Criar conta</h1>
            <p className="text-sm text-muted-foreground mt-1">Junte-se à Flare hoje</p>
          </div>

          <div className="flex rounded-xl border border-border/50 bg-muted/20 p-1 gap-1">
            {(["fan", "creator"] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn(
                  "flex-1 rounded-lg py-2 text-sm font-semibold transition-all duration-200",
                  role === r
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r === "fan" ? "🙋 Sou Fã" : "⭐ Sou Criador(a)"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nome completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="name" placeholder="Seu nome" className="pl-9 bg-muted/20 border-border/50" value={form.name} onChange={set("name")} required />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="seu@email.com" className="pl-9 bg-muted/20 border-border/50" value={form.email} onChange={set("email")} required />
              </div>
            </div>

            {role === "creator" && (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="handle">Handle (@ perfil)</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="handle" placeholder="meuhandle" className="pl-9 bg-muted/20 border-border/50" value={form.handle} onChange={set("handle")} required />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="category">Categoria</Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <select
                      id="category"
                      className="flex h-10 w-full rounded-md border border-border/50 bg-muted/20 pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      value={form.category}
                      onChange={set("category")}
                      required
                    >
                      <option value="">Selecione uma categoria</option>
                      {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  className="pl-9 pr-10 bg-muted/20 border-border/50"
                  value={form.password}
                  onChange={set("password")}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm">Confirmar senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="confirm" type="password" placeholder="Repita a senha" className="pl-9 bg-muted/20 border-border/50" value={form.confirm} onChange={set("confirm")} required />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:scale-[1.02] transition-transform h-11 mt-2"
            >
              {isLoading ? "Criando conta..." : "Criar conta"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link
              to={returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login"}
              className="text-primary hover:underline font-medium"
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
