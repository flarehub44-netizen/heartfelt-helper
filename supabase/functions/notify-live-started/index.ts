import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const liveId = body.live_id as string | undefined;
    if (!liveId) {
      return new Response(JSON.stringify({ error: "live_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: live, error: liveErr } = await supabase
      .from("creator_lives")
      .select("id, creator_id, title, status")
      .eq("id", liveId)
      .maybeSingle();
    if (liveErr || !live) {
      return new Response(JSON.stringify({ error: "live not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (live.creator_id !== user.id) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (live.status !== "live") {
      return new Response(JSON.stringify({ ok: true, skipped: "not_live" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, handle")
      .eq("id", live.creator_id)
      .maybeSingle();

    const href =
      profile?.handle
        ? `/u/${profile.handle}/live/${live.id}`
        : `/creator/${live.creator_id}/live/${live.id}`;

    const { data: fans } = await supabase
      .from("subscriptions")
      .select("fan_id")
      .eq("creator_id", live.creator_id)
      .eq("active", true);

    const projectId = Deno.env.get("SUPABASE_URL")!.split(".")[0].split("//")[1];
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const internalSecret = Deno.env.get("INTERNAL_FN_SECRET") ?? "";

    let pushed = 0;
    for (const fan of fans ?? []) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      };
      if (internalSecret) headers["x-internal-secret"] = internalSecret;
      try {
        await fetch(`https://${projectId}.supabase.co/functions/v1/send-push`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            user_id: fan.fan_id,
            title: `${profile?.name ?? "Criador"} está ao vivo!`,
            body: live.title || "Entre agora para assistir",
            type: "creator_live",
            url: href,
          }),
        });
        pushed++;
      } catch (e) {
        console.error("push error", e);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, pushed, fans: fans?.length ?? 0, href }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("notify-live-started error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
