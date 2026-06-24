import { describe, it, expect } from "vitest";
import { getLoginPath, getPostAuthPath, isSafeReturnPath } from "@/lib/authRedirect";

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

describe("getPostAuthPath", () => {
  it("prefers safe returnTo", () => {
    expect(getPostAuthPath("/creator/1", "fan")).toBe("/creator/1");
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

  it("returnTo takes precedence over approval status", () => {
    expect(getPostAuthPath("/discover", "creator", true, false)).toBe("/discover");
  });

  it("rejects protocol-relative returnTo", () => {
    expect(getPostAuthPath("//evil.com", "fan")).toBe("/feed");
  });
});

describe("isSafeReturnPath", () => {
  it("allows internal paths only", () => {
    expect(isSafeReturnPath("/feed")).toBe(true);
    expect(isSafeReturnPath("//evil")).toBe(false);
    expect(isSafeReturnPath("https://evil.com")).toBe(false);
  });
});
