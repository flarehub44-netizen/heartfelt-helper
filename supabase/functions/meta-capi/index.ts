import { createHash } from "node:crypto";
import { createClient } from "npm:@supabase/supabase-js@2";
import { timingSafeEqualString } from "../_shared/internalAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-meta-capi-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PIXEL_ID = "4782453005315337";
const API_VERSION = "v18.0";
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

async function sendToPixel(
  pixelId: string,
  accessToken: string,
  eventData: Record<string, unknown>,
): Promise<{ ok: boolean; result: unknown }> {
  const url = `https://graph.facebook.com/${API_VERSION}/${pixelId}/events?access_token=${accessToken}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [eventData] }),
  });
  const result = await response.json();
  return { ok: response.ok, result };
}

async function isAuthorized(req: Request): Promise<boolean> {
  const metaSecret = Deno.env.get("META_CAPI_SECRET") ?? "";
  const provided = req.headers.get("x-meta-capi-secret") ?? "";
  if (metaSecret && provided && timingSafeEqualString(provided, metaSecret)) {
    return true;
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (serviceKey && token && timingSafeEqualString(token, serviceKey)) {
    return true;
  }

  // Authenticated end-user JWT (reject anon / publishable keys as bearer)
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const publishableKey = Deno.env.get("SB_PUBLISHABLE_KEY") ?? "";
  if (
    !token ||
    (anonKey && timingSafeEqualString(token, anonKey)) ||
    (publishableKey && timingSafeEqualString(token, publishableKey))
  ) {
    return false;
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      anonKey || Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data, error } = await supabase.auth.getClaims(token);
    const sub = data?.claims?.sub;
    const role = data?.claims?.role;
    // Require a real user subject; reject anon role JWTs
    if (!error && typeof sub === "string" && sub.length > 0 && role !== "anon") {
      return true;
    }
  } catch {
    // fall through
  }

  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth before any skip/work — anon must never learn config state
  if (!(await isAuthorized(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const META_CAPI_TOKEN = Deno.env.get("META_CAPI_TOKEN");

  if (!META_CAPI_TOKEN) {
    return new Response(JSON.stringify({ skipped: true, reason: "META_CAPI_TOKEN not configured" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(clientIp)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const {
      event_name,
      user_email,
      value,
      currency,
      event_source_url,
      client_user_agent,
      client_ip_address,
      creator_pixel_id,
      creator_access_token,
    } = await req.json();

    if (!event_name) {
      return new Response(JSON.stringify({ error: "event_name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userData: Record<string, string> = {};

    if (user_email) {
      userData.em = hashEmail(user_email);
    }

    const ip = client_ip_address ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") || "";
    if (ip) userData.client_ip_address = ip;

    const ua = client_user_agent || req.headers.get("user-agent") || "";
    if (ua) userData.client_user_agent = ua;

    const eventData: Record<string, unknown> = {
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: crypto.randomUUID(),
      action_source: "website",
      user_data: userData,
    };

    if (event_source_url) {
      eventData.event_source_url = event_source_url;
    }

    if (value !== undefined) {
      eventData.custom_data = {
        value,
        currency: currency ?? "BRL",
      };
    }

    const platformResult = await sendToPixel(PIXEL_ID, META_CAPI_TOKEN, eventData);

    let creatorResult: unknown = null;
    if (creator_pixel_id && creator_access_token) {
      try {
        const creatorEventData = { ...eventData, event_id: crypto.randomUUID() };
        const cr = await sendToPixel(creator_pixel_id, creator_access_token, creatorEventData);
        creatorResult = cr.result;
      } catch (creatorErr) {
        console.error("Creator pixel error (non-fatal):", creatorErr);
        creatorResult = { error: String(creatorErr) };
      }
    }

    return new Response(JSON.stringify({ platform: platformResult.result, creator: creatorResult }), {
      status: platformResult.ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
