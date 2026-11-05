-- Migrate existing rows from visit_archives (pg_cron legacy) into visits_archive (Go worker)
-- New columns (li2_cid, channel, visitor_id) will be NULL for migrated rows
INSERT INTO visits_archive (
  id, created_at, fp, tp_id, os, platform, campaign_id, type, user_id, organization_id,
  city, country, referrer, user_agent, content_value, ip, isp, is_bot, asn, raw_referrer,
  region, segment_type, utm_campaign_id, utm_channel_id, utm_tags, archived_at
)
SELECT
  id, created_at, fp, tp_id, os, platform, campaign_id, type, user_id, organization_id,
  city, country, referrer, user_agent, content_value, ip, isp, is_bot, asn, raw_referrer,
  region, segment_type, utm_campaign_id, utm_channel_id, utm_tags, archived_at
FROM visit_archives
ON CONFLICT (id) DO NOTHING;

-- Disable pg_cron jobs that were handling visits archiving (superseded by Go worker)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE command ILIKE '%archive_old_free_visits%'
       OR command ILIKE '%archive_old_premium_trial_visits%';
  END IF;
END $$;
