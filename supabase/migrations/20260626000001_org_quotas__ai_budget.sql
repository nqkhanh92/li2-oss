-- Per-org override for the agent monthly spend cap.
-- NULL = use TIER_DEFAULT[plan] (resolved at mint in li2-app).
-- 0 is allowed (deliberate hard-off); negative is not.
ALTER TABLE public.org_quotas
  ADD COLUMN IF NOT EXISTS ai_monthly_budget_cents integer;

ALTER TABLE public.org_quotas
  ADD CONSTRAINT org_quotas_ai_budget_nonneg
  CHECK (ai_monthly_budget_cents IS NULL OR ai_monthly_budget_cents >= 0);
