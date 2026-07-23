import {
  checkoutIntentPath,
  peekCheckoutIntent,
  type CheckoutIntent,
} from "@/lib/checkoutIntent";

/** Paths an unapproved creator may still land on after auth. */
const CREATOR_PENDING_SAFE = new Set([
  "/pending-approval",
  "/onboarding",
  "/settings",
]);

export function getLoginPath(returnTo?: string): string {
  if (!returnTo || !isSafeReturnPath(returnTo)) return "/login";
  return `/login?returnTo=${encodeURIComponent(returnTo)}`;
}

export function getSignupPath(returnTo?: string): string {
  if (!returnTo || !isSafeReturnPath(returnTo)) return "/signup";
  return `/signup?returnTo=${encodeURIComponent(returnTo)}`;
}

export function isSafeReturnPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

function pathOnly(path: string): string {
  const q = path.indexOf("?");
  const h = path.indexOf("#");
  let end = path.length;
  if (q >= 0) end = Math.min(end, q);
  if (h >= 0) end = Math.min(end, h);
  return path.slice(0, end);
}

export function getPostAuthPath(
  returnTo: string | null,
  role: string | undefined,
  fanOnboarded = true,
  creatorApproved = true,
  intent: CheckoutIntent | null = peekCheckoutIntent()
): string {
  // Checkout intent wins over onboarding so guest → Assinar lands on Pix
  if (intent) {
    return checkoutIntentPath(intent);
  }

  // Unapproved creators always go to pending (unless returnTo is a prep route)
  if (role === "creator" && !creatorApproved) {
    if (returnTo && isSafeReturnPath(returnTo) && CREATOR_PENDING_SAFE.has(pathOnly(returnTo))) {
      return returnTo;
    }
    return "/pending-approval";
  }

  // Guest landing (/) must not bounce fans back to creator acquisition
  if (returnTo === "/" && role !== "creator") {
    return fanOnboarded ? "/feed" : "/fan-onboarding";
  }
  if (returnTo && isSafeReturnPath(returnTo)) {
    return returnTo;
  }
  if (role === "creator") return "/dashboard";
  if (!fanOnboarded) return "/fan-onboarding";
  return "/feed";
}
