// Server-side watermark for uploaded images in the private `content` bucket.
// Adds a diagonal repeating watermark with the creator's @handle + a short
// post/upload ID + platform mark. Runs after upload, overwrites the object.
//
// Notes:
// - Fan-specific watermarks cannot be baked at upload time (fan is unknown).
//   This bakes a permanent creator/platform mark as a deterrent against reposts.
// - Videos are not processed here (ffmpeg is too heavy for edge runtime).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import Jimp from "npm:jimp@0.22.12";
import { Buffer } from "node:buffer";
import { z } from "npm:zod@3.23.8";

const BodySchema = z.object({
  path: z.string().min(1).max(512),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return json({ error: "unauthorized" }, 401);
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "unauthorized" }, 401);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const { path } = parsed.data;

    // Enforce path ownership: `${user.id}/...`
    if (!path.startsWith(`${user.id}/`)) {
      return json({ error: "forbidden path" }, 403);
    }

    const admin = createClient(url, service);

    // Fetch handle for watermark
    const { data: profile } = await admin
      .from("profiles")
      .select("handle, name")
      .eq("id", user.id)
      .maybeSingle();
    const handle = profile?.handle || profile?.name || "flare";

    // Download original
    const { data: blob, error: dlErr } = await admin.storage
      .from("content")
      .download(path);
    if (dlErr || !blob) return json({ error: "download failed" }, 500);

    const inputBuf = Buffer.from(await blob.arrayBuffer());

    // Only process images
    const lower = path.toLowerCase();
    const isImage =
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".png") ||
      lower.endsWith(".webp");
    if (!isImage) {
      return json({ ok: true, skipped: true, reason: "not an image" });
    }

    const img = await Jimp.read(inputBuf);
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

    const shortId = path.split("/").pop()?.split(".")[0]?.slice(-6) ?? "";
    const text = `@${handle} · flare.app · ${shortId}`;

    // Repeating diagonal watermark, low opacity via alpha overlay
    const overlay = new Jimp(img.bitmap.width, img.bitmap.height, 0x00000000);
    const stepX = 380;
    const stepY = 220;
    for (let y = -stepY; y < img.bitmap.height + stepY; y += stepY) {
      for (let x = -stepX; x < img.bitmap.width + stepX; x += stepX) {
        overlay.print(font, x, y, text);
      }
    }
    overlay.rotate(-25, false);
    overlay.opacity(0.28);

    img.composite(overlay, 0, 0);

    // Bottom-right stamp (higher opacity)
    const stampFont = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
    const stampText = `@${handle} · flare.app`;
    img.print(
      stampFont,
      Math.max(10, img.bitmap.width - 260),
      Math.max(10, img.bitmap.height - 30),
      stampText,
    );

    const outMime = lower.endsWith(".png") ? Jimp.MIME_PNG : Jimp.MIME_JPEG;
    const outBuf = await img.getBufferAsync(outMime);

    const { error: upErr } = await admin.storage
      .from("content")
      .upload(path, outBuf, {
        upsert: true,
        contentType: outMime,
      });
    if (upErr) return json({ error: upErr.message }, 500);

    return json({ ok: true, path });
  } catch (e) {
    console.error("watermark-image error", e);
    return json({ error: (e as Error).message ?? "error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
