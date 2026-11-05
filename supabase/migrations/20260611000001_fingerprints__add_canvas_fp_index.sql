-- Existing index (client_key, canvas_fp, browser_fp) cannot be used for
-- lookups by canvas_fp alone — client_key is the leading column.
-- This query runs ~2,500x/day at 29ms each (total: ~72s).
-- Index advisor shows cost drop from 2,744 → 8 with a dedicated canvas_fp index.
CREATE INDEX IF NOT EXISTS idx_fingerprints_canvas_fp
  ON public.fingerprints USING btree (canvas_fp);
