-- Persist fan onboarding across devices (was localStorage-only)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fan_onboarded boolean NOT NULL DEFAULT false;
