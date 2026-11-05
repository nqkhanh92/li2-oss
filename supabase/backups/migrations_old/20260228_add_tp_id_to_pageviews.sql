-- Add tp_id column to pageviews (nullable, most pageviews are organic/direct)
ALTER TABLE pageviews ADD COLUMN tp_id uuid REFERENCES touch_points(id) ON DELETE SET NULL;

-- Sparse index: only index rows that have a tp_id (much smaller than full index)
CREATE INDEX idx_pageviews_tp_id ON pageviews(tp_id) WHERE tp_id IS NOT NULL;
