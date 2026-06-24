-- Fix RLS: pending_payments should NOT be accessible by regular users
-- The edge functions use service role which bypasses RLS entirely
DROP POLICY IF EXISTS "Service role full access" ON public.pending_payments;

-- No regular user policies needed - service role bypasses RLS
-- Just ensure RLS is enabled so regular users can't access it
