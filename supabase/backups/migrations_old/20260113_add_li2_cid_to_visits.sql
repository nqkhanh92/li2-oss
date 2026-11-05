-- Add li2_cid column for shortId storage
-- This enables direct query fallback when Redis is unavailable

-- Add column (nullable for backward compatibility with existing visits)
ALTER TABLE visits ADD COLUMN IF NOT EXISTS li2_cid VARCHAR(16);

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_visits_li2_cid ON visits(li2_cid);

-- Add comment for documentation
COMMENT ON COLUMN visits.li2_cid IS 'Short click identifier (16-char base62 hash of fp:tp_id)';
