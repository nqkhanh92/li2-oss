-- Drop tables if they exist (in reverse order due to foreign key dependencies)
DROP TABLE IF EXISTS utm_campaign_touchpoints CASCADE;
DROP TABLE IF EXISTS utm_campaigns CASCADE;
DROP TABLE IF EXISTS utm_campaign_channels CASCADE;
DROP TABLE IF EXISTS campaign_channels CASCADE;

-- Create utm_campaigns table
CREATE TABLE utm_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  custom_utm_enabled BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE campaign_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(name, organization_id)
);

-- Create utm_campaign_channels table
CREATE TABLE utm_campaign_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES utm_campaigns(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES campaign_channels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, channel_id)
);

-- Create utm_campaign_touchpoints junction table
CREATE TABLE utm_campaign_touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  touchpoint_id UUID NOT NULL REFERENCES touch_points(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES campaign_channels(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES utm_campaigns(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  utm_tags JSONB,
  UNIQUE(touchpoint_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_utm_campaigns_org_id ON utm_campaigns(organization_id);
CREATE INDEX idx_utm_campaigns_created_at ON utm_campaigns(created_at DESC);
CREATE INDEX idx_utm_campaigns_start_date ON utm_campaigns(start_date);
CREATE INDEX idx_utm_campaigns_end_date ON utm_campaigns(end_date);

CREATE INDEX idx_utm_campaign_touchpoints_campaign_id ON utm_campaign_touchpoints(campaign_id);
CREATE INDEX idx_utm_campaign_touchpoints_touchpoint_id ON utm_campaign_touchpoints(touchpoint_id);
CREATE INDEX idx_utm_campaign_touchpoints_channel_id ON utm_campaign_touchpoints(channel_id);

-- Enable RLS
ALTER TABLE utm_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE utm_campaign_touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE utm_campaign_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_channels ENABLE ROW LEVEL SECURITY;

-- Add indexes for campaign_channels
CREATE INDEX idx_campaign_channels_org_id ON campaign_channels(organization_id);
CREATE INDEX idx_campaign_channels_name ON campaign_channels(name);
CREATE INDEX idx_campaign_channels_created_at ON campaign_channels(created_at DESC);



CREATE OR REPLACE FUNCTION public.get_utm_campaign_analytics(
  _organization_id  uuid,
  _utm_campaign_id  uuid,
  _channel_ids      uuid[]        DEFAULT NULL,
  _tp_ids           uuid[]        DEFAULT NULL,
  _start_time       timestamptz   DEFAULT NULL,
  _end_time         timestamptz   DEFAULT NULL,
  _exclude_bot      boolean       DEFAULT TRUE
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  result jsonb;
BEGIN
  WITH filtered_visits AS (
    SELECT *
    FROM visits
    WHERE
      organization_id = _organization_id           -- required org
      AND utm_campaign_id = _utm_campaign_id       -- required UTM campaign
      AND (
        _channel_ids IS NULL 
        OR array_length(_channel_ids, 1) IS NULL
        OR utm_channel_id = ANY(_channel_ids)
      )
      AND (
        _tp_ids IS NULL
        OR array_length(_tp_ids, 1) IS NULL
        OR tp_id = ANY(_tp_ids)
      )
      AND (_start_time IS NULL OR created_at >= _start_time)
      AND (_end_time   IS NULL OR created_at <= _end_time)
      AND (NOT _exclude_bot OR is_bot = FALSE)
  ),

  -- channel grouping
  channel_counts AS (
    SELECT
      utm_channel_id,
      COUNT(*)            AS total_visits,
      COUNT(DISTINCT fp)  AS unique_visits
    FROM filtered_visits
    GROUP BY utm_channel_id
    ORDER BY total_visits DESC
  ),

  -- touchpoint grouping
  touchpoint_counts AS (
    SELECT
      tp_id,
      COALESCE(content_value, 'unknown') AS label,
      COUNT(*)            AS total_visits,
      COUNT(DISTINCT fp)  AS unique_visits
    FROM filtered_visits
    GROUP BY tp_id, COALESCE(content_value, 'unknown')
    ORDER BY total_visits DESC
  ),

  -- daily aggregation
  daily_counts AS (
    SELECT
      DATE(created_at)   AS visit_date,
      COUNT(*)           AS total_visits,
      COUNT(DISTINCT fp) AS unique_visits
    FROM filtered_visits
    GROUP BY DATE(created_at)
    ORDER BY visit_date
  ),

  -- referrer / os / platform
  referrer_counts AS (
    SELECT COALESCE(referrer, 'unknown') AS referrer, COUNT(*) AS count
    FROM filtered_visits
    GROUP BY 1 ORDER BY count DESC
  ),
  os_counts AS (
    SELECT COALESCE(os, 'unknown') AS os, COUNT(*) AS count
    FROM filtered_visits
    GROUP BY 1 ORDER BY count DESC
  ),
  platform_counts AS (
    SELECT COALESCE(platform, 'unknown') AS platform, COUNT(*) AS count
    FROM filtered_visits
    GROUP BY 1 ORDER BY count DESC
  )

  SELECT jsonb_build_object(
    'utmCampaignId', _utm_campaign_id,
    'totalVisits', (SELECT COUNT(*) FROM filtered_visits),
    'totalUniqueVisits', (SELECT COUNT(DISTINCT fp) FROM filtered_visits WHERE fp IS NOT NULL),

    'channels', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', utm_channel_id,
          'totalVisits', total_visits,
          'totalUniqueVisits', unique_visits
        )
        ORDER BY total_visits DESC
      ), '[]'::jsonb)
      FROM channel_counts
    ),

    'touchpoints', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', tp_id,
          'label', label,
          'totalVisits', total_visits,
          'totalUniqueVisits', unique_visits
        )
        ORDER BY total_visits DESC
      ), '[]'::jsonb)
      FROM touchpoint_counts
    ),

    'daily', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'date', to_char(visit_date, 'YYYY-MM-DD'),
          'totalVisits', total_visits,
          'totalUniqueVisits', unique_visits
        )
        ORDER BY visit_date
      ), '[]'::jsonb)
      FROM daily_counts
    ),

    'referrers', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('name', referrer, 'count', count)
        ORDER BY count DESC
      ), '[]'::jsonb)
      FROM referrer_counts
    ),

    'os', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('name', os, 'count', count)
        ORDER BY count DESC
      ), '[]'::jsonb)
      FROM os_counts
    ),

    'platforms', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('name', platform, 'count', count)
        ORDER BY count DESC
      ), '[]'::jsonb)
      FROM platform_counts
    )
  )
  INTO result;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$function$;
