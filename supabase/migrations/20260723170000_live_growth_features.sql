-- Live go-live: notify on INSERT + UPDATE, enrich href, chat RLS, stats, gifts→BRL, tickets/VOD, moderation

-- ---------------------------------------------------------------------------
-- 1) notify_live_started: INSERT or transition to live
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_live_started()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_name text;
  v_handle text;
  v_href text;
  r record;
  v_was_live boolean := false;
BEGIN
  IF NEW.status IS DISTINCT FROM 'live' THEN
    RETURN NEW;
  END IF;

  -- UPDATE path: only when transitioning TO live
  IF TG_OP = 'UPDATE' THEN
    v_was_live := (OLD.status = 'live');
    IF v_was_live THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT name, handle INTO v_creator_name, v_handle
  FROM public.profiles WHERE id = NEW.creator_id;

  IF v_handle IS NOT NULL AND length(trim(v_handle)) > 0 THEN
    v_href := '/u/' || trim(v_handle) || '/live/' || NEW.id::text;
  ELSE
    v_href := '/creator/' || NEW.creator_id::text || '/live/' || NEW.id::text;
  END IF;

  FOR r IN
    SELECT fan_id
    FROM public.subscriptions
    WHERE creator_id = NEW.creator_id
      AND active = true
      AND (expires_at IS NULL OR expires_at > now())
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      r.fan_id,
      'creator_live',
      COALESCE(v_creator_name, 'Criador') || ' está ao vivo agora!',
      COALESCE(NEW.title, 'Clique para assistir'),
      jsonb_build_object(
        'creator_id', NEW.creator_id,
        'live_id', NEW.id,
        'handle', v_handle,
        'href', v_href
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_started_notification ON public.creator_lives;
DROP TRIGGER IF EXISTS trg_live_started_notification_insert ON public.creator_lives;

CREATE TRIGGER trg_live_started_notification
  AFTER UPDATE OF status ON public.creator_lives
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_live_started();

CREATE TRIGGER trg_live_started_notification_insert
  AFTER INSERT ON public.creator_lives
  FOR EACH ROW
  WHEN (NEW.status = 'live')
  EXECUTE FUNCTION public.notify_live_started();

-- ---------------------------------------------------------------------------
-- 2) Live session stats + peak viewers
-- ---------------------------------------------------------------------------
ALTER TABLE public.creator_lives
  ADD COLUMN IF NOT EXISTS peak_viewers integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gifts_total_coins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS ticket_price_coins integer NOT NULL DEFAULT 0 CHECK (ticket_price_coins >= 0),
  ADD COLUMN IF NOT EXISTS vod_url text,
  ADD COLUMN IF NOT EXISTS vod_min_plan text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS goal_coins integer NOT NULL DEFAULT 0 CHECK (goal_coins >= 0),
  ADD COLUMN IF NOT EXISTS ingest_mode text NOT NULL DEFAULT 'mesh'
    CHECK (ingest_mode IN ('mesh', 'sfu'));

CREATE TABLE IF NOT EXISTS public.live_ticket_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id uuid NOT NULL REFERENCES public.creator_lives(id) ON DELETE CASCADE,
  fan_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coins_spent integer NOT NULL CHECK (coins_spent > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (live_id, fan_id)
);

ALTER TABLE public.live_ticket_unlocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Fans view own live tickets" ON public.live_ticket_unlocks;
CREATE POLICY "Fans view own live tickets"
  ON public.live_ticket_unlocks FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = fan_id OR (SELECT auth.uid()) = (
    SELECT creator_id FROM public.creator_lives WHERE id = live_id
  ));
GRANT SELECT ON public.live_ticket_unlocks TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Chat RLS aligned to min_plan + moderation columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.live_chat_messages
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id);

CREATE OR REPLACE FUNCTION public.can_access_live_chat(p_live_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.creator_lives l
    WHERE l.id = p_live_id
      AND (
        l.creator_id = auth.uid()
        OR COALESCE(l.min_plan, 'free') = 'free'
        OR EXISTS (
          SELECT 1 FROM public.subscriptions s
          WHERE s.fan_id = auth.uid()
            AND s.creator_id = l.creator_id
            AND s.active = true
            AND (s.expires_at IS NULL OR s.expires_at > now())
            AND public.plan_rank(s.plan) >= public.plan_rank(l.min_plan)
        )
        OR (
          COALESCE(l.ticket_price_coins, 0) > 0
          AND EXISTS (
            SELECT 1 FROM public.live_ticket_unlocks t
            WHERE t.live_id = l.id AND t.fan_id = auth.uid()
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_live_chat(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_live_chat(uuid) TO authenticated, anon;

DROP POLICY IF EXISTS "auth_insert_live_chat" ON public.live_chat_messages;
DROP POLICY IF EXISTS "anyone_read_live_chat" ON public.live_chat_messages;

CREATE POLICY "plan_gated_insert_live_chat"
  ON public.live_chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_access_live_chat(live_id)
  );

CREATE POLICY "plan_gated_read_live_chat"
  ON public.live_chat_messages FOR SELECT TO authenticated
  USING (
    public.can_access_live_chat(live_id)
    AND deleted_at IS NULL
  );

CREATE POLICY "anon_cannot_read_live_chat"
  ON public.live_chat_messages FOR SELECT TO anon
  USING (false);

CREATE POLICY "host_or_author_soft_delete_chat"
  ON public.live_chat_messages FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() = (SELECT creator_id FROM public.creator_lives WHERE id = live_id)
  )
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() = (SELECT creator_id FROM public.creator_lives WHERE id = live_id)
  );

-- ---------------------------------------------------------------------------
-- 4) Bump gift totals on send (hook into existing send_live_gift via trigger)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_live_gift_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost integer;
BEGIN
  SELECT cost INTO v_cost FROM public.gifts WHERE id = NEW.gift_id;
  UPDATE public.creator_lives
  SET gifts_total_coins = COALESCE(gifts_total_coins, 0) + COALESCE(v_cost, 0)
  WHERE id = NEW.live_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_gift_totals ON public.live_gifts;
CREATE TRIGGER trg_live_gift_totals
  AFTER INSERT ON public.live_gifts
  FOR EACH ROW
  EXECUTE FUNCTION public.on_live_gift_received();

-- ---------------------------------------------------------------------------
-- 5) Convert live gift coins → BRL earnings (platform rate from settings or 0.01)
-- ---------------------------------------------------------------------------
INSERT INTO public.platform_settings (key, value)
VALUES ('coin_to_brl_rate', '0.10')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.convert_live_gifts_to_brl(p_live_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_creator uuid;
  v_coins integer;
  v_rate numeric;
  v_gross numeric;
  v_ref text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT creator_id, COALESCE(gifts_total_coins, 0)
  INTO v_creator, v_coins
  FROM public.creator_lives WHERE id = p_live_id;

  IF v_creator IS NULL THEN RAISE EXCEPTION 'live not found'; END IF;
  IF v_creator IS DISTINCT FROM v_uid AND NOT public.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_coins <= 0 THEN RETURN 0; END IF;

  SELECT COALESCE(NULLIF(value, '')::numeric, 0.10) INTO v_rate
  FROM public.platform_settings WHERE key = 'coin_to_brl_rate';
  IF v_rate IS NULL OR v_rate <= 0 THEN v_rate := 0.10; END IF;

  v_gross := round(v_coins * v_rate, 2);
  v_ref := 'live_gifts:' || p_live_id::text;

  PERFORM public.credit_creator_earning(
    v_creator, 'bonus', v_gross, 'live_gifts', v_ref,
    'Conversão de presentes da live', 0.20
  );

  RETURN v_gross;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_live_gifts_to_brl(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_live_gifts_to_brl(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) Ticket unlock for PPV lives
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unlock_live_ticket(p_live_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fan uuid := auth.uid();
  v_price integer;
  v_creator uuid;
  v_balance integer;
BEGIN
  IF v_fan IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT ticket_price_coins, creator_id INTO v_price, v_creator
  FROM public.creator_lives WHERE id = p_live_id;
  IF v_creator IS NULL THEN RAISE EXCEPTION 'live not found'; END IF;
  IF v_fan = v_creator THEN RETURN true; END IF;
  IF COALESCE(v_price, 0) <= 0 THEN RETURN true; END IF;

  IF EXISTS (SELECT 1 FROM public.live_ticket_unlocks WHERE live_id = p_live_id AND fan_id = v_fan) THEN
    RETURN true;
  END IF;

  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_fan FOR UPDATE;
  IF COALESCE(v_balance, 0) < v_price THEN
    RAISE EXCEPTION 'Saldo de moedas insuficiente';
  END IF;

  UPDATE public.wallets SET balance = balance - v_price, updated_at = now() WHERE user_id = v_fan;
  INSERT INTO public.wallets (user_id, balance) VALUES (v_creator, v_price)
  ON CONFLICT (user_id) DO UPDATE SET balance = public.wallets.balance + EXCLUDED.balance, updated_at = now();

  INSERT INTO public.coin_transactions (user_id, amount, type, ref_type, ref_id, description) VALUES
    (v_fan, -v_price, 'ppv_spent', 'live_ticket', p_live_id::text, 'Ingresso de live'),
    (v_creator, v_price, 'ppv_received', 'live_ticket', v_fan::text, 'Ingresso de live');

  INSERT INTO public.live_ticket_unlocks (live_id, fan_id, coins_spent)
  VALUES (p_live_id, v_fan, v_price);

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.unlock_live_ticket(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unlock_live_ticket(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7) Update peak viewers (host/client reports)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.report_live_viewers(p_live_id uuid, p_viewers integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_peak integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.creator_lives WHERE id = p_live_id AND creator_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.creator_lives
  SET peak_viewers = GREATEST(COALESCE(peak_viewers, 0), GREATEST(COALESCE(p_viewers, 0), 0))
  WHERE id = p_live_id
  RETURNING peak_viewers INTO v_peak;

  RETURN COALESCE(v_peak, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.report_live_viewers(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_live_viewers(uuid, integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8) Soft-delete chat message
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.moderate_live_chat(p_message_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_live uuid;
  v_author uuid;
  v_creator uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT live_id, user_id INTO v_live, v_author FROM public.live_chat_messages WHERE id = p_message_id;
  IF v_live IS NULL THEN RAISE EXCEPTION 'message not found'; END IF;
  SELECT creator_id INTO v_creator FROM public.creator_lives WHERE id = v_live;
  IF v_uid IS DISTINCT FROM v_author AND v_uid IS DISTINCT FROM v_creator THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.live_chat_messages
  SET deleted_at = now(), deleted_by = v_uid
  WHERE id = p_message_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_live_chat(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.moderate_live_chat(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 9) Live summary for creator
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_live_summary(p_live_id uuid)
RETURNS TABLE (
  peak_viewers integer,
  gifts_total_coins integer,
  gift_count bigint,
  new_subscribers bigint,
  chat_messages bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.peak_viewers,
    l.gifts_total_coins,
    (SELECT COUNT(*) FROM public.live_gifts g WHERE g.live_id = l.id),
    (
      SELECT COUNT(*) FROM public.subscriptions s
      WHERE s.creator_id = l.creator_id
        AND s.created_at >= l.created_at
        AND s.created_at <= COALESCE(l.scheduled_at, now()) + interval '6 hours'
    ),
    (SELECT COUNT(*) FROM public.live_chat_messages m WHERE m.live_id = l.id AND m.deleted_at IS NULL)
  FROM public.creator_lives l
  WHERE l.id = p_live_id
    AND (l.creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
$$;

REVOKE ALL ON FUNCTION public.get_live_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_live_summary(uuid) TO authenticated;

-- Enable realtime for live_gifts if not already
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.live_gifts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
