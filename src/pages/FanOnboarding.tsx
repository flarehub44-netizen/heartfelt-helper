import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Flame, ChevronRight, Coins, Sparkles, Check } from "lucide-react";
import { useCreators } from "@/hooks/useCreators";
import { useFollow } from "@/hooks/useFollow";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const categories = ["Fitness", "Arte", "Gastronomia", "Música", "Educação", "Lifestyle", "Moda", "Gaming"];

function FollowableCreator({ creator }: { creator: { id: string | number; name: string; avatar_url?: string | null; avatar?: string; category?: string | null } }) {
  const { isFollowing, toggle, isPending } = useFollow(String(creator.id));
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card hover:border-primary/30 transition-colors">
      <img
        src={creator.avatar_url || (creator as any).avatar || "/placeholder.svg"}
        alt={creator.name}
        className="h-12 w-12 rounded-full object-cover flex-shrink-0"
       loading="lazy" decoding="async" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">{creator.name}</p>
        <p className="text-xs text-muted-foreground">{creator.category}</p>
      </div>
      <button
        onClick={toggle}
        disabled={isPending}
        className={`text-xs font-semibold px-4 py-2 rounded-full transition-all ${
          isFollowing
            ? "bg-muted text-muted-foreground"
            : "bg-gradient-primary text-primary-foreground shadow-glow hover:scale-105"
        }`}
      >
        {isFollowing ? "Seguindo ✓" : "Seguir"}
      </button>
    </div>
  );
}

const FanOnboarding = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState<number | null>(null);
  const { data: creators, isLoading } = useCreators();

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const suggestedCreators = (creators ?? []).filter(
    (c) => selectedCategories.length === 0 || selectedCategories.includes(c.category ?? "")
  ).slice(0, 5);

  const markOnboarded = async () => {
    if (!user) return;
    localStorage.setItem("fan_onboarded", "true");
    await supabase.from("profiles").update({ fan_onboarded: true } as never).eq("id", user.id);
    await refreshProfile();
  };

  const savePreferences = async () => {
    if (!user) return;
    await supabase.from("fan_preferences").upsert({
      user_id: user.id,
      categories: selectedCategories,
      updated_at: new Date().toISOString(),
    });
  };

  const goToStep1 = async () => {
    await savePreferences();
    setStep(1);
  };

  const claimBonusAndFinish = async () => {
    if (!user) {
      navigate("/feed");
      return;
    }
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc("claim_welcome_bonus");
      if (error) throw error;
      const amount = (data as number) ?? 0;
      setClaimedAmount(amount);
      if (amount > 0) {
        toast.success(`+${amount} moedas creditadas na sua carteira!`);
      }
      await markOnboarded();
      setTimeout(() => navigate("/feed"), 900);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível resgatar o bônus. Tente novamente.");
      setClaiming(false);
    }
  };

  const skipAll = async () => {
    await savePreferences();
    await markOnboarded();
    navigate("/feed");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden py-12">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-lg px-6 flex flex-col items-center gap-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Flame className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold text-gradient">Flare</span>
        </Link>

        <div className="glass-card w-full rounded-2xl p-8 flex flex-col gap-6">
          {/* Progress */}
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-gradient-primary" : "bg-muted"}`} />
            ))}
          </div>

          {step === 0 && (
            <>
              <div className="text-center">
                <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">Passo 1 de 3</p>
                <h1 className="font-display text-xl font-bold text-foreground">O que te interessa?</h1>
                <p className="text-sm text-muted-foreground mt-1">Escolha categorias para personalizar seu feed</p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                      selectedCategories.includes(cat)
                        ? "bg-gradient-primary text-primary-foreground shadow-glow scale-105"
                        : "border border-border/60 bg-card text-muted-foreground hover:text-foreground hover:border-primary/40"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1 text-muted-foreground" onClick={skipAll}>
                  Pular tudo
                </Button>
                <Button
                  className="flex-1 bg-gradient-primary text-primary-foreground shadow-glow hover:scale-[1.02] transition-transform"
                  onClick={goToStep1}
                >
                  Continuar <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="text-center">
                <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">Passo 2 de 3</p>
                <h1 className="font-display text-xl font-bold text-foreground">Siga 1 criador para começar</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Cada criador define seus próprios planos. Você assina quando quiser, direto no perfil dele.
                </p>
              </div>

              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-8 w-20 rounded-full" />
                    </div>
                  ))
                ) : suggestedCreators.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhum criador encontrado para essas categorias.
                  </p>
                ) : (
                  suggestedCreators.map((c) => <FollowableCreator key={c.id} creator={c} />)
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1 text-muted-foreground" onClick={() => setStep(2)}>
                  Pular
                </Button>
                <Button
                  className="flex-1 bg-gradient-primary text-primary-foreground shadow-glow hover:scale-[1.02] transition-transform"
                  onClick={() => setStep(2)}
                >
                  Continuar <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-center flex flex-col items-center gap-3">
                <p className="text-xs text-primary font-semibold uppercase tracking-wider">Passo 3 de 3</p>
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
                    {claimedAmount !== null ? (
                      <Check className="h-9 w-9 text-primary-foreground" />
                    ) : (
                      <Coins className="h-9 w-9 text-primary-foreground" />
                    )}
                  </div>
                  <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-primary animate-pulse" />
                </div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                  Ganhe <span className="text-gradient">10 moedas</span> grátis
                </h1>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Use suas moedas pra <strong className="text-foreground">desbloquear posts pagos</strong>, enviar
                  gorjetas e presentear criadores em lives. Bônus único de boas-vindas.
                </p>
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col gap-2 text-xs">
                <div className="flex items-center gap-2 text-foreground">
                  <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  10 moedas creditadas na sua carteira
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  Feed personalizado pelas suas categorias
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  Notificação sempre que um criador que você segue publicar
                </div>
              </div>

              <Button
                className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:scale-[1.02] transition-transform"
                onClick={claimBonusAndFinish}
                disabled={claiming || claimedAmount !== null}
              >
                {claimedAmount !== null
                  ? `+${claimedAmount} moedas creditadas 🎉`
                  : claiming
                    ? "Resgatando..."
                    : "Resgatar e começar 🔥"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FanOnboarding;
