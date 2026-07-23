import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Camera, Save, Eye, EyeOff, Shield, CreditCard, Banknote, Instagram, Twitter, Youtube, DollarSign, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCreatorPayouts } from "@/hooks/useCreatorPayouts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";


const Settings = () => {
  const { profile: authProfile, user, refreshProfile } = useAuth();
  const isCreator = authProfile?.role === "creator";
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const defaultTab =
    tabFromUrl === "payments" && isCreator
      ? "payments"
      : tabFromUrl === "plans" && isCreator
        ? "plans"
        : tabFromUrl === "security"
          ? "security"
          : isCreator
            ? "profile"
            : "security";
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const {
    balance,
    eligibility,
    method,
    earnings,
    payouts,
    saveMethod,
    saveCpf,
    requestPayout,
    bootstrap,
  } = useCreatorPayouts();

  const [profileForm, setProfileForm] = useState({
    name: "",
    handle: "",
    bio: "",
    instagram: "",
    twitter: "",
    youtube: "",
    meta_pixel_id: "",
    meta_access_token: "",
  });
  const [cpfForm, setCpfForm] = useState("");

  const [plans, setPlans] = useState({
    fan: "29.90",
    superfan: "49.90",
    vip: "89.90",
  });

  const [planDescs, setPlanDescs] = useState({
    fan: "",
    superfan: "",
    vip: "",
  });

  const [bankForm, setBankForm] = useState({
    bank_name: "",
    account_type: "",
    agency: "",
    account_number: "",
    pix_key: "",
    pix_key_type: "cpf",
  });
  const [payoutAmount, setPayoutAmount] = useState("");
  const [dmPriceCoins, setDmPriceCoins] = useState("0");

  const [showPassword, setShowPassword] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Load profile data
  useEffect(() => {
    if (authProfile) {
      const social = (authProfile.social_links as any) ?? {};
      setProfileForm({
        name: authProfile.name || "",
        handle: authProfile.handle || "",
        bio: authProfile.bio || "",
        instagram: social.instagram || "",
        twitter: social.twitter || "",
        youtube: social.youtube || "",
        meta_pixel_id: social.meta_pixel_id || "",
        meta_access_token: social.meta_access_token || "",
      });
      setDmPriceCoins(String((authProfile as { dm_price_coins?: number }).dm_price_coins ?? 0));
      const existingCpf = authProfile.cpf;
      if (existingCpf) setCpfForm(existingCpf);
    }
  }, [authProfile]);

  useEffect(() => {
    if (method.data) {
      setBankForm({
        bank_name: method.data.bank_name || "",
        account_type: method.data.account_type || "",
        agency: method.data.agency || "",
        account_number: method.data.account_number || "",
        pix_key: method.data.pix_key || "",
        pix_key_type: method.data.pix_key_type || "cpf",
      });
    }
  }, [method.data]);

  // Load plans
  useEffect(() => {
    if (!user || !isCreator) return;
    supabase
      .from("creator_plans")
      .select("*")
      .eq("creator_id", user.id)
      .then(({ data }) => {
        if (data?.length) {
          const priceMap: Record<string, string> = {};
          const descMap: Record<string, string> = {};
          data.forEach((p) => {
            const normalized = p.plan_name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
            const key = normalized === "fa" || normalized === "fan" ? "fan"
              : normalized.includes("super") ? "superfan"
              : normalized.includes("vip") ? "vip"
              : null;
            if (key) {
              priceMap[key] = p.price.toString();
              if ((p as any).description) descMap[key] = (p as any).description;
            }
          });
          setPlans((prev) => ({ ...prev, ...priceMap }));
          setPlanDescs((prev) => ({ ...prev, ...descMap }));
        }
      });
  }, [user, isCreator]);

  const handleSaveProfile = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        name: profileForm.name,
        handle: profileForm.handle,
        bio: profileForm.bio,
        social_links: {
          instagram: profileForm.instagram,
          twitter: profileForm.twitter,
          youtube: profileForm.youtube,
          meta_pixel_id: profileForm.meta_pixel_id,
          meta_access_token: profileForm.meta_access_token,
        },
        ...(isCreator
          ? { dm_price_coins: Math.max(0, parseInt(dmPriceCoins, 10) || 0) }
          : {}),
      } as never);

    if (error) {
      toast.error("Erro ao salvar perfil");
    } else {
      setSaved(true);
      toast.success("Perfil salvo!");
      await refreshProfile();
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file);
    if (uploadError) {
      toast.error("Erro ao enviar avatar");
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", user.id);
    toast.success("Avatar atualizado!");
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("covers").upload(path, file);
    if (uploadError) {
      toast.error("Erro ao enviar capa");
      return;
    }

    const { data: urlData } = supabase.storage.from("covers").getPublicUrl(path);
    await supabase.from("profiles").update({ cover_url: urlData.publicUrl }).eq("id", user.id);
    toast.success("Capa atualizada!");
  };

  const handleSavePlans = async () => {
    if (!user) return;
    const planEntries = [
      { plan_name: "fan", price: parseFloat(plans.fan), description: planDescs.fan || null },
      { plan_name: "superfan", price: parseFloat(plans.superfan), description: planDescs.superfan || null },
      { plan_name: "vip", price: parseFloat(plans.vip), description: planDescs.vip || null },
    ];

    for (const entry of planEntries) {
      await supabase
        .from("creator_plans")
        .upsert(
          { creator_id: user.id, plan_name: entry.plan_name, price: entry.price, description: entry.description } as any,
          { onConflict: "creator_id,plan_name", ignoreDuplicates: false }
        );
    }
    setSaved(true);
    toast.success("Planos salvos!");
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Senha atualizada!");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const avatarUrl = authProfile?.avatar_url || "";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-3xl pt-24 pb-16">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground mt-1">Gerencie sua conta e preferências</p>
        </div>

        <Tabs defaultValue={defaultTab} key={defaultTab}>
          <TabsList className={`w-full grid mb-8 bg-muted/30 border border-border/50 rounded-xl p-1 h-auto ${isCreator ? "grid-cols-4" : "grid-cols-2"}`}>
            {(isCreator
              ? [
                  { value: "profile", label: "Perfil" },
                  { value: "plans", label: "Planos" },
                  { value: "payments", label: "Pagamentos" },
                  { value: "security", label: "Segurança" },
                ]
              : [
                  { value: "profile", label: "Conta" },
                  { value: "security", label: "Segurança" },
                ]
            ).map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-lg py-2.5 text-sm data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* PERFIL */}
          <TabsContent value="profile">
            <div className="glass-card rounded-2xl p-6 flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-primary/40"  loading="lazy" decoding="async" />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-muted ring-2 ring-primary/40 flex items-center justify-center text-2xl font-bold text-muted-foreground">
                      {profileForm.name.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                  <button onClick={() => avatarRef.current?.click()} className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
                    <Camera className="h-3.5 w-3.5 text-primary-foreground" />
                  </button>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{profileForm.name}</p>
                  <p className="text-sm text-muted-foreground">@{profileForm.handle}</p>
                </div>
              </div>

              {/* Cover upload */}
              <div className="flex flex-col gap-2">
                <Label>Imagem de capa</Label>
                <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                <div
                  onClick={() => coverRef.current?.click()}
                  className="relative h-32 rounded-xl overflow-hidden border border-border/50 cursor-pointer group"
                >
                  {authProfile?.cover_url ? (
                    <img src={authProfile.cover_url} alt="Capa" className="h-full w-full object-cover"  loading="lazy" decoding="async" />
                  ) : (
                    <div className="h-full w-full bg-muted/30 flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">Clique para adicionar uma capa</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-6 w-6 text-foreground" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Nome</Label>
                  <Input className="bg-muted/20 border-border/50" value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Handle</Label>
                  <Input className="bg-muted/20 border-border/50" value={profileForm.handle} onChange={(e) => setProfileForm((p) => ({ ...p, handle: e.target.value }))} />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Biografia</Label>
                <Textarea className="bg-muted/20 border-border/50 resize-none min-h-[100px]" value={profileForm.bio} onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} />
              </div>

              <div className="flex flex-col gap-3">
                <Label>Redes sociais</Label>
                {[
                  { icon: Instagram, key: "instagram", placeholder: "@instagram" },
                  { icon: Twitter, key: "twitter", placeholder: "@twitter" },
                  { icon: Youtube, key: "youtube", placeholder: "Canal do YouTube" },
                ].map(({ icon: Icon, key, placeholder }) => (
                  <div key={key} className="relative">
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9 bg-muted/20 border-border/50"
                      placeholder={placeholder}
                      value={profileForm[key as keyof typeof profileForm]}
                      onChange={(e) => setProfileForm((p) => ({ ...p, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>

              {/* Meta Pixel section — only for creators */}
              {isCreator && (
                <div className="flex flex-col gap-3">
                  <Label className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Pixel do Meta (CAPI)
                  </Label>
                  <p className="text-xs text-muted-foreground -mt-1">
                    Configure seu próprio Pixel do Meta para rastrear eventos de assinatura no seu painel de anúncios.
                  </p>
                  <div className="flex flex-col gap-3">
                    <Input
                      className="bg-muted/20 border-border/50"
                      placeholder="Pixel ID — Ex: 1234567890"
                      value={profileForm.meta_pixel_id}
                      onChange={(e) => setProfileForm((p) => ({ ...p, meta_pixel_id: e.target.value }))}
                    />
                    <Input
                      className="bg-muted/20 border-border/50"
                      placeholder="Token de acesso (CAPI) — Ex: EAABs..."
                      type="password"
                      value={profileForm.meta_access_token}
                      onChange={(e) => setProfileForm((p) => ({ ...p, meta_access_token: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Encontre essas informações no{" "}
                      <a
                        href="https://business.facebook.com/events_manager"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        Gerenciador de Eventos do Meta
                      </a>
                      .
                    </p>
                  </div>
                </div>
              )}

              {isCreator && (
                <div className="flex flex-col gap-2">
                  <Label>Preço para desbloquear DM (moedas)</Label>
                  <p className="text-xs text-muted-foreground -mt-1">
                    0 = qualquer assinante pode mensagens. Maior que 0 = VIP grátis ou desbloqueio pago.
                  </p>
                  <Input
                    type="number"
                    min={0}
                    className="bg-muted/20 border-border/50 w-40"
                    value={dmPriceCoins}
                    onChange={(e) => setDmPriceCoins(e.target.value)}
                  />
                </div>
              )}

              <Button
                onClick={handleSaveProfile}
                className={`self-end rounded-full px-6 transition-all ${saved ? "bg-green-500 hover:bg-green-500" : "bg-gradient-primary shadow-glow hover:scale-105"} text-primary-foreground`}
              >
                <Save className="h-4 w-4 mr-2" />
                {saved ? "Salvo!" : "Salvar alterações"}
              </Button>
            </div>
          </TabsContent>

          {/* PLANOS */}
          {isCreator && (
          <TabsContent value="plans">
            <div className="glass-card rounded-2xl p-6 flex flex-col gap-6">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 text-sm text-foreground/90 leading-relaxed">
                <p className="font-semibold mb-1">💳 Cobrança mensal</p>
                <p className="text-muted-foreground">
                  Todos os planos são <strong>renovados a cada 30 dias</strong> via PIX. Você define o preço e a descrição
                  de cada nível — criamos 3 padrões para começar, mas você pode editar a qualquer momento. As mudanças
                  valem para novas assinaturas; quem já assina mantém o preço da contratação até o fim do ciclo.
                </p>
              </div>

              {[
                { key: "fan", label: "Fã", emoji: "💜", placeholder: "Ex: Acesso ao conteúdo exclusivo e mensagens diretas" },
                { key: "superfan", label: "Super Fã", emoji: "💎", placeholder: "Ex: Tudo do plano Fã + vídeos em HD e lives privadas" },
                { key: "vip", label: "VIP", emoji: "👑", placeholder: "Ex: Experiência completa com conteúdo 4K e acesso antecipado" },
              ].map(({ key, label, emoji, placeholder }) => (
                <div key={key} className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/10 p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl flex-shrink-0">{emoji}</div>
                    <p className="font-semibold text-foreground flex-1">{label}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">R$</span>
                      <Input
                        type="number"
                        className="w-24 bg-muted/20 border-border/50 text-right"
                        value={plans[key as keyof typeof plans]}
                        onChange={(e) => setPlans((p) => ({ ...p, [key]: e.target.value }))}
                      />
                      <span className="text-sm text-muted-foreground">/mês</span>
                    </div>
                  </div>
                  <Input
                    className="bg-muted/20 border-border/50 text-sm"
                    placeholder={placeholder}
                    value={planDescs[key as keyof typeof planDescs]}
                    onChange={(e) => setPlanDescs((p) => ({ ...p, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <Button
                onClick={handleSavePlans}
                className={`self-end rounded-full px-6 transition-all ${saved ? "bg-green-500 hover:bg-green-500" : "bg-gradient-primary shadow-glow hover:scale-105"} text-primary-foreground`}
              >
                <Save className="h-4 w-4 mr-2" />
                {saved ? "Salvo!" : "Salvar planos"}
              </Button>
            </div>
          </TabsContent>
          )}

          {/* PAGAMENTOS */}
          {isCreator && (
          <TabsContent value="payments">
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Taxa e regras de saque</p>
                  <p className="text-sm text-muted-foreground">
                    A plataforma retém 20% de cada pagamento Pix. Saque mínimo R$ 30 · hold de 7 dias após o crédito · limite R$ 5.000/dia.
                  </p>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6 grid sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Disponível</p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {(balance.data?.available_brl ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Elegível agora</p>
                  <p className="text-2xl font-bold text-green-400">
                    R$ {(eligibility.data?.eligible_brl ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Em processamento</p>
                  <p className="text-2xl font-bold text-amber-400">
                    R$ {(balance.data?.pending_brl ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total já ganho</p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {(balance.data?.lifetime_earned_brl ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="sm:col-span-4 flex flex-wrap gap-2 items-end">
                  <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                    <Label>Valor do saque (mín. R$ 30)</Label>
                    <Input
                      type="number"
                      min={30}
                      step="0.01"
                      className="bg-muted/20 border-border/50"
                      placeholder="30,00"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                    />
                  </div>
                  <Button
                    disabled={requestPayout.isPending}
                    onClick={async () => {
                      const amt = parseFloat(payoutAmount.replace(",", "."));
                      if (!amt || amt < 30) {
                        toast.error("Informe um valor de pelo menos R$ 30");
                        return;
                      }
                      try {
                        await requestPayout.mutateAsync(amt);
                        toast.success("Saque enviado ao Pix. Acompanhe o status abaixo.");
                        setPayoutAmount("");
                      } catch (err: unknown) {
                        const msg =
                          err && typeof err === "object" && "message" in err
                            ? String((err as { message: string }).message)
                            : "Erro ao solicitar saque";
                        toast.error(msg);
                      }
                    }}
                    className="rounded-full bg-gradient-primary text-primary-foreground shadow-glow"
                  >
                    Solicitar saque
                  </Button>
                  <Button
                    variant="outline"
                    disabled={bootstrap.isPending}
                    onClick={async () => {
                      try {
                        const n = await bootstrap.mutateAsync();
                        toast.success(n > 0 ? `${n} ganhos sincronizados` : "Saldo já estava atualizado");
                      } catch (err: unknown) {
                        toast.error(err instanceof Error ? err.message : "Erro ao sincronizar");
                      }
                    }}
                  >
                    Sincronizar ganhos
                  </Button>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-foreground">KYC mínimo · CPF + Pix</h2>
                </div>
                <div className="flex flex-col gap-2 max-w-sm">
                  <Label>CPF *</Label>
                  <Input
                    className="bg-muted/20 border-border/50"
                    placeholder="000.000.000-00"
                    value={cpfForm}
                    onChange={(e) => setCpfForm(e.target.value)}
                    inputMode="numeric"
                  />
                  <Button
                    variant="outline"
                    disabled={saveCpf.isPending}
                    className="self-start"
                    onClick={async () => {
                      try {
                        await saveCpf.mutateAsync(cpfForm);
                        await refreshProfile();
                        toast.success("CPF salvo");
                      } catch (err: unknown) {
                        toast.error(err instanceof Error ? err.message : "Erro ao salvar CPF");
                      }
                    }}
                  >
                    Salvar CPF
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>Banco</Label>
                    <Input
                      className="bg-muted/20 border-border/50"
                      placeholder="Ex: Nubank"
                      value={bankForm.bank_name}
                      onChange={(e) => setBankForm((p) => ({ ...p, bank_name: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Tipo de conta</Label>
                    <Input
                      className="bg-muted/20 border-border/50"
                      placeholder="Corrente / Poupança"
                      value={bankForm.account_type}
                      onChange={(e) => setBankForm((p) => ({ ...p, account_type: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Agência</Label>
                    <Input
                      className="bg-muted/20 border-border/50"
                      placeholder="0001"
                      value={bankForm.agency}
                      onChange={(e) => setBankForm((p) => ({ ...p, agency: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Conta</Label>
                    <Input
                      className="bg-muted/20 border-border/50"
                      placeholder="000000-0"
                      value={bankForm.account_number}
                      onChange={(e) => setBankForm((p) => ({ ...p, account_number: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2 flex flex-col gap-2">
                    <Label>Chave PIX *</Label>
                    <Input
                      className="bg-muted/20 border-border/50"
                      placeholder="CPF, e-mail, telefone ou chave aleatória"
                      value={bankForm.pix_key}
                      onChange={(e) => setBankForm((p) => ({ ...p, pix_key: e.target.value }))}
                    />
                  </div>
                </div>
                <Button
                  disabled={saveMethod.isPending}
                  onClick={async () => {
                    if (!bankForm.pix_key.trim()) {
                      toast.error("Informe a chave Pix");
                      return;
                    }
                    try {
                      await saveMethod.mutateAsync(bankForm);
                      toast.success("Dados bancários salvos!");
                    } catch {
                      toast.error("Erro ao salvar dados bancários");
                    }
                  }}
                  className="self-end rounded-full px-6 bg-gradient-primary text-primary-foreground shadow-glow hover:scale-105 transition-transform"
                >
                  <Save className="h-4 w-4 mr-2" /> Salvar dados
                </Button>
              </div>

              <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Histórico de saques</h2>
                </div>
                {(payouts.data?.length ?? 0) === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Nenhum saque realizado ainda.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {payouts.data!.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/10 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            R$ {p.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(p.created_at), "d MMM yyyy HH:mm", { locale: ptBR })} · {p.pix_key}
                            {p.failure_reason ? ` · ${p.failure_reason}` : ""}
                          </p>
                        </div>
                        <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${
                          p.status === "paid" ? "bg-green-500/15 text-green-400"
                            : p.status === "failed" ? "bg-red-500/15 text-red-400"
                            : p.status === "processing" ? "bg-blue-500/15 text-blue-400"
                            : "bg-amber-500/15 text-amber-400"
                        }`}>
                          {p.status === "paid" ? "Pago"
                            : p.status === "failed" ? "Falhou"
                            : p.status === "processing" ? "Processando"
                            : "Pendente"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
                <h2 className="font-semibold text-foreground">Extrato de ganhos (BRL)</h2>
                {(earnings.data?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Ainda sem créditos. Assinaturas e gorjetas Pix aparecem aqui automaticamente.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {earnings.data!.map((e) => (
                      <div key={e.id} className="flex items-center justify-between rounded-xl border border-border/40 px-4 py-2.5">
                        <div>
                          <p className="text-sm text-foreground">{e.description || e.source_type}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(e.created_at), "d MMM yyyy", { locale: ptBR })} · bruto R$ {e.gross_amount.toFixed(2)}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-green-400">+R$ {e.net_amount.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          )}

          {/* SEGURANÇA */}
          <TabsContent value="security">
            <div className="flex flex-col gap-4">
              <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Alterar senha</h2>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <Label>Nova senha</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        className="pr-10 bg-muted/20 border-border/50"
                        placeholder="Mínimo 8 caracteres"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Confirmar nova senha</Label>
                    <Input
                      type="password"
                      className="bg-muted/20 border-border/50"
                      placeholder="Repita a nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={handleChangePassword} className="self-end rounded-full px-6 bg-gradient-primary text-primary-foreground shadow-glow hover:scale-105 transition-transform">
                  Atualizar senha
                </Button>
              </div>

              <div className="glass-card rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">Autenticação em dois fatores</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Adiciona uma camada extra de segurança à sua conta</p>
                </div>
                <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
              </div>

              {twoFactor && (
                <div className="glass-card rounded-2xl p-5 border border-primary/30 bg-primary/5">
                  <p className="text-sm text-foreground font-medium mb-2">🔐 Dois fatores ativado!</p>
                  <p className="text-xs text-muted-foreground">Você receberá um código por SMS ou e-mail a cada novo login.</p>
                </div>
              )}

              <div className="glass-card rounded-2xl p-6">
                <p className="font-semibold text-foreground mb-1">Zona de perigo</p>
                <p className="text-sm text-muted-foreground mb-4">Ações irreversíveis para sua conta.</p>
                <Button variant="destructive" className="rounded-full px-6">
                  Excluir conta
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
