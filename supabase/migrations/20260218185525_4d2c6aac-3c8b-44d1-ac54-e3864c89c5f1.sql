
-- Add syncpay_id column to subscriptions table for tracking SyncPay transactions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS syncpay_id TEXT;

-- Create unique index to prevent duplicate activations from the same SyncPay transaction
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_syncpay_id_unique
  ON public.subscriptions (syncpay_id)
  WHERE syncpay_id IS NOT NULL;

-- Allow service role to insert subscriptions (needed for webhook activation)
-- The webhook runs as service role, bypassing RLS
-- Existing fan INSERT policy already allows fans to create their own subscriptions
-- We add a policy so the service role (webhook) can also insert
CREATE POLICY "Service role can insert subscriptions"
  ON public.subscriptions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update subscriptions"
  ON public.subscriptions
  FOR UPDATE
  TO service_role
  USING (true);
