import { SUPABASE_PROJECT_ID, SUPABASE_PUBLISHABLE_KEY } from "@/lib/env";

interface MetaCapiEvent {
  event_name: string;
  user_email?: string;
  value?: number;
  currency?: string;
  creator_pixel_id?: string;
  creator_access_token?: string;
}

export async function sendMetaEvent(event: MetaCapiEvent): Promise<void> {
  try {
    const capiSecret = import.meta.env.VITE_META_CAPI_SECRET as string | undefined;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
    };
    if (capiSecret) headers["x-meta-capi-secret"] = capiSecret;

    await fetch(
      `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/meta-capi`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...event,
          client_user_agent: navigator.userAgent,
          event_source_url: window.location.href,
        }),
      }
    );
  } catch {
    // Fire-and-forget: never block the user flow
  }
}

