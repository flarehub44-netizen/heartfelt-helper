import { describe, it, expect } from "vitest";
import { pushDeepLink } from "@/lib/pushDeepLink";

describe("pushDeepLink", () => {
  it("prefers explicit url", () => {
    expect(pushDeepLink("renewal_reminder", "/u/ana")).toBe("/u/ana");
  });

  it("maps known notification types", () => {
    expect(pushDeepLink("renewal_reminder")).toBe("/subscriptions");
    expect(pushDeepLink("subscription_expired")).toBe("/subscriptions");
    expect(pushDeepLink("creator_approved")).toBe("/dashboard");
    expect(pushDeepLink("checkout_abandoned")).toBe("/subscriptions");
    expect(pushDeepLink("subscription_activated")).toBe("/subscriptions");
    expect(pushDeepLink("creator_live")).toBe("/discover");
  });

  it("uses creator context for renew and abandoned", () => {
    expect(
      pushDeepLink("renewal_reminder", null, {
        creator_id: "c1",
        handle: "ana",
        plan: "fan",
      }),
    ).toBe("/u/ana?openSubscribe=1&plan=fan");

    expect(
      pushDeepLink("checkout_abandoned", null, {
        creator_id: "c1",
        plan: "vip",
      }),
    ).toBe("/creator/c1?openSubscribe=1&plan=vip");
  });

  it("builds live paths from data", () => {
    expect(
      pushDeepLink("creator_live", null, {
        creator_id: "c1",
        handle: "ana",
        live_id: "l1",
      }),
    ).toBe("/u/ana/live/l1");
  });

  it("falls back to home", () => {
    expect(pushDeepLink()).toBe("/");
    expect(pushDeepLink("tip_sent")).toBe("/");
  });
});
