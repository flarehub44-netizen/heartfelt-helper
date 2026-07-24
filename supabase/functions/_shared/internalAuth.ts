/** Constant-time string equality for secrets. */
export function timingSafeEqualString(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  if (bufA.byteLength !== bufB.byteLength) {
    // Still compare to reduce length oracle timing on short paths
    const max = Math.max(bufA.byteLength, bufB.byteLength);
    let diff = bufA.byteLength ^ bufB.byteLength;
    for (let i = 0; i < max; i++) {
      const x = i < bufA.byteLength ? bufA[i] : 0;
      const y = i < bufB.byteLength ? bufB[i] : 0;
      diff |= x ^ y;
    }
    return false;
  }
  let diff = 0;
  for (let i = 0; i < bufA.byteLength; i++) {
    diff |= bufA[i] ^ bufB[i];
  }
  return diff === 0;
}

/**
 * Authorize internal/cron callers.
 * Accepts: Bearer <SUPABASE_SERVICE_ROLE_KEY> OR x-internal-secret == INTERNAL_FN_SECRET.
 * Fail-closed: if neither matches, unauthorized.
 */
export function assertInternalAuth(req: Request): boolean {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const internalSecret = Deno.env.get("INTERNAL_FN_SECRET") ?? "";

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (serviceKey && token && timingSafeEqualString(token, serviceKey)) {
    return true;
  }

  const provided =
    req.headers.get("x-internal-secret") ??
    req.headers.get("x-cron-secret") ??
    "";
  if (internalSecret && provided && timingSafeEqualString(provided, internalSecret)) {
    return true;
  }

  return false;
}

export function unauthorizedResponse(corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
