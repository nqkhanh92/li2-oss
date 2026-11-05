-- Register partition maintenance cron job
-- Runs at 01:00 UTC on the 1st of every month
-- Creates future partitions (3-month lookahead) and drops expired interaction partitions (30-day retention)

INSERT INTO "public"."system_cronjobs" ("crontab", "key", "enabled", "max_retry", "name")
VALUES (
  '0 1 1 * *',                    -- 01:00 on the 1st of each month
  'task:partition:maintain',       -- matches TASK_PARTITION_MAINTAIN constant
  true,                            -- enabled immediately
  1,                               -- max 1 retry on failure
  'Partition Maintenance'          -- human-readable name
);
