import { describe, it, expect } from "vitest";
import { planMeetsMin, planRank, getCheapestPlanForMin, normalizePlanName, getUpgradePriceDiff } from "@/lib/plans";

describe("planMeetsMin", () => {
  it("free content is accessible to everyone", () => {
    expect(planMeetsMin(null, "free")).toBe(true);
    expect(planMeetsMin(undefined, null)).toBe(true);
  });

  it("requires matching or higher tier", () => {
    expect(planMeetsMin("fan", "fan")).toBe(true);
    expect(planMeetsMin("fan", "superfan")).toBe(false);
    expect(planMeetsMin("vip", "superfan")).toBe(true);
    expect(planMeetsMin(null, "vip")).toBe(false);
  });
});

describe("planRank", () => {
  it("orders tiers correctly", () => {
    expect(planRank("free")).toBe(0);
    expect(planRank("fan")).toBe(1);
    expect(planRank("superfan")).toBe(2);
    expect(planRank("vip")).toBe(3);
  });
});

describe("normalizePlanName", () => {
  it("normalizes Portuguese labels", () => {
    expect(normalizePlanName("Fã")).toBe("fan");
    expect(normalizePlanName("Super Fã")).toBe("superfan");
    expect(normalizePlanName("VIP")).toBe("vip");
  });
});

describe("getCheapestPlanForMin", () => {
  const plans = [
    { plan_name: "fan", price: 10 },
    { plan_name: "superfan", price: 20 },
    { plan_name: "vip", price: 30 },
  ];

  it("returns cheapest plan that meets min tier", () => {
    expect(getCheapestPlanForMin(plans, "superfan")?.plan_name).toBe("superfan");
    expect(getCheapestPlanForMin(plans, "vip")?.price).toBe(30);
    expect(getCheapestPlanForMin(plans, "fan")?.price).toBe(10);
  });
});

describe("getUpgradePriceDiff", () => {
  const plans = [
    { plan_name: "fan", price: 10 },
    { plan_name: "superfan", price: 25 },
    { plan_name: "vip", price: 50 },
  ];

  it("returns price difference between tiers", () => {
    expect(getUpgradePriceDiff(plans, "fan", "superfan")).toBe(15);
    expect(getUpgradePriceDiff(plans, "superfan", "vip")).toBe(25);
    expect(getUpgradePriceDiff(plans, "vip", "fan")).toBe(0);
  });
});
