import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Crown, MessageCircle, Wallet, Share2, ShieldCheck } from "lucide-react";
import { Logo, PageContainer } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vibe — Monetize seu conteúdo com Pix" },
      {
        name: "description",
        content:
          "A plataforma brasileira para criadores: assinaturas em camadas, feed exclusivo, mensagens diretas, Pix e programa de afiliados.",
      },
      { property: "og:title", content: "Vibe — Monetize seu conteúdo com Pix" },
      {
        property: "og:description",
        content: "Conecte-se com seus fãs e ganhe dinheiro no Brasil. Pix, assinaturas e afiliados.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <PageContainer>
          <div className="flex h-16 items-center justify-between">
            <Logo />
            <nav className="hidden items-center gap-6 text-sm md:flex">
              <Link to="/explorar" className="text-muted-foreground hover:text-foreground">
                Explorar
              </Link>
              <a href="#como-funciona" className="text-muted-foreground hover:text-foreground">
                Como funciona
              </a>
              <a href="#criadores" className="text-muted-foreground hover:text-foreground">
                Para criadores
              </a>
            </nav>
            <div className="flex items-center gap-2">
              <Link to="/auth">
                <Button variant="ghost" size="sm">Entrar</Button>
              </Link>
              <Link to="/auth">
                <Button size="sm" className="gradient-primary text-primary-foreground shadow-glow">
                  Começar
                </Button>
              </Link>
            </div>
          </div>
        </PageContainer>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <PageContainer>
          <div className="grid items-center gap-12 py-16 md:grid-cols-2 md:py-28">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" />
                Feito no Brasil — pagamentos via Pix
              </div>
              <h1 className="mt-5 font-display text-5xl leading-[1.05] md:text-7xl">
                Transforme sua audiência em <span className="gradient-text italic">renda recorrente</span>.
              </h1>
              <p className="mt-5 max-w-lg text-lg text-muted-foreground">
                A Vibe conecta criadores e fãs por assinaturas em camadas, feed exclusivo, mensagens diretas e um programa de afiliados que paga 20%.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/auth">
                  <Button size="lg" className="gradient-primary text-primary-foreground shadow-glow">
                    Criar minha página
                  </Button>
                </Link>
                <Link to="/explorar">
                  <Button size="lg" variant="outline">
                    Ver criadores
                  </Button>
                </Link>
              </div>
              <p className="mt-5 text-xs text-muted-foreground">
                Sem mensalidade. Você fica com 80% do que recebe.
              </p>
            </div>

            <div className="relative">
              <div className="absolute -inset-10 -z-10 rounded-full blur-3xl opacity-50 gradient-primary" />
              <TierShowcase />
            </div>
          </div>
        </PageContainer>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="border-t border-border/40 py-20">
        <PageContainer>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Como funciona</p>
            <h2 className="mt-3 font-display text-4xl md:text-5xl">Três passos para começar</h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", t: "Crie seu perfil", d: "Personalize sua página, escolha foto de capa e configure suas camadas Fã, Super Fã e VIP." },
              { n: "02", t: "Publique conteúdo", d: "Poste fotos, textos e vídeos exclusivos. Defina qual camada desbloqueia cada post." },
              { n: "03", t: "Receba via Pix", d: "Assinaturas mensais via Pix. Sem cartão, sem fricção, sem complicação." },
            ].map((s) => (
              <div key={s.n} className="rounded-3xl border border-border bg-card p-7 shadow-card transition hover:border-primary/40">
                <span className="font-display text-5xl gradient-text">{s.n}</span>
                <h3 className="mt-4 text-xl font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* FEATURES */}
      <section id="criadores" className="py-20">
        <PageContainer>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { i: Crown, t: "Assinaturas em camadas", d: "Defina Fã, Super Fã e VIP com preços e benefícios próprios." },
              { i: MessageCircle, t: "Mensagens diretas", d: "Converse com seus fãs em tempo real, exclusivo por camada." },
              { i: Wallet, t: "Pix nativo", d: "Receba via QR Code instantâneo. Cobrança automática mensal." },
              { i: Share2, t: "Afiliados 20%", d: "Cada usuário tem link próprio e ganha em cada nova assinatura indicada." },
              { i: Sparkles, t: "Feed sob medida", d: "Os fãs veem apenas as assinaturas que possuem, organizado por novidade." },
              { i: ShieldCheck, t: "Conteúdo seguro", d: "Posts privados protegidos por nível de acesso, sem brechas públicas." },
            ].map((f) => (
              <div key={f.t} className="group rounded-2xl border border-border bg-surface/40 p-6 transition hover:bg-surface/80">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-primary shadow-glow">
                  <f.i className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* CTA */}
      <section className="py-24">
        <PageContainer>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-border p-12 text-center shadow-elevated"
            style={{ background: "var(--gradient-surface)" }}>
            <div className="absolute -top-32 left-1/2 -z-10 h-64 w-[120%] -translate-x-1/2 rounded-full blur-3xl opacity-60 gradient-primary" />
            <h2 className="font-display text-4xl md:text-6xl">Pronto para começar?</h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              Crie sua conta gratuitamente em menos de um minuto.
            </p>
            <Link to="/auth" className="mt-8 inline-block">
              <Button size="lg" className="gradient-primary text-primary-foreground shadow-glow">
                Criar minha conta
              </Button>
            </Link>
          </div>
        </PageContainer>
      </section>

      <footer className="border-t border-border/40 py-10">
        <PageContainer>
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
            <Logo />
            <p>© {new Date().getFullYear()} Vibe. Feito no Brasil.</p>
          </div>
        </PageContainer>
      </footer>
    </div>
  );
}

function TierShowcase() {
  const tiers = [
    { name: "Fã", price: "R$ 19,90", color: "bg-secondary", glow: "" },
    { name: "Super Fã", price: "R$ 39,90", color: "gradient-primary", glow: "shadow-glow" },
    { name: "VIP", price: "R$ 99,90", color: "gradient-vip", glow: "" },
  ];
  return (
    <div className="relative mx-auto w-full max-w-md space-y-3">
      {tiers.map((t, i) => (
        <div
          key={t.name}
          className={`glass flex items-center justify-between rounded-2xl p-5 ${t.glow}`}
          style={{ transform: `translateX(${i * 12}px)` }}
        >
          <div>
            <p className="text-xs text-muted-foreground">Camada</p>
            <p className="text-xl font-semibold">{t.name}</p>
          </div>
          <div className={`rounded-xl px-4 py-2 text-sm font-semibold ${t.color === "bg-secondary" ? "bg-secondary text-secondary-foreground" : t.color === "gradient-primary" ? "gradient-primary text-primary-foreground" : "gradient-vip text-vip-foreground"}`}>
            {t.price}<span className="opacity-70">/mês</span>
          </div>
        </div>
      ))}
    </div>
  );
}
