/**
 * Live ingest modes.
 * - mesh: current browser WebRTC mesh (NativeLivePlayer) — good for small audiences
 * - sfu: reserved for LiveKit / Cloudflare Calls / Mux when TURN+SFU is provisioned
 *
 * Set VITE_LIVE_SFU_URL when an SFU room endpoint is available; the player
 * currently runs mesh and surfaces ingest_mode in the host HUD.
 */
export type LiveIngestMode = "mesh" | "sfu";

export const DEFAULT_LIVE_INGEST: LiveIngestMode = "mesh";

export function resolveLiveIngestMode(stored?: string | null): LiveIngestMode {
  if (stored === "sfu" && import.meta.env.VITE_LIVE_SFU_URL) return "sfu";
  return "mesh";
}
