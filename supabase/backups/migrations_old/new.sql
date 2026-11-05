-- Clean up old signatures (optional)
drop function if exists get_ai_provider_active_key(text);
drop function if exists get_ai_provider_active_key(text[]);

create or replace function get_ai_provider_active_key(p_provider_types text[])
returns table(
  provider_type text,
  key_identifier text,
  api_key text
)
language plpgsql
as $$
begin
  return query
  with prefs as (
    -- QUALIFY column names from unnest to avoid collision with OUT params
    select
      u.provider_type as provider_type,
      u.ord           as ord
    from unnest(p_provider_types) with ordinality as u(provider_type, ord)
  ),
  picked as (
    select
      k.id,
      k.provider_type::text  as provider_type,
      k.key_identifier::text as key_identifier,
      k.api_key::text        as api_key
    from ai_provider_keys as k
    join prefs as p on p.provider_type = k.provider_type
    where k.status = 'active'
    order by
      p.ord,
      k.rotation_order,
      k.last_used_at nulls first
    for update skip locked
    limit 1
  ),
  upd as (
    update ai_provider_keys as t
    set last_used_at = now()
    from picked as px
    where t.id = px.id
    returning t.id
  )
  -- QUALIFY here too
  select px.provider_type, px.key_identifier, px.api_key
  from picked as px;
end;
$$;


create or replace function reduce_ai_credits(
  p_org_id uuid,
  p_amount int
)
returns table (
  ai_credits_balance int,
  ai_credits_used_this_month int
)
language plpgsql
as $$
begin
  return query
  update org_credits as oc
  set 
    ai_credits_balance = oc.ai_credits_balance - p_amount,
    ai_credits_used_this_month = oc.ai_credits_used_this_month + p_amount,
    updated_at = now()
  where oc.org_id = p_org_id
    and oc.ai_credits_balance >= p_amount  -- optional safeguard
  returning oc.ai_credits_balance, oc.ai_credits_used_this_month;
end;
$$;


alter table touch_points
add column suggested_slugs text[] default null;


CREATE OR REPLACE FUNCTION get_batch_touch_point_ids(batch_size int)
RETURNS TABLE(id bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT nextval('public.v2_touch_points_short_id_seq')
  FROM generate_series(1, batch_size);
END;
$$ LANGUAGE plpgsql VOLATILE;