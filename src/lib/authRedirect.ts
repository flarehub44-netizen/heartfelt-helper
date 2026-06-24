export function getLoginPath(returnTo?: string): string {
  if (!returnTo || !isSafeReturnPath(returnTo)) return "/login";
  return `/login?returnTo=${encodeURIComponent(returnTo)}`;
}

export function isSafeReturnPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

export function getPostAuthPath(
  returnTo: string | null,
  role: string | undefined,
  fanOnboarded = true,
  creatorApproved = true
): string {
  if (returnTo && isSafeReturnPath(returnTo)) {
    return returnTo;
  }
  if (role === "creator") return creatorApproved ? "/dashboard" : "/pending-approval";
  if (!fanOnboarded) return "/fan-onboarding";
  return "/feed";
}
