/** Canonical public profile path — prefers /u/:handle. */
export function creatorProfilePath(
  creatorId: string,
  handle?: string | null,
  search?: string | Record<string, string>
): string {
  const h = handle?.replace(/^@/, "").trim();
  const base = h ? `/u/${h}` : `/creator/${creatorId}`;
  if (!search) return base;
  const qs =
    typeof search === "string"
      ? search.replace(/^\?/, "")
      : new URLSearchParams(search).toString();
  return qs ? `${base}?${qs}` : base;
}

export function creatorAbsoluteUrl(
  origin: string,
  creatorId: string,
  handle?: string | null
): string {
  return `${origin}${creatorProfilePath(creatorId, handle)}`;
}

/** Canonical live watch URL. */
export function creatorLivePath(
  creatorId: string,
  liveId: string,
  handle?: string | null
): string {
  const h = handle?.replace(/^@/, "").trim();
  if (h) return `/u/${h}/live/${liveId}`;
  return `/creator/${creatorId}/live/${liveId}`;
}

/** Profile tab deep-link that opens the Lives tab (and optional live). */
export function creatorLivesTabPath(
  creatorId: string,
  handle?: string | null,
  liveId?: string | null
): string {
  const params: Record<string, string> = { tab: "Lives" };
  if (liveId) params.live = liveId;
  return creatorProfilePath(creatorId, handle, params);
}
