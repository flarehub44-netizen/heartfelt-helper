export const PLAN_ORDER = ["fan", "superfan", "vip"] as const;
export type PlanTier = (typeof PLAN_ORDER)[number] | "free";

const PLAN_RANK: Record<string, number> = {
  free: 0,
  fan: 1,
  superfan: 2,
  vip: 3,
};

export const PLAN_LABELS: Record<string, string> = {
  fan: "Fã",
  superfan: "Super Fã",
  vip: "VIP",
};

export function planRank(plan: string | null | undefined): number {
  if (!plan) return 0;
  return PLAN_RANK[plan.toLowerCase()] ?? 0;
}

export function planMeetsMin(
  subscriptionPlan: string | null | undefined,
  minPlan: string | null | undefined
): boolean {
  if (!minPlan || minPlan === "free") return true;
  if (!subscriptionPlan) return false;
  return planRank(subscriptionPlan) >= planRank(minPlan);
}

export function normalizePlanName(name: string): PlanTier | "free" {
  const n = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (n === "fa" || n === "fan") return "fan";
  if (n.includes("super")) return "superfan";
  if (n.includes("vip")) return "vip";
  if ((PLAN_ORDER as readonly string[]).includes(n)) return n as PlanTier;
  return "fan";
}

export function getPlanPrice(
  plans: { plan_name: string; price: number }[],
  planName: string
): number | undefined {
  const normalized = normalizePlanName(planName);
  const match = plans.find((p) => normalizePlanName(p.plan_name) === normalized);
  return match ? Number(match.price) : undefined;
}

export function getCheapestPlanForMin(
  plans: { plan_name: string; price: number }[],
  minPlan: string
): { plan_name: string; price: number } | undefined {
  const minRank = planRank(minPlan);
  const eligible = plans
    .filter((p) => planRank(normalizePlanName(p.plan_name)) >= minRank)
    .sort((a, b) => Number(a.price) - Number(b.price));
  return eligible[0];
}

export function getUpgradePriceDiff(
  plans: { plan_name: string; price: number }[],
  currentPlan: string,
  targetPlan: string
): number {
  const current = getPlanPrice(plans, currentPlan) ?? 0;
  const target = getPlanPrice(plans, targetPlan) ?? 0;
  return Math.max(0, Number(target) - Number(current));
}
