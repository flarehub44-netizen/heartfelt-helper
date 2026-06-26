// Centralized env with fallbacks so production builds keep working even when
// Vite env vars are missing or serialized as literal "undefined"/"null".
const validEnv = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") return undefined;
  return trimmed;
};

export const SUPABASE_PROJECT_ID =
  validEnv(import.meta.env.VITE_SUPABASE_PROJECT_ID) ||
  "yqevjcrypxepzzbrmqhb";

export const SUPABASE_URL =
  validEnv(import.meta.env.VITE_SUPABASE_URL) ||
  `https://${SUPABASE_PROJECT_ID}.supabase.co`;

export const SUPABASE_PUBLISHABLE_KEY =
  validEnv(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  validEnv(import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZXZqY3J5cHhlcHp6YnJtcWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwODM0MDUsImV4cCI6MjA5NzY1OTQwNX0.9kd19Mhm4G_1wjzjUAuW-QPCVA0tc7u_wbVUjve0rL8";
