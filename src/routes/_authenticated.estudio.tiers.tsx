import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { upsertTier } from "@/lib/creator.functions";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { tierBadgeClass, tierLabel, formatBRL } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/estudio/tiers")({
  component: TiersPage,
});

function TiersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const upsert = useServerFn(upsertTier);

  const { data: tiers = [] } = useQuery({
    queryKey: ["studio-tiers", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("tiers")
        .select("*")
        .eq("creator_id", user!.id)
        .order("sort_order");
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h2 className="font-display text-3xl">Camadas de assinatura</h2>
      <p className="text-muted-foreground">
        Defina preço e benefícios para cada nível.
      </p>
      <div className="mt-6 space-y-4">
        {tiers.map((t) => (
          <TierEditor
            key={t.id}
            tier={t}
            onSave={async (data) => {
              await upsert({ data: { ...data, id: t.id } as any });
              toast.success(`${t.name} atualizada`);
              qc.invalidateQueries({ queryKey: ["studio-tiers", user?.id] });
              qc.invalidateQueries({ queryKey: ["tiers"] });
            }}
          />
        ))}
      </div>
    </div>
  );
}

function TierEditor({
  tier,
  onSave,
}: {
  tier: { id: string; slug: string; name: string; description: string | null; price_brl_cents: number; benefits: string[]; sort_order: number };
  onSave: (d: { slug: "fan" | "super_fan" | "vip"; name: string; description: string; price_brl_cents: number; benefits: string[]; sort_order: number }) => Promise<void>;
}) {
  const [name, setName] = useState(tier.name);
  const [desc, setDesc] = useState(tier.description ?? "");
  const [priceReais, setPriceReais] = useState((tier.price_brl_cents / 100).toFixed(2));
  const [benefitsText, setBenefitsText] = useState((tier.benefits ?? []).join("\n"));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(tier.name);
    setDesc(tier.description ?? "");
    setPriceReais((tier.price_brl_cents / 100).toFixed(2));
    setBenefitsText((tier.benefits ?? []).join("\n"));
  }, [tier]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          await onSave({
            slug: tier.slug as any,
            name,
            description: desc,
            price_brl_cents: Math.round(parseFloat(priceReais.replace(",", ".")) * 100),
            benefits: benefitsText.split("\n").map((s) => s.trim()).filter(Boolean),
            sort_order: tier.sort_order,
          });
        } finally {
          setSaving(false);
        }
      }}
      className="rounded-3xl border border-border bg-card p-6 shadow-card"
    >
      <div className="flex items-center justify-between">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tierBadgeClass(tier.sort_order)}`}>
          {tierLabel(tier.sort_order)}
        </span>
        <p className="font-display text-2xl">{formatBRL(Math.round(parseFloat(priceReais.replace(",", ".") || "0") * 100))}/mês</p>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Preço mensal (R$)</Label>
          <Input value={priceReais} onChange={(e) => setPriceReais(e.target.value)} inputMode="decimal" required />
        </div>
      </div>
      <div className="mt-4 space-y-1.5">
        <Label>Descrição curta</Label>
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={300} />
      </div>
      <div className="mt-4 space-y-1.5">
        <Label>Benefícios (um por linha)</Label>
        <Textarea rows={4} value={benefitsText} onChange={(e) => setBenefitsText(e.target.value)} />
      </div>
      <Button type="submit" disabled={saving} className="mt-4 gradient-primary text-primary-foreground">
        {saving ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
