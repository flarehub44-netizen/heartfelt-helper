import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SIGN_TTL = 60 * 60; // 1 hour
const cache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Extracts the storage path from either a stored path (e.g. "uid/123.jpg")
 * or a legacy public URL pointing to the `content` bucket.
 */
export function extractContentPath(input: string | null | undefined): string | null {
  if (!input) return null;
  const marker = "/object/public/content/";
  const idx = input.indexOf(marker);
  if (idx !== -1) return input.slice(idx + marker.length);
  const marker2 = "/object/sign/content/";
  const idx2 = input.indexOf(marker2);
  if (idx2 !== -1) {
    // strip query string and return path
    return input.slice(idx2 + marker2.length).split("?")[0];
  }
  // already a path
  if (!input.startsWith("http")) return input;
  return null;
}

export function useSignedMediaUrl(input: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const path = extractContentPath(input);
    if (!path) {
      setUrl(input ?? null);
      return;
    }
    const cached = cache.get(path);
    const now = Date.now();
    if (cached && cached.expiresAt > now + 30_000) {
      setUrl(cached.url);
      return;
    }
    supabase.storage
      .from("content")
      .createSignedUrl(path, SIGN_TTL)
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data?.signedUrl) {
          setUrl(null);
          return;
        }
        cache.set(path, {
          url: data.signedUrl,
          expiresAt: now + SIGN_TTL * 1000,
        });
        setUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [input]);

  return url;
}
