ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS channel varchar(32);

CREATE INDEX IF NOT EXISTS idx_sessions_channel
  ON public.sessions (channel)
  WHERE channel IS NOT NULL;
