-- Normalize invalid plan_name values to match CHECK constraint (fan, superfan, vip)
UPDATE public.creator_plans
SET plan_name = CASE
  WHEN plan_name IN ('Fã', 'Fa', 'FA') THEN 'fan'
  WHEN plan_name IN ('Super Fã', 'Super Fa', 'Super FA') THEN 'superfan'
  WHEN plan_name = 'VIP' THEN 'vip'
  ELSE plan_name
END
WHERE plan_name NOT IN ('fan', 'superfan', 'vip');
