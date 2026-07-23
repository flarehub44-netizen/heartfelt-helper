import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

async function isAuthorized(req: Request): Promise<boolean> {
  const expected = Deno.env.get("INTERNAL_FN_SECRET");
  if (expected && req.headers.get("x-internal-secret") === expected) {
    return true;
  }
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return !!(token && serviceKey && token === serviceKey);
}

function defaultUrl(type?: string): string {
  switch (type) {
    case "renewal_reminder":
    case "subscription_expired":
      return "/subscriptions";
    case "creator_approved":
      return "/dashboard";
    case "checkout_abandoned":
      return "/subscriptions";
    case "subscription_activated":
      return "/subscriptions";
    case "creator_live":
      return "/discover";
    default:
      return "/";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!(await isAuthorized(req))) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const userId = body.user_id as string | undefined;
    const title = (body.title ?? body.subject) as string | undefined;
    const text = (body.body ?? "") as string;
    const type = body.type ?? body.template;
    const url = (body.url as string | undefined) ?? defaultUrl(type);

    if (!userId || !title) {
      return new Response(
        JSON.stringify({ error: "user_id and title/subject required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject =
      Deno.env.get("VAPID_SUBJECT") ?? "mailto:suporte@flare.app";

    if (!vapidPublic || !vapidPrivate) {
      console.warn("VAPID keys not configured — push skipped");
      return new Response(
        JSON.stringify({ ok: true, sent: 0, skipped: "no_vapid" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (error) throw error;
    if (!subs?.length) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, skipped: "no_subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title,
      body: text,
      url,
      type: type ?? "generic",
    });

    let sent = 0;
    const staleIds: string[] = [];

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
          sent++;
        } catch (e: unknown) {
          const statusCode =
            e && typeof e === "object" && "statusCode" in e
              ? Number((e as { statusCode: number }).statusCode)
              : 0;
          if (statusCode === 404 || statusCode === 410) {
            staleIds.push(sub.id);
          } else {
            console.error("web-push error:", e);
          }
        }
      })
    );

    if (staleIds.length) {
      await supabase.from("push_subscriptions").delete().in("id", staleIds);
    }

    return new Response(
      JSON.stringify({ ok: true, sent, removed: staleIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
