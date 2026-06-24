import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SIGN_TTL = 60 * 60; // 1 hour

export interface SignedMediaTransform {
  width?: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
}

interface CacheEntry {
  url: string;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();

const cacheKey = (path: string, t?: SignedMediaTransform) =>
  t ? `${path}|${t.width ?? ""}x${t.height ?? ""}|${t.quality ?? ""}|${t.resize ?? ""}` : path;

/**
 * Extracts the storage path from either a stored path (e.g. "uid/123.jpg")
 * or a legacy public/signed URL pointing to the `content` bucket.
 */
export function extractContentPath(input: string | null | undefined): string | null {
  if (!input) return null;
  const pub = "/object/public/content/";
  const i1 = input.indexOf(pub);
  if (i1 !== -1) return input.slice(i1 + pub.length).split("?")[0];
  const sign = "/object/sign/content/";
  const i2 = input.indexOf(sign);
  if (i2 !== -1) return input.slice(i2 + sign.length).split("?")[0];
  if (!input.startsWith("http")) return input;
  return null;
}

export function useSignedMediaUrl(
  input: string | null | undefined,
  transform?: SignedMediaTransform,
): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const tKey = transform
    ? `${transform.width ?? ""}x${transform.height ?? ""}|${transform.quality ?? ""}|${transform.resize ?? ""}`
    : "";

  useEffect(() => {
    let active = true;
    const path = extractContentPath(input);
    if (!path) {
      setUrl(input ?? null);
      return;
    }
    const key = cacheKey(path, transform);
    const cached = cache.get(key);
    const now = Date.now();
    if (cached && cached.expiresAt > now + 30_000) {
      setUrl(cached.url);
      return;
    }
    supabase.storage
      .from("content")
      .createSignedUrl(path, SIGN_TTL, transform ? { transform } : undefined)
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data?.signedUrl) {
          setUrl(null);
          return;
        }
        cache.set(key, { url: data.signedUrl, expiresAt: now + SIGN_TTL * 1000 });
        setUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, tKey]);

  return url;
}
