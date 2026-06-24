import { Link } from "react-router-dom";
import { ArrowRight, Shield, Zap, TrendingUp, Users, Lock, Star } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import CreatorCard from "@/components/CreatorCard";
import Navbar from "@/components/Navbar";
import { useFeaturedCreators } from "@/hooks/useFeaturedCreators";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import { useMeta } from "@/hooks/useMeta";

const features = [
  {
    icon: Lock,
    title: "Conteúdo exclusivo",
    desc: "Compartilhe fotos, vídeos e posts privativos apenas para quem é fã de verdade.",
  },
  {
    icon: Zap,
    title: "Pagamentos instantâneos",
    desc: "Receba na hora por assinaturas, gorjetas e conteúdo pago individual.",
  },
  {
    icon: Shield,
    title: "Segurança total",
    desc: "Criptografia ponta a ponta e proteção contra cópias não autorizadas.",
  },
  {
    icon: TrendingUp,
    title: "Analytics avançado",
    desc: "Acompanhe seu crescimento, engajamento e receita em tempo real.",
  },
  {
    icon: Users,
    title: "Comunidade ativa",
    desc: "Conecte-se com milhões de fãs e outros criadores de conteúdo.",
  },
  {
    icon: Star,
    title: "Perfil verificado",
    desc: "Destaque-se com o badge de criador verificado e alcance mais fãs.",
  },
];

const Index = () => {
  const { data: featured = [] } = useFeaturedCreators();
  const { data: platformStats } = usePlatformStats();

  useMeta({
    title: "Monetize seu conteúdo exclusivo",
    description: "A plataforma brasileira que conecta criadores com seus fãs. Assinaturas, conteúdo exclusivo e pagamentos instantâneos via Pix.",
  });

  const stats = [
    { value: String(platformStats?.total_creators ?? 0), label: "Criadores ativos" },
    {
      value: platformStats
        ? `R$ ${platformStats.estimated_revenue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
        : "R$ 0",
      label: "Receita na plataforma",
    },
    { value: String(platformStats?.total_active_subs ?? 0), label: "Assinaturas ativas" },
    { value: String(platformStats?.total_fans ?? 0), label: "Fãs cadastrados" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
        {/* Background image */}
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="h-full w-full object-cover opacity-40" fetchPriority="high" decoding="async" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
        </div>

        {/* Glow orbs */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

        <div className="relative container text-center max-w-4xl animate-fade-up">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-sm">
            <Zap className="h-3.5 w-3.5" />
            A nova era da criação de conteúdo
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-extrabold leading-tight tracking-tight text-foreground mb-6">
            Monetize seu{" "}
            <span className="text-gradient">conteúdo</span>{" "}
            exclusivo
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            A plataforma que conecta criadores de conteúdo com seus fãs mais apaixonados. Assinaturas, conteúdo exclusivo e pagamentos diretos — tudo em um só lugar.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              to="/discover"
              className="flex items-center gap-2 rounded-full bg-gradient-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-glow transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_30px_hsl(340_80%_58%_/_0.5)]"
            >
              Descobrir criadores
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/signup?role=creator"
              className="flex items-center gap-2 rounded-full border border-border/60 bg-card/50 backdrop-blur-sm px-8 py-4 text-base font-semibold text-foreground transition-all duration-300 hover:border-primary/40 hover:bg-card/80"
            >
              Seja um criador
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {stats.map((s) => (
              <div key={s.label} className="glass-card rounded-2xl p-4">
                <p className="font-display text-2xl font-bold text-gradient">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-float">
          <div className="h-10 w-6 rounded-full border border-border/50 flex items-center justify-center">
            <div className="h-2 w-1.5 rounded-full bg-primary animate-bounce" />
          </div>
        </div>
      </section>

      {/* Featured Creators — Top da semana com ranking + prova social viva */}
      {featured.length > 0 && <section className="py-24 container">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-sm font-medium text-primary mb-2 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Top da semana — atualizado agora
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Criadores em alta
            </h2>
            {platformStats && platformStats.total_fans > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                <span className="font-semibold text-foreground">{platformStats.total_active_subs.toLocaleString("pt-BR")}</span> fãs já assinam criadores na plataforma
              </p>
            )}
          </div>
          <Link
            to="/discover"
            className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Ver todos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featured.map((creator, i) => (
            <div
              key={creator.id}
              style={{ animationDelay: `${i * 0.1}s` }}
              className="relative animate-fade-up opacity-0 [animation-fill-mode:forwards]"
            >
              {i < 3 && (
                <div className="absolute -top-2 -left-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary shadow-glow ring-2 ring-background">
                  <span className="font-display text-sm font-extrabold text-primary-foreground">
                    {i + 1}º
                  </span>
                </div>
              )}
              <CreatorCard creator={creator} />
            </div>
          ))}
        </div>

        <div className="mt-8 flex md:hidden justify-center">
          <Link
            to="/discover"
            className="flex items-center gap-2 rounded-full border border-border/60 px-6 py-2.5 text-sm font-medium text-foreground hover:border-primary/40 transition-colors"
          >
            Ver todos os criadores <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>}


      {/* How it works */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
        <div className="container">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-primary mb-2">Simples assim</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Como funciona
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Em minutos você já está monetizando seu conteúdo ou apoiando seus criadores favoritos.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-8 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

            {[
              { step: "01", title: "Crie sua conta", desc: "Cadastre-se em segundos com email ou redes sociais." },
              { step: "02", title: "Configure seu perfil", desc: "Defina seus planos de assinatura, preços e conteúdo exclusivo." },
              { step: "03", title: "Comece a faturar", desc: "Publique conteúdo e receba pagamentos diretamente na sua conta." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="relative text-center group">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow group-hover:scale-110 transition-transform duration-300">
                  <span className="font-display text-xl font-bold text-primary-foreground">{step}</span>
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-3">{title}</h3>
                <p className="text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 container">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-primary mb-2">Recursos</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Tudo que você precisa
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group rounded-2xl border border-border/50 bg-gradient-card p-6 shadow-card hover-glow transition-all duration-300"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24 container">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-px shadow-glow">
          <div className="relative rounded-3xl bg-gradient-to-br from-background/90 to-background/70 backdrop-blur-sm p-12 md:p-16 text-center">
            <div className="absolute inset-0 rounded-3xl opacity-10"
              style={{ background: "var(--gradient-primary)" }} />
            <h2 className="font-display text-3xl md:text-5xl font-extrabold text-foreground mb-4 relative">
              Pronto para começar?
            </h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto mb-8 relative">
              Junte-se a milhares de criadores que já estão monetizando seu conteúdo na Flare.
            </p>
            <Link
              to="/discover"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-glow transition-all duration-300 hover:scale-105 relative"
            >
              Começar gratuitamente <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary">
              <span className="text-xs font-bold text-primary-foreground">F</span>
            </div>
            <span className="font-display font-bold text-gradient">Flare</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 Flare. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Termos</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
            <a href="#" className="hover:text-foreground transition-colors">Suporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
