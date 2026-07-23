import { describe, it, expect, beforeEach } from "vitest";
import {
  setCheckoutIntent,
  peekCheckoutIntent,
  clearCheckoutIntent,
  checkoutIntentPath,
} from "@/lib/checkoutIntent";

describe("checkoutIntent", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("stores and peeks intent", () => {
    setCheckoutIntent({ creatorId: "abc", plan: "vip", amount: 29.9 });
    const intent = peekCheckoutIntent();
    expect(intent?.creatorId).toBe("abc");
    expect(intent?.plan).toBe("vip");
    expect(intent?.amount).toBe(29.9);
    expect(typeof intent?.createdAt).toBe("number");
  });

  it("mirrors intent to localStorage for cross-tab recovery", () => {
    setCheckoutIntent({ creatorId: "abc", plan: "fan" });
    expect(localStorage.getItem("checkout_intent")).toBeTruthy();
    sessionStorage.clear();
    const intent = peekCheckoutIntent();
    expect(intent?.creatorId).toBe("abc");
    expect(intent?.plan).toBe("fan");
  });

  it("clears intent", () => {
    setCheckoutIntent({ creatorId: "abc" });
    clearCheckoutIntent();
    expect(peekCheckoutIntent()).toBeNull();
    expect(localStorage.getItem("checkout_intent")).toBeNull();
  });

  it("builds openSubscribe path", () => {
    expect(
      checkoutIntentPath({ creatorId: "x", createdAt: Date.now(), plan: "fan" })
    ).toBe("/creator/x?openSubscribe=1&plan=fan");
    expect(
      checkoutIntentPath({ creatorId: "x", createdAt: Date.now() })
    ).toBe("/creator/x?openSubscribe=1");
    expect(
      checkoutIntentPath({
        creatorId: "x",
        handle: "maria",
        createdAt: Date.now(),
        plan: "vip",
      })
    ).toBe("/u/maria?openSubscribe=1&plan=vip");
  });

  it("expires after max age", () => {
    setCheckoutIntent({ creatorId: "old" });
    const raw = JSON.parse(sessionStorage.getItem("checkout_intent")!);
    raw.createdAt = Date.now() - 3 * 60 * 60 * 1000;
    sessionStorage.setItem("checkout_intent", JSON.stringify(raw));
    localStorage.setItem("checkout_intent", JSON.stringify(raw));
    expect(peekCheckoutIntent()).toBeNull();
  });
});
