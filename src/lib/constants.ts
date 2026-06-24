export const PLATFORM_FEE_RATE = 0.20;
export const AFFILIATE_FEE_KEY = "affiliate_fee_rate";

/**
 * When true, the Pix flow uses the local mock (no real charge).
 * Toggle via `VITE_PAYMENTS_MOCK=true` in `.env`.
 * SyncPay remains the default when unset.
 */
export const PAYMENTS_MOCK = import.meta.env.VITE_PAYMENTS_MOCK === "true";
