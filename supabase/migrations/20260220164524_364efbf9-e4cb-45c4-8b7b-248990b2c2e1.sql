
-- 1. platform_settings
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
  ON public.platform_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert settings"
  ON public.platform_settings FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update settings"
  ON public.platform_settings FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default affiliate fee rate
INSERT INTO public.platform_settings (key, value) VALUES ('affiliate_fee_rate', '0.05');

-- 2. affiliate_links
CREATE TABLE public.affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own affiliate links"
  ON public.affiliate_links FOR SELECT
  USING (auth.uid() = affiliate_id);

CREATE POLICY "Users can create affiliate links"
  ON public.affiliate_links FOR INSERT
  WITH CHECK (auth.uid() = affiliate_id);

CREATE POLICY "Admins can view all affiliate links"
  ON public.affiliate_links FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. affiliate_referrals
CREATE TABLE public.affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_link_id uuid NOT NULL REFERENCES public.affiliate_links(id),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id),
  commission_rate numeric NOT NULL,
  commission_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own referrals"
  ON public.affiliate_referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliate_links al
      WHERE al.id = affiliate_link_id AND al.affiliate_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all referrals"
  ON public.affiliate_referrals FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert referrals"
  ON public.affiliate_referrals FOR INSERT
  WITH CHECK (true);
