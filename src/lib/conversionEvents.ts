import { supabase } from "@/integrations/supabase/client";

export type ConversionEventName =
  | "profile_view"
  | "checkout_initiated"
  | "pix_generated"
  | "subscription_activated";

export async function trackConversion(
  eventName: ConversionEventName,
  options?: { creatorId?: string; metadata?: Record<string, unknown> }
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("conversion_events").insert({
      event_name: eventName,
      user_id: user?.id ?? null,
      creator_id: options?.creatorId ?? null,
      metadata: (options?.metadata ?? {}) as Record<string, never>,
    });
  } catch {
    // fire-and-forget
  }
}
