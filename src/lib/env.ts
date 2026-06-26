// Centralized env with hardcoded fallbacks so the production build works
// even when Vite env vars are missing.
export const SUPABASE_PROJECT_ID =
  (import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined) ||
  "yqevjcrypxepzzbrmqhb";

export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  `https://${SUPABASE_PROJECT_ID}.supabase.co`;

export const SUPABASE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZXZqY3J5cHhlcHp6YnJtcWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwODM0MDUsImV4cCI6MjA5NzY1OTQwNX0.9kd19Mhm4G_1wjzjUAuW-QPCVA0tc7u_wbVUjve0rL8";
