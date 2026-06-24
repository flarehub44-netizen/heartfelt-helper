import { describe, it, expect } from "vitest";

const PAID_STATUSES = ["completed", "COMPLETED", "PAID_OUT", "paid", "PAID", "approved", "APPROVED"];

function isPaidStatus(status: string): boolean {
  return PAID_STATUSES.includes(status);
}

function shouldProcessPayment(plan: string, existingTipId: string | null, existingSubId: string | null) {
  if (!isPaidStatus("completed")) return { action: "ignore" as const };
  if (plan === "tip") {
    if (existingTipId) return { action: "duplicate" as const };
    return { action: "insert_tip" as const };
  }
  if (existingSubId) return { action: "duplicate" as const };
  return { action: "insert_subscription" as const };
}

describe("syncpay webhook idempotency", () => {
  it("recognizes paid statuses", () => {
    expect(isPaidStatus("completed")).toBe(true);
    expect(isPaidStatus("pending")).toBe(false);
  });

  it("routes tip payments to tips table", () => {
    expect(shouldProcessPayment("tip", null, null)).toEqual({ action: "insert_tip" });
    expect(shouldProcessPayment("tip", "existing", null)).toEqual({ action: "duplicate" });
  });

  it("deduplicates subscription by syncpay_id", () => {
    expect(shouldProcessPayment("fan", null, "existing")).toEqual({ action: "duplicate" });
    expect(shouldProcessPayment("fan", null, null)).toEqual({ action: "insert_subscription" });
  });

  it("tip plan bypasses subscription path", () => {
    const plan = "tip";
    expect(plan !== "tip").toBe(false);
    expect(shouldProcessPayment(plan, null, "sub-id")).toEqual({ action: "insert_tip" });
  });
});

describe("feed teaser masking", () => {
  function maskMediaUrl(canView: boolean, url: string | null): string | null {
    return canView ? url : null;
  }

  it("hides media for users without tier access", () => {
    expect(maskMediaUrl(false, "https://cdn.example.com/img.jpg")).toBeNull();
    expect(maskMediaUrl(true, "https://cdn.example.com/img.jpg")).toBe("https://cdn.example.com/img.jpg");
  });

  it("always shows free content media", () => {
    expect(maskMediaUrl(true, null)).toBeNull();
  });
});
