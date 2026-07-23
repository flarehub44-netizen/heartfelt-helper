import { describe, it, expect, beforeEach } from "vitest";
import { getLoginPath, getSignupPath, getPostAuthPath, isSafeReturnPath } from "@/lib/authRedirect";
import { clearCheckoutIntent, setCheckoutIntent } from "@/lib/checkoutIntent";

describe("getLoginPath", () => {
  it("returns plain login without returnTo", () => {
    expect(getLoginPath()).toBe("/login");
    expect(getLoginPath("")).toBe("/login");
  });

  it("encodes returnTo query param", () => {
    expect(getLoginPath("/creator/abc")).toBe("/login?returnTo=%2Fcreator%2Fabc");
    expect(getLoginPath("/creator/abc?ref=xyz")).toBe(
      "/login?returnTo=%2Fcreator%2Fabc%3Fref%3Dxyz"
    );
  });

  it("rejects unsafe paths", () => {
    expect(getLoginPath("//evil.com")).toBe("/login");
  });
});

describe("getSignupPath", () => {
  it("encodes returnTo", () => {
    expect(getSignupPath("/creator/1?openSubscribe=1")).toBe(
      "/signup?returnTo=%2Fcreator%2F1%3FopenSubscribe%3D1"
    );
  });
});

describe("getPostAuthPath", () => {
  beforeEach(() => {
    clearCheckoutIntent();
  });

  it("prefers safe returnTo", () => {
    expect(getPostAuthPath("/creator/1", "fan")).toBe("/creator/1");
  });

  it("maps returnTo=/ away from creator landing for fans", () => {
    expect(getPostAuthPath("/", "fan")).toBe("/feed");
    expect(getPostAuthPath("/", "fan", false)).toBe("/fan-onboarding");
  });

  it("leaves returnTo=/ for approved creators (HomeEntry routes them)", () => {
    expect(getPostAuthPath("/", "creator")).toBe("/");
  });

  it("sends unapproved creator with returnTo=/ to pending-approval", () => {
    expect(getPostAuthPath("/", "creator", true, false)).toBe("/pending-approval");
  });

  it("falls back by role", () => {
    expect(getPostAuthPath(null, "creator")).toBe("/dashboard");
    expect(getPostAuthPath(null, "fan")).toBe("/feed");
  });

  it("redirects new fan to onboarding when not yet onboarded", () => {
    expect(getPostAuthPath(null, "fan", false)).toBe("/fan-onboarding");
  });

  it("ignores onboarding flag for creators and returnTo", () => {
    expect(getPostAuthPath(null, "creator", false)).toBe("/dashboard");
    expect(getPostAuthPath("/feed", "fan", false)).toBe("/feed");
  });

  it("sends unapproved creator to pending-approval", () => {
    expect(getPostAuthPath(null, "creator", true, false)).toBe("/pending-approval");
  });

  it("blocks unapproved creator returnTo outside prep routes", () => {
    expect(getPostAuthPath("/discover", "creator", true, false)).toBe("/pending-approval");
    expect(getPostAuthPath("/dashboard", "creator", true, false)).toBe("/pending-approval");
  });

  it("allows unapproved creator returnTo for onboarding/settings/pending", () => {
    expect(getPostAuthPath("/onboarding", "creator", true, false)).toBe("/onboarding");
    expect(getPostAuthPath("/settings", "creator", true, false)).toBe("/settings");
    expect(getPostAuthPath("/pending-approval", "creator", true, false)).toBe("/pending-approval");
  });

  it("rejects protocol-relative returnTo", () => {
    expect(getPostAuthPath("//evil.com", "fan")).toBe("/feed");
  });

  it("checkout intent wins over onboarding and returnTo", () => {
    setCheckoutIntent({ creatorId: "c1", plan: "vip" });
    expect(getPostAuthPath(null, "fan", false)).toBe(
      "/creator/c1?openSubscribe=1&plan=vip"
    );
    expect(getPostAuthPath("/feed", "fan", false)).toBe(
      "/creator/c1?openSubscribe=1&plan=vip"
    );
  });

  it("checkout intent prefers handle path", () => {
    setCheckoutIntent({ creatorId: "c1", handle: "ana", plan: "fan" });
    expect(getPostAuthPath(null, "fan", false)).toBe(
      "/u/ana?openSubscribe=1&plan=fan"
    );
  });
});

describe("isSafeReturnPath", () => {
  it("allows internal paths only", () => {
    expect(isSafeReturnPath("/feed")).toBe(true);
    expect(isSafeReturnPath("//evil")).toBe(false);
    expect(isSafeReturnPath("https://evil.com")).toBe(false);
  });
});
