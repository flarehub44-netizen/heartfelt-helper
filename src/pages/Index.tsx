import { Link } from "react-router-dom";
import { useState } from "react";
import {
  ArrowRight,
  Zap,
  TrendingUp,
  Lock,
  DollarSign,
  Shield,
  Heart,
  Video,
  Gift,
  MessageCircle,
  Users,
  CheckCircle2,
  Sparkles,
  Clock,
  BadgeCheck,
} from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import Navbar from "@/components/Navbar";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import { useMeta } from "@/hooks/useMeta";
import { Input } from "@/components/ui/input";

const Index = () => {
  const { data: platformStats } = usePlatformStats();
  const [fans, setFans] = useState(100);
  const [price, setPrice] = useState(29.9);

  useMeta({
    title: "Ganhe dinheiro como criadora — Flare",
    description:
      "A plataforma brasileira que paga na hora via Pix. Você fica com 80%, sem bloqueios arbitrários, com suporte em português. Cadastre-se grátis.",
  });

  const monthly = fans * price * 0.8;

  const stats = [
    { value: "80%", label: "Fica com você" },
    { value: "Pix", label: "Saque em minutos" },
    {
      value: platformStats
        ? `R$ ${platformStats.estimated_revenue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
        : "R$ 0",
      label: "Já pago a criadoras",
    },
    {
      value: platformStats ? platformStats.total_active_subs.toLocaleString("pt-BR") : "0",
      label: "Fãs assinando agora",
    },
  ];

  const features = [
    { icon: DollarSign, title: "Você define o preço", desc: "Assinatura mensal, PPV, gorjetas e DMs pagas — você decide quanto cobrar em cada um." },
    { icon: Zap, title: "Pix instantâneo", desc: "Sacou, caiu. Sem espera de 7 dias, sem conta internacional, sem burocracia." },
    { icon: Video, title: "Lives com presentes pagos", desc: "Faça live, receba moedas em tempo real e converta em Pix na hora." },
    { icon: Gift, title: "Conteúdo PPV desbloqueável", desc: "Poste fotos e vídeos com preço individual — o fã paga pra desbloquear." },
    { icon: MessageCircle, title: "DMs exclusivas pra VIPs", desc: "Só quem assina o plano VIP pode te mandar mensagem. Chega de spam." },
    { icon: TrendingUp, title: "Programa de afiliadas", desc: "Ganhe indicando outras criadoras — % vitalícia sobre o que elas faturarem." },
    { icon: Shield, title: "Mídia protegida", desc: "Bucket privado, URLs assinadas de 1h e marca d'água automática no upload com seu @ e ID do post." },
    { icon: BadgeCheck, title: "Suporte humano em PT-BR", desc: "Time brasileiro no WhatsApp. Sem chatbot gringo, sem espera de 3 dias." },
    { icon: Lock, title: "Sem bloqueios arbitrários", desc: "Regras claras. Sua conta não some do dia pra noite como acontece por aí." },
  ];

  const testimonials = [
    { name: "Ana R.", nicho: "Fitness", quote: "Fiz R$ 8.400 no primeiro mês. Saco pelo Pix no mesmo dia que o fã assina.", earnings: "R$ 8.400/mês" },
    { name: "Camila S.", nicho: "Lifestyle", quote: "Vim do OnlyFans e triplicou. O público brasileiro paga muito melhor aqui.", earnings: "R$ 22.000/mês" },
    { name: "Bia L.", nicho: "Moda", quote: "Adoro que as lives dão presente pago. Só ontem foram R$ 1.200 em uma hora.", earnings: "R$ 14.500/mês" },
  ];

  const faqs = [
    { q: "Quanto a Flare cobra?", a: "20% de comissão. Você fica com 80% de tudo — assinatura, PPV, gorjeta e presentes de live. Sem taxa escondida." },
    { q: "Quanto tempo pra sacar?", a: "Sacou, caiu. Pix instantâneo 24h, inclusive fim de semana e feriado." },
    { q: "Preciso mostrar rosto?", a: "Não. Você decide o quanto quer aparecer. Muitas criadoras faturam alto sem mostrar o rosto." },
    { q: "Meu conteúdo fica seguro?", a: "Sim. URLs assinadas por 1h, marca d'água automática com CPF do fã e RLS no banco. Vazou, a gente identifica quem." },
    { q: "Posso trazer meus fãs de outra plataforma?", a: "Pode. Muitas criadoras migram do OnlyFans/Privacy usando link direto — a gente ajuda no processo." },
    { q: "Quanto tempo pra aprovar minha conta?", a: "Até 24h úteis. Depois disso é só publicar e começar a receber." },
  ];

  const niches = ["Fitness", "Moda", "Lifestyle", "Arte", "Gaming", "Gastronomia", "Música", "Educação"];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="h-full w-full object-cover opacity-40" fetchPriority="high" decoding="async" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
        </div>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

        <div className="relative container text-center max-w-4xl animate-fade-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Feita por brasileiras, pra criadoras brasileiras
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-extrabold leading-tight tracking-tight text-foreground mb-6">
            Ganhe até <span className="text-gradient">R$ 20 mil/mês</span> com seus fãs mais fiéis
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Você fica com <span className="font-bold text-foreground">80%</span>. Recebe por <span className="font-bold text-foreground">Pix na hora</span>.
            Sem bloqueio de conta, sem intermediário gringo, com suporte em português.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              to="/signup?role=creator"
              className="flex items-center gap-2 rounded-full bg-gradient-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-glow transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_30px_hsl(340_80%_58%_/_0.5)]"
            >
              Começar a ganhar agora
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/discover"
              className="flex items-center gap-2 rounded-full border border-border/60 bg-card/50 backdrop-blur-sm px-8 py-4 text-base font-semibold text-foreground transition-all duration-300 hover:border-primary/40 hover:bg-card/80"
            >
              Ver criadoras
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {stats.map((s) => (
              <div key={s.label} className="glass-card rounded-2xl p-4">
                <p className="font-display text-2xl font-bold text-gradient">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Simulador de ganhos */}
      <section className="py-24 container">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-medium text-primary mb-2">Simulador</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Quanto você pode ganhar por mês?
            </h2>
            <p className="text-muted-foreground mt-3">Ajuste os valores e veja sua receita estimada.</p>
          </div>

          <div className="glass-card rounded-3xl p-8 md:p-10">
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Fãs assinantes</label>
                <Input
                  type="number"
                  min={1}
                  value={fans}
                  onChange={(e) => setFans(Math.max(1, Number(e.target.value) || 0))}
                  className="bg-muted/20 border-border/50 h-12 text-lg"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Valor da assinatura (R$)</label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={price}
                  onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))}
                  className="bg-muted/20 border-border/50 h-12 text-lg"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-primary p-px shadow-glow">
              <div className="rounded-2xl bg-background/80 backdrop-blur-sm p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Sua receita líquida mensal (após 20%)</p>
                <p className="font-display text-4xl md:text-5xl font-extrabold text-gradient">
                  R$ {monthly.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  + ganhos extras com PPV, gorjetas e lives com presentes
                </p>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                to="/signup?role=creator"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow hover:scale-105 transition-transform"
              >
                Quero começar <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Comparativo Flare vs. concorrentes */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-primary mb-2">Por que trocar</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Flare vs. outras plataformas
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl border-2 border-primary/40 bg-gradient-card p-6 shadow-glow">
              <h3 className="font-display text-xl font-bold text-gradient mb-4">Flare 🇧🇷</h3>
              <ul className="space-y-3 text-sm">
                {[
                  "Você fica com 80%",
                  "Pix instantâneo, 24/7",
                  "Suporte em português",
                  "Sem conta internacional",
                  "Regras claras, sem banimento",
                  "Marca d'água automática no upload",
                ].map((i) => (
                  <li key={i} className="flex items-start gap-2 text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card/30 p-6">
              <h3 className="font-display text-xl font-bold text-muted-foreground mb-4">OnlyFans</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>Fica com 80%</li>
                <li>Saque em 7-14 dias</li>
                <li>Suporte em inglês</li>
                <li>Precisa Payoneer/Wise</li>
                <li>Banimentos frequentes</li>
                <li>Sem proteção nativa</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card/30 p-6">
              <h3 className="font-display text-xl font-bold text-muted-foreground mb-4">Privacy</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>Fica com 65-75%</li>
                <li>Saque em 3-5 dias</li>
                <li>Poucos recursos ao vivo</li>
                <li>Sem PPV avançado</li>
                <li>Sem programa afiliadas</li>
                <li>Marca d'água limitada</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-24 container">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-primary mb-2">Prova social</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Criadoras que já faturam com a gente
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-2xl border border-border/50 bg-gradient-card p-6 shadow-card">
              <Heart className="h-5 w-5 text-primary mb-3" />
              <p className="text-foreground leading-relaxed mb-6">"{t.quote}"</p>
              <div className="flex items-center justify-between pt-4 border-t border-border/40">
                <div>
                  <p className="font-semibold text-foreground text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.nicho}</p>
                </div>
                <span className="rounded-full bg-primary/15 text-primary text-xs font-bold px-3 py-1">
                  {t.earnings}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Nichos */}
      <section className="py-16 container">
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Criadoras de todos os nichos ganham na Flare
          </h2>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {niches.map((n) => (
            <span key={n} className="rounded-full border border-primary/30 bg-primary/10 text-primary px-5 py-2 text-sm font-semibold">
              {n}
            </span>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
        <div className="container">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-primary mb-2">Rápido</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Do cadastro ao primeiro Pix em 24h
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative max-w-5xl mx-auto">
            <div className="hidden md:block absolute top-8 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            {[
              { step: "01", title: "Cadastro em 2 min", desc: "Nome, e-mail, @ e categoria. Só isso." },
              { step: "02", title: "Aprovação em até 24h", desc: "Nosso time revisa e libera seu perfil." },
              { step: "03", title: "1º Pix pode cair hoje", desc: "Publique, receba assinatura, saque na hora." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="relative text-center group">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow group-hover:scale-110 transition-transform duration-300">
                  <Clock className="h-6 w-6 text-primary-foreground" />
                </div>
                <p className="text-xs font-bold text-primary mb-1">PASSO {step}</p>
                <h3 className="font-display text-xl font-bold text-foreground mb-3">{title}</h3>
                <p className="text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section className="py-24 container">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-primary mb-2">Ferramentas de monetização</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Tudo que você precisa pra faturar alto
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group rounded-2xl border border-border/50 bg-gradient-card p-6 shadow-card hover-glow transition-all duration-300">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 container max-w-3xl">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-primary mb-2">Dúvidas frequentes</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Tudo que você precisa saber
          </h2>
        </div>
        <div className="space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-border/50 bg-card/40 p-5 open:bg-card/60 transition-colors">
              <summary className="flex items-center justify-between cursor-pointer font-semibold text-foreground list-none">
                {f.q}
                <ArrowRight className="h-4 w-4 text-primary transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Selos de confiança */}
      <section className="py-12 container">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-2"><Shield className="h-4 w-4" /> LGPD compliant</span>
          <span className="flex items-center gap-2"><BadgeCheck className="h-4 w-4" /> +18 verificado</span>
          <span className="flex items-center gap-2"><Lock className="h-4 w-4" /> Pagamentos criptografados</span>
          <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Suporte humano PT-BR</span>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-24 container">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-px shadow-glow">
          <div className="relative rounded-3xl bg-gradient-to-br from-background/90 to-background/70 backdrop-blur-sm p-12 md:p-16 text-center">
            <h2 className="font-display text-3xl md:text-5xl font-extrabold text-foreground mb-4">
              Seu primeiro Pix pode cair hoje
            </h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto mb-8">
              Cadastro grátis. Sem contrato. Sem mensalidade. Só ganho quando você ganha.
            </p>
            <Link
              to="/signup?role=creator"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-glow transition-all duration-300 hover:scale-105"
            >
              Criar minha conta grátis <ArrowRight className="h-4 w-4" />
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
          <p className="text-sm text-muted-foreground">© 2026 Flare. Todos os direitos reservados.</p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground transition-colors">Termos</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacidade</Link>
            <a href="mailto:suporte@flare.app" className="hover:text-foreground transition-colors">Suporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
