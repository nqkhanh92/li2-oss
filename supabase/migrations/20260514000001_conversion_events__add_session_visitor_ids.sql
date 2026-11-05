ALTER TABLE public.conversion_events
  ADD COLUMN IF NOT EXISTS session_id varchar(64),
  ADD COLUMN IF NOT EXISTS visitor_id varchar(64);

CREATE INDEX IF NOT EXISTS idx_conversion_events_session_id
  ON public.conversion_events (session_id)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversion_events_visitor_id
  ON public.conversion_events (visitor_id)
  WHERE visitor_id IS NOT NULL;
