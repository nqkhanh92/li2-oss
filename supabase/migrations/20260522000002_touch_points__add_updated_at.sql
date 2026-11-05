ALTER TABLE public.touch_points
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION update_touch_points_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_touch_points_updated_at ON public.touch_points;
CREATE TRIGGER trigger_touch_points_updated_at
  BEFORE UPDATE ON public.touch_points
  FOR EACH ROW
  EXECUTE FUNCTION update_touch_points_updated_at();
