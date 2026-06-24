import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { updateProfile } from "@/lib/profile.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const update = useServerFn(updateProfile);

  const { data: profile } = useQuery({
    queryKey: ["me-full", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({
    display_name: "",
    bio: "",
    avatar_url: "",
    cover_url: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name ?? "",
        bio: profile.bio ?? "",
        avatar_url: profile.avatar_url ?? "",
        cover_url: profile.cover_url ?? "",
      });
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: () => update({ data: form }),
    onSuccess: () => {
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["me-full", user?.id] });
      qc.invalidateQueries({ queryKey: ["me-profile", user?.id] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-4xl">Configurações</h1>
      <p className="text-muted-foreground">Atualize suas informações públicas.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="mt-8 space-y-5 rounded-3xl border border-border bg-card p-6 shadow-card"
      >
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>
        <div className="space-y-1.5">
          <Label>@ usuário</Label>
          <Input value={profile?.handle ?? ""} disabled />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dn">Nome de exibição</Label>
          <Input id="dn" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="av">URL do avatar</Label>
          <Input id="av" type="url" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://..." />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cv">URL da capa</Label>
          <Input id="cv" type="url" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} placeholder="https://..." />
        </div>
        <Button type="submit" disabled={mutation.isPending} className="gradient-primary text-primary-foreground shadow-glow">
          {mutation.isPending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </form>
    </div>
  );
}
