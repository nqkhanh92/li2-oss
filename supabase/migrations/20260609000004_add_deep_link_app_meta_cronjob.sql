insert into system_cronjobs (key, name, crontab, max_retry, enabled)
values ('task:deep_link_app_meta:cleanup', 'Clean Deep Link App Meta', '0 3 * * *', 1, true)
on conflict (key) do nothing;
