ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS channel varchar(32);

CREATE INDEX IF NOT EXISTS idx_visits_channel
  ON public.visits (channel)
  WHERE channel IS NOT NULL;
