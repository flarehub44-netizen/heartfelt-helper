
-- Create affiliate_requests table
CREATE TABLE public.affiliate_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

-- Enable RLS
ALTER TABLE public.affiliate_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own request
CREATE POLICY "Users can view own affiliate request"
ON public.affiliate_requests FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own request
CREATE POLICY "Users can create affiliate request"
ON public.affiliate_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all affiliate requests"
ON public.affiliate_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins can update affiliate requests"
ON public.affiliate_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
