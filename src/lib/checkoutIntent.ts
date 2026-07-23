const STORAGE_KEY = "checkout_intent";
const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours

export type CheckoutIntent = {
  creatorId: string;
  /** Canonical public handle when known — preferred in deep links. */
  handle?: string;
  plan?: string;
  amount?: number;
  createdAt: number;
};

function canUseSession(): boolean {
  return typeof sessionStorage !== "undefined";
}

function canUseLocal(): boolean {
  return typeof localStorage !== "undefined";
}

function writeBoth(payload: CheckoutIntent): void {
  const raw = JSON.stringify(payload);
  try {
    if (canUseSession()) sessionStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // ignore quota / private mode
  }
  try {
    if (canUseLocal()) localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // ignore
  }
}

function readRaw(): string | null {
  try {
    if (canUseSession()) {
      const fromSession = sessionStorage.getItem(STORAGE_KEY);
      if (fromSession) return fromSession;
    }
  } catch {
    // ignore
  }
  try {
    if (canUseLocal()) return localStorage.getItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return null;
}

export function setCheckoutIntent(intent: {
  creatorId: string;
  handle?: string | null;
  plan?: string;
  amount?: number;
}): void {
  if (!intent.creatorId) return;
  const payload: CheckoutIntent = {
    creatorId: intent.creatorId,
    handle: intent.handle?.replace(/^@/, "") || undefined,
    plan: intent.plan,
    amount: intent.amount,
    createdAt: Date.now(),
  };
  writeBoth(payload);
}

export function peekCheckoutIntent(): CheckoutIntent | null {
  const raw = readRaw();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CheckoutIntent;
    if (!parsed?.creatorId || typeof parsed.createdAt !== "number") {
      clearCheckoutIntent();
      return null;
    }
    if (Date.now() - parsed.createdAt > MAX_AGE_MS) {
      clearCheckoutIntent();
      return null;
    }
    // Rehydrate session from localStorage so same-tab auth redirect still works
    if (canUseSession() && !sessionStorage.getItem(STORAGE_KEY)) {
      try {
        sessionStorage.setItem(STORAGE_KEY, raw);
      } catch {
        // ignore
      }
    }
    return parsed;
  } catch {
    clearCheckoutIntent();
    return null;
  }
}

export function clearCheckoutIntent(): void {
  try {
    if (canUseSession()) sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  try {
    if (canUseLocal()) localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Path to resume subscribe modal after auth — prefers /u/:handle. */
export function checkoutIntentPath(intent: CheckoutIntent): string {
  const params = new URLSearchParams({ openSubscribe: "1" });
  if (intent.plan) params.set("plan", intent.plan);
  const qs = params.toString();
  if (intent.handle) {
    return `/u/${intent.handle}?${qs}`;
  }
  return `/creator/${intent.creatorId}?${qs}`;
}

/** Build subscribe deep link from creator id + optional handle. */
export function subscribePath(
  creatorId: string,
  opts?: { handle?: string | null; plan?: string }
): string {
  const params = new URLSearchParams({ openSubscribe: "1" });
  if (opts?.plan) params.set("plan", opts.plan);
  const qs = params.toString();
  const handle = opts?.handle?.replace(/^@/, "");
  if (handle) return `/u/${handle}?${qs}`;
  return `/creator/${creatorId}?${qs}`;
}
