const SUPABASE_OBJECT_PATH = "/storage/v1/object/public/";
const SUPABASE_RENDER_PATH = "/storage/v1/render/image/public/";

interface TransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
}

function transformUrl(url: string, opts: TransformOptions): string {
  if (!url.includes(SUPABASE_OBJECT_PATH)) return url;
  const base = url.replace(SUPABASE_OBJECT_PATH, SUPABASE_RENDER_PATH);
  const params = new URLSearchParams();
  if (opts.width) params.set("width", String(opts.width));
  if (opts.height) params.set("height", String(opts.height));
  if (opts.quality) params.set("quality", String(opts.quality));
  if (opts.resize) params.set("resize", opts.resize);
  return `${base}?${params.toString()}`;
}

export function avatarUrl(url: string | null | undefined, size = 80): string {
  if (!url) return "/placeholder.svg";
  return transformUrl(url, { width: size, height: size, quality: 80, resize: "cover" });
}

export function coverUrl(url: string | null | undefined): string {
  if (!url) return "/placeholder.svg";
  return transformUrl(url, { width: 1200, quality: 85, resize: "cover" });
}

export function thumbUrl(url: string | null | undefined): string {
  if (!url) return "/placeholder.svg";
  return transformUrl(url, { width: 600, quality: 80, resize: "cover" });
}
