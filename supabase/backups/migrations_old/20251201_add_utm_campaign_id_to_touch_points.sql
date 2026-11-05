-- Add utm_campaign_id column to touch_points table
ALTER TABLE touch_points
ADD COLUMN utm_campaign_id UUID REFERENCES utm_campaigns(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_touch_points_utm_campaign_id ON touch_points(utm_campaign_id);

-- Create trigger function to sync campaign_id to touch_points
CREATE OR REPLACE FUNCTION sync_touchpoint_campaign_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT and UPDATE
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE touch_points
    SET utm_campaign_id = NEW.campaign_id
    WHERE id = NEW.touchpoint_id;
    RETURN NEW;
  END IF;

  -- Handle DELETE
  IF (TG_OP = 'DELETE') THEN
    UPDATE touch_points
    SET utm_campaign_id = NULL
    WHERE id = OLD.touchpoint_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on utm_campaign_touchpoints
CREATE TRIGGER trigger_sync_touchpoint_campaign_id
AFTER INSERT OR UPDATE OR DELETE ON utm_campaign_touchpoints
FOR EACH ROW
EXECUTE FUNCTION sync_touchpoint_campaign_id();

-- Backfill existing data
UPDATE touch_points tp
SET utm_campaign_id = uct.campaign_id
FROM utm_campaign_touchpoints uct
WHERE tp.id = uct.touchpoint_id;
