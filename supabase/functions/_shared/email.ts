import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export async function resolveUserEmail(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return null;
  return data.user.email;
}

export async function sendTransactionalEmail(
  to: string,
  subject: string,
  body: string,
  template: string
): Promise<boolean> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM") ?? "Flare <noreply@flare.app>";

  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html: `<p>${body.replace(/\n/g, "<br>")}</p>`,
      }),
    });
    if (!res.ok) {
      console.error("Resend error:", await res.text());
      return false;
    }
    return true;
  }

  // Lovable Cloud Emails: log until provider is wired
  console.log("sendTransactionalEmail:", { to, subject, template, body: body.slice(0, 120) });
  return true;
}
