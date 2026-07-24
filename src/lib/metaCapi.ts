import { SUPABASE_PROJECT_ID, SUPABASE_PUBLISHABLE_KEY } from "@/lib/env";
import { supabase } from "@/integrations/supabase/client";

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
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) return;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
    };

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
