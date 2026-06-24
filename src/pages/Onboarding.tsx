import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Camera, DollarSign, ArrowRight, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Onboarding = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [bio, setBio] = useState(profile?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [coverUrl, setCoverUrl] = useState(profile?.cover_url || "");
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || "");
  const [coverPreview, setCoverPreview] = useState(profile?.cover_url || "");
  const [plans, setPlans] = useState({ fan: "9.90", superfan: "19.90", vip: "49.90" });
  const [saving, setSaving] = useState(false);

  const displayName = profile?.name || "Criador(a)";

  const uploadImage = async (file: File, bucket: string, prefix: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    try {
      const url = await uploadImage(file, "avatars", "avatar");
      setAvatarUrl(url);
    } catch {
      toast.error("Erro ao enviar foto de perfil");
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverPreview(URL.createObjectURL(file));
    try {
      const url = await uploadImage(file, "covers", "cover");
      setCoverUrl(url);
    } catch {
      toast.error("Erro ao enviar foto de capa");
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ bio, avatar_url: avatarUrl || null, cover_url: coverUrl || null })
        .eq("id", user.id);
      if (profileError) throw profileError;

      const planEntries = [
        { plan_name: "fan", price: parseFloat(plans.fan) || 9.9 },
        { plan_name: "superfan", price: parseFloat(plans.superfan) || 19.9 },
        { plan_name: "vip", price: parseFloat(plans.vip) || 49.9 },
      ];

      for (const entry of planEntries) {
        await supabase
          .from("creator_plans")
          .upsert({ creator_id: user.id, plan_name: entry.plan_name, price: entry.price }, {
            onConflict: "creator_id,plan_name",
          });
      }

      await refreshProfile();
      toast.success("Perfil configurado com sucesso!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-start justify-center py-12 px-4 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-2xl flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow animate-pulse-glow">
            <Flame className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Bem-vindo(a), <span className="text-gradient">{displayName}</span>! 🎉
          </h1>
          <p className="text-muted-foreground max-w-md">
            Configure seu perfil agora para começar a monetizar seu conteúdo. Você pode editar tudo isso depois.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8 flex flex-col gap-8">
          {/* Cover photo */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-semibold text-foreground">Foto de capa</Label>
            <div
              className="relative h-40 w-full rounded-xl overflow-hidden bg-muted/30 border border-border/50 cursor-pointer group"
              onClick={() => coverRef.current?.click()}
            >
              {coverPreview ? (
                <img src={coverPreview} alt="Capa" className="h-full w-full object-cover"  loading="lazy" decoding="async" />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Camera className="h-8 w-8" />
                  <span className="text-sm">Clique para adicionar foto de capa</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </div>
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div
              className="relative h-20 w-20 rounded-full overflow-hidden bg-muted/30 border-2 border-border/50 cursor-pointer group flex-shrink-0"
              onClick={() => avatarRef.current?.click()}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover"  loading="lazy" decoding="async" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                  <Camera className="h-6 w-6" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                <Camera className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground">Foto de perfil</p>
              <p className="text-xs text-muted-foreground">Recomendado: imagem quadrada, mín. 400x400px</p>
              <button
                onClick={() => avatarRef.current?.click()}
                className="text-xs text-primary hover:underline text-left mt-1"
              >
                Escolher foto
              </button>
            </div>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="bio" className="text-sm font-semibold text-foreground">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Conte um pouco sobre você e seu conteúdo..."
              className="bg-muted/20 border-border/50 resize-none"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          {/* Plans */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label className="text-sm font-semibold text-foreground">Preços dos planos</Label>
              <p className="text-xs text-muted-foreground">Defina quanto cobrar em cada nível de assinatura</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { key: "fan" as const, label: "💖 Fã", color: "text-pink-400" },
                { key: "superfan" as const, label: "🔥 Super Fã", color: "text-primary" },
                { key: "vip" as const, label: "💎 VIP", color: "text-amber-400" },
              ].map(({ key, label, color }) => (
                <div key={key} className="flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/10 p-4">
                  <span className={`text-sm font-semibold ${color}`}>{label}</span>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={plans[key]}
                      onChange={(e) => setPlans((p) => ({ ...p, [key]: e.target.value }))}
                      className="pl-7 bg-background/50 border-border/50 text-sm"
                      placeholder="9.90"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-xl bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:scale-[1.02] transition-transform h-11"
            >
              {saving ? "Salvando..." : "Salvar e ir ao Dashboard"}
              {!saving && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="rounded-xl border-border/50 text-muted-foreground hover:text-foreground h-11 gap-2"
            >
              <SkipForward className="h-4 w-4" />
              Pular por agora
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Você poderá editar todas essas informações a qualquer momento nas configurações.
        </p>
      </div>
    </div>
  );
};

export default Onboarding;
