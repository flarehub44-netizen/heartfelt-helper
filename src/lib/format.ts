export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function relativeTimePtBR(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function tierBadgeClass(sortOrder: number): string {
  if (sortOrder >= 2) return "gradient-vip text-vip-foreground";
  if (sortOrder === 1) return "gradient-primary text-primary-foreground";
  return "bg-secondary text-secondary-foreground";
}

export function tierLabel(sortOrder: number): string {
  if (sortOrder >= 2) return "VIP";
  if (sortOrder === 1) return "Super Fã";
  return "Fã";
}

export function generatePixPayload(amountCents: number, paymentId: string): string {
  // Mock BR Code-like string (não é um EMV válido — apenas para UI)
  const amount = (amountCents / 100).toFixed(2);
  return `00020126580014BR.GOV.BCB.PIX0136${paymentId}5204000053039865802BR5913Vibe Creators6009SAO PAULO62070503${paymentId.slice(0, 6)}6304MOCK${amount.replace(".", "")}`;
}
