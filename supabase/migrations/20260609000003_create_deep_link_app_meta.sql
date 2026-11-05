create table if not exists deep_link_app_meta (
  app_store_id  text        not null primary key,
  app_name      text        not null default '',
  app_icon_url  text        not null default '',
  fetched_at    timestamptz not null default now()
);
