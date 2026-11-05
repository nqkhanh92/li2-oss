ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS visitor_id varchar(64);
