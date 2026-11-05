-- Split partition maintenance into two separate cron jobs:
-- 1. create  — creates future partitions (1 AM on 1st of month)
-- 2. cleanup — per-org retention cleanup + drop empty partitions (2 AM on 1st of month)

UPDATE system_cronjobs
SET key     = 'task:partition:create',
    name    = 'Partition Create',
    crontab = '0 1 1 * *'
WHERE key = 'task:partition:maintain';

INSERT INTO system_cronjobs (name, key, enabled, crontab, max_retry)
VALUES ('Partition Cleanup', 'task:partition:cleanup', true, '0 2 * * *', 1)
ON CONFLICT (key) DO NOTHING;
