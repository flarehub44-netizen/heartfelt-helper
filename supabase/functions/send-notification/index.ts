import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveUserEmail, sendTransactionalEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Server-to-server only. Require shared internal secret so anyone with
    // the public function URL cannot spam arbitrary users with emails.
    const expected = Deno.env.get("INTERNAL_FN_SECRET");
    if (!expected || req.headers.get("x-internal-secret") !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to_email, user_id, subject, body, template } = await req.json();

    if (!subject) {
      return new Response(JSON.stringify({ error: "subject required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let recipient = to_email as string | undefined;
    if (!recipient && user_id) {
      recipient = (await resolveUserEmail(supabase, user_id)) ?? undefined;
    }

    if (!recipient) {
      return new Response(JSON.stringify({ error: "to_email or valid user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sent = await sendTransactionalEmail(recipient, subject, body ?? "", template ?? "generic");

    await supabase.from("conversion_events").insert({
      event_name: "email_sent",
      user_id: user_id ?? null,
      metadata: { to_email: recipient, subject, template, sent },
    }).then(() => {}).catch(() => {});

    return new Response(JSON.stringify({ ok: true, sent, to: recipient }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
