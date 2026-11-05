alter table domains add column if not exists cf_hostname_id text null;
alter table domains alter column txt_name drop not null;
alter table domains alter column txt_name set default null;
