import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

const searchSchema = z.object({
  redirect: z.string().optional(),
  ref: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar — Vibe" },
      {
        name: "description",
        content: "Acesse sua conta Vibe para assinar criadores e desbloquear conteúdo exclusivo.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect, ref } = useSearch({ from: "/auth" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirect || "/feed", replace: true });
    });
  }, [navigate, redirect]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-60" style={{ background: "var(--gradient-hero)" }} />
      <header className="px-6 py-5">
        <Logo />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12">
        <div className="w-full glass rounded-3xl p-8 shadow-elevated">
          <h1 className="font-display text-4xl text-center">Bem-vindo</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Entre ou crie sua conta para começar
          </p>
          <Tabs defaultValue="signin" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="pt-4">
              <SignInForm onDone={() => navigate({ to: redirect || "/feed" })} />
            </TabsContent>
            <TabsContent value="signup" className="pt-4">
              <SignUpForm
                referralCode={ref}
                onDone={() => navigate({ to: redirect || "/feed" })}
              />
            </TabsContent>
          </Tabs>
        </div>
        <Link to="/" className="mt-6 text-sm text-muted-foreground hover:text-foreground">
          ← Voltar para o início
        </Link>
      </main>
    </div>
  );
}

function SignInForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Não conseguimos entrar", { description: error.message });
      return;
    }
    toast.success("Bem-vindo de volta!");
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground shadow-glow">
        {loading ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}

function SignUpForm({ onDone, referralCode }: { onDone: () => void; referralCode?: string }) {
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (handle.length < 3) {
      toast.error("Escolha um @ com pelo menos 3 caracteres");
      return;
    }
    setLoading(true);

    let referredBy: string | undefined;
    if (referralCode) {
      const { data } = await supabase
        .from("affiliate_links")
        .select("user_id")
        .eq("code", referralCode)
        .maybeSingle();
      referredBy = data?.user_id;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          handle: handle.toLowerCase().replace(/[^a-z0-9_]/g, ""),
          display_name: displayName,
          referred_by: referredBy ?? "",
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Erro ao cadastrar", { description: error.message });
      return;
    }
    toast.success("Conta criada!");
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3.5">
      <div className="space-y-1.5">
        <Label htmlFor="display">Nome de exibição</Label>
        <Input id="display" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Como você quer ser chamado" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="handle">@ usuário</Label>
        <Input id="handle" required value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="seu_handle" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email2">Email</Label>
        <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password2">Senha</Label>
        <Input id="password2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {referralCode && (
        <p className="text-xs text-muted-foreground">
          Indicado por código: <span className="font-mono text-foreground">{referralCode}</span>
        </p>
      )}
      <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground shadow-glow">
        {loading ? "Criando..." : "Criar conta"}
      </Button>
    </form>
  );
}
