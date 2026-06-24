
-- Tighten EXECUTE on SECURITY DEFINER functions flagged by linter.
-- Strategy:
--  * Revoke from anon for any function that requires an authenticated user.
--  * Revoke from anon+authenticated (and grant only service_role) for admin-only
--    or internal helpers. Admin RPCs still need to be callable by signed-in
--    admins, so they stay GRANTed to authenticated (the has_role check inside
--    enforces actual admin access).

-- ---- Auth-required user actions: revoke anon ----
REVOKE EXECUTE ON FUNCTION public.accept_age_and_terms()                          FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_subscription(uuid)                       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.daily_check_in()                                FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_welcome_bonus()                           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_checkout_abandoned(uuid,uuid,text,numeric,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.send_renewal_reminder(uuid)                     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.send_live_gift(uuid,uuid)                       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tip_with_coins(uuid,integer,text)               FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.unlock_post_with_coins(uuid)                    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.track_post_view(uuid)                           FROM PUBLIC, anon;

-- Authenticated read helpers used by app while logged in
REVOKE EXECUTE ON FUNCTION public.can_message_creator(uuid)                       FROM PUBLIC, anon;

-- ---- Admin-only RPCs: revoke from anon (authenticated stays; has_role gate inside) ----
REVOKE EXECUTE ON FUNCTION public.admin_ban_user(uuid)                            FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_post(uuid)                         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_creator_stats()                       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_rate_limit_logs(integer)                    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_platform_health()                           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_creator_monthly_revenue(uuid)               FROM PUBLIC, anon;

-- ---- Internal helpers (only callable from edge functions w/ service role) ----
REVOKE EXECUTE ON FUNCTION public.credit_coins(uuid,integer,text,uuid,text)       FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.credit_coins(uuid,integer,text,uuid,text)       TO service_role;
