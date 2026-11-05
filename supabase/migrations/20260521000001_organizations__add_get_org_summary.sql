CREATE OR REPLACE FUNCTION public.get_org_summary(_organization_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'touchPoints',      (SELECT COUNT(*) FROM touch_points      WHERE organization_id = _organization_id),
    'tags',             (SELECT COUNT(*) FROM tags              WHERE organization_id = _organization_id),
    'conversionEvents', (SELECT COUNT(*) FROM conversion_events WHERE organization_id = _organization_id),
    'funnels',          (SELECT COUNT(*) FROM funnels           WHERE organization_id = _organization_id),
    'customers',        (SELECT COUNT(*) FROM customer_profiles WHERE organization_id = _organization_id),
    'eventRules',       (SELECT COUNT(*) FROM event_rules       WHERE organization_id = _organization_id)
  );
$$;
