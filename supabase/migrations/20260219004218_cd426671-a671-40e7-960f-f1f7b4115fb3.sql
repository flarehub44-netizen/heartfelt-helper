-- Create pending_payments table to link SyncPay transaction IDs to fan/creator
CREATE TABLE IF NOT EXISTS public.pending_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  syncpay_id text NOT NULL UNIQUE,
  fan_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  plan text NOT NULL,
  amount numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_payments ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (webhook uses service role)
CREATE POLICY "Service role full access"
  ON public.pending_payments
  FOR ALL
  USING (true)
  WITH CHECK (true);
