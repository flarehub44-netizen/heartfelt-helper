/**

 * Default deep-link path for push notification types (mirrors send-push).

 * Always prefers an explicit `url` from the sender (e.g. subscribePath / live path).

 *

 * Optional `data` enriches context when the sender only passed type + ids.

 */

export function pushDeepLink(

  type?: string,

  url?: string | null,

  data?: {

    creator_id?: string | null;

    handle?: string | null;

    creator_handle?: string | null;

    live_id?: string | null;

    plan?: string | null;

  } | null,

): string {

  if (url) return url;



  const creatorId = data?.creator_id ?? null;

  const handle = (data?.handle || data?.creator_handle || "").replace(/^@/, "").trim() || null;

  const liveId = data?.live_id ?? null;

  const plan = data?.plan ?? null;



  switch (type) {

    case "renewal_reminder":

    case "subscription_expired":

      if (creatorId) {

        const qs = new URLSearchParams({ openSubscribe: "1" });

        if (plan) qs.set("plan", plan);

        return handle

          ? `/u/${handle}?${qs}`

          : `/creator/${creatorId}?${qs}`;

      }

      return "/subscriptions";

    case "creator_approved":

      return "/dashboard";

    case "checkout_abandoned":

      if (creatorId) {

        const qs = new URLSearchParams({ openSubscribe: "1" });

        if (plan) qs.set("plan", plan);

        return handle

          ? `/u/${handle}?${qs}`

          : `/creator/${creatorId}?${qs}`;

      }

      return "/subscriptions";

    case "subscription_activated":

      return "/subscriptions";

    case "creator_live":

      if (creatorId && liveId) {

        return handle

          ? `/u/${handle}/live/${liveId}`

          : `/creator/${creatorId}/live/${liveId}`;

      }

      if (creatorId) {

        return handle ? `/u/${handle}?tab=Lives` : `/creator/${creatorId}?tab=Lives`;

      }

      return "/discover";

    default:

      return "/";

  }

}

