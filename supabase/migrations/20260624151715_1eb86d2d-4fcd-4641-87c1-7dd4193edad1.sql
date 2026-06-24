
-- ============================================================
-- Security hardening migration
-- ============================================================

-- ---------- 1. affiliate_referrals: restrict INSERT to service_role ----------
DROP POLICY IF EXISTS "Service role can insert referrals" ON public.affiliate_referrals;
CREATE POLICY "Service role can insert referrals"
  ON public.affiliate_referrals
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ---------- 2. pending_payments: explicit INSERT/UPDATE/DELETE/SELECT policies (service_role only) ----------
DROP POLICY IF EXISTS "Service role manages pending payments" ON public.pending_payments;
CREATE POLICY "Service role manages pending payments"
  ON public.pending_payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------- 3. creator_lives: gate stream_url behind tier ----------
DROP POLICY IF EXISTS "Anyone can view lives" ON public.creator_lives;

-- Public metadata view (no stream_url)
CREATE OR REPLACE VIEW public.creator_lives_public AS
SELECT id, creator_id, title, description, thumbnail_url,
       scheduled_at, status, min_plan, created_at
FROM public.creator_lives;

GRANT SELECT ON public.creator_lives_public TO anon, authenticated;

-- Only the creator or a qualifying subscriber may read full row (incl. stream_url)
CREATE POLICY "Creator or qualifying subscriber can view live"
  ON public.creator_lives
  FOR SELECT
  TO authenticated
  USING (
    creator_id = auth.uid()
    OR min_plan = 'free'
    OR EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.fan_id = auth.uid()
        AND s.creator_id = creator_lives.creator_id
        AND s.active = true
        AND (s.expires_at IS NULL OR s.expires_at > now())
        AND public.plan_rank(s.plan) >= public.plan_rank(creator_lives.min_plan)
    )
  );

-- Free lives still visible to anon (no stream_url leakage since min_plan='free' lives are intended public)
CREATE POLICY "Anon can view free lives"
  ON public.creator_lives
  FOR SELECT
  TO anon
  USING (min_plan = 'free');

-- ---------- 4. post_comments: gate SELECT behind post access ----------
DROP POLICY IF EXISTS "Authenticated can view comments" ON public.post_comments;
CREATE POLICY "Users can view comments on accessible posts"
  ON public.post_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_comments.post_id
        AND (
          p.min_plan = 'free'
          OR p.creator_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.subscriptions s
            WHERE s.fan_id = auth.uid()
              AND s.creator_id = p.creator_id
              AND s.active = true
              AND (s.expires_at IS NULL OR s.expires_at > now())
              AND public.plan_rank(s.plan) >= public.plan_rank(p.min_plan)
          )
        )
    )
  );

-- ---------- 5. Storage: drop broad listing policies on public buckets ----------
-- Files remain accessible via direct public URLs; listing via API is removed.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Cover images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Covers are publicly accessible" ON storage.objects;

-- ---------- 6. Fix function search_path on functions missing it ----------
ALTER FUNCTION public.plan_rank(text) SET search_path = public;
ALTER FUNCTION public.track_post_view(uuid) SET search_path = public;
ALTER FUNCTION public.get_creator_post_stats(uuid) SET search_path = public;
ALTER FUNCTION public.notify_comment_reply() SET search_path = public;

-- ---------- 7. Revoke EXECUTE on SECURITY DEFINER functions from anon/public ----------
-- Trigger-only functions: revoke from everyone except service_role
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_subscription() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_subscription_expired() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_new_post() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_live_started() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_comment_reply() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_post_likes() FROM PUBLIC, anon, authenticated;

-- Admin-only RPCs: revoke from anon, keep authenticated (function self-checks role)
REVOKE ALL ON FUNCTION public.admin_delete_post(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_post(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_ban_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_ban_user(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_admin_creator_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_creator_stats() TO authenticated;

REVOKE ALL ON FUNCTION public.get_platform_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO authenticated;

REVOKE ALL ON FUNCTION public.get_creator_monthly_revenue(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_creator_monthly_revenue(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_creator_post_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_creator_post_stats(uuid) TO authenticated;

-- Authenticated-only RPCs: revoke from anon
REVOKE ALL ON FUNCTION public.cancel_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_subscription(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.send_renewal_reminder(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_renewal_reminder(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.record_checkout_abandoned(uuid, uuid, text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_checkout_abandoned(uuid, uuid, text, numeric, text) TO authenticated;

REVOKE ALL ON FUNCTION public.track_post_view(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.track_post_view(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.can_message_creator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_message_creator(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.can_view_post_media(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_post_media(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.get_feed_posts(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_feed_posts(integer) TO authenticated;

REVOKE ALL ON FUNCTION public.get_feed_posts(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_feed_posts(integer, integer) TO authenticated;

-- Public-friendly RPCs (explore page): keep anon + authenticated
REVOKE ALL ON FUNCTION public.get_creator_list(integer, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_creator_list(integer, integer, text, text) TO anon, authenticated;
