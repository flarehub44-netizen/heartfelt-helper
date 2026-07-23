-- Dedupe for abandoned checkout email reminders
ALTER TABLE public.pending_checkouts
  ADD COLUMN IF NOT EXISTS reminded_at timestamptz;

COMMENT ON COLUMN public.pending_checkouts.reminded_at IS
  'Set when subscription-reminders sends recovery email; prevents repeat spam.';
