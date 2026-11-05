-- Create get_realtime_data_v3 with bot filtering support
-- This version adds the ability to exclude bot traffic from realtime data
-- Default behavior: exclude_bot = true (recommended for accurate metrics)

CREATE OR REPLACE FUNCTION public.get_realtime_data_v3(
  p_organization_id uuid,
  p_last_hours integer,
  p_timezone text DEFAULT 'UTC'::text,
  p_is_premium boolean DEFAULT false,
  p_collection_ids uuid[] DEFAULT NULL::uuid[],
  p_include_null_collection boolean DEFAULT true,
  p_user_id uuid DEFAULT NULL::uuid,
  p_exclude_bot boolean DEFAULT true  -- NEW: Exclude bot traffic by default
)
 RETURNS TABLE(touchpoint_id uuid, touchpoint_name text, os text, platform text, channel text, country text, city text, ip text, isp text, referrer text, created_at timestamp with time zone, id uuid)
 LANGUAGE plpgsql
AS $function$
declare
  end_local   timestamp;
  start_local timestamp;
  has_collection_filter boolean;
begin
  end_local   := now() at time zone p_timezone;
  start_local := end_local - make_interval(hours => p_last_hours);

  -- Check if collection filtering is needed
  has_collection_filter := p_collection_ids IS NOT NULL;

  return query
  with filtered as (
    select
      v.tp_id,
      coalesce(tp.name, 'Touch point has been deleted') as touchpoint_name,
      v.os,
      v.platform,
      v.type      as channel,
      v.country,
      v.referrer,
      v.city,
      v.ip::text  as ip,          -- cast inet -> text
      v.isp,
      v.created_at,
      v.id
    from public.visits v
    left join public.touch_points tp
      on tp.id = v.tp_id
     and tp.deleted_at is null
    where v.organization_id = p_organization_id
      and v.created_at >= (start_local at time zone p_timezone)
      and v.created_at <  (end_local   at time zone p_timezone)
      -- Apply collection filtering
      and (
        NOT has_collection_filter
        OR tp.collection_id = ANY(p_collection_ids)
        OR (p_include_null_collection = true AND tp.collection_id IS NULL AND tp.user_id = p_user_id)
      )
      -- NEW: Apply bot filtering
      and (NOT p_exclude_bot OR v.is_bot = FALSE)
  )
  select
    f.tp_id               as touchpoint_id,
    f.touchpoint_name,
    f.os,
    f.platform,
    f.channel,
    f.country,
    f.city,
    f.ip,
    f.isp,
    f.referrer,
    f.created_at,
    f.id
  from filtered f
  order by f.created_at desc;
end;
$function$;

-- Add comment
COMMENT ON FUNCTION public.get_realtime_data_v3 IS
'Get realtime visit data with bot filtering and optional collection filtering.
V3 adds bot traffic filtering capability with p_exclude_bot parameter (default: true).
Use p_collection_ids with p_include_null_collection to control visibility of uncategorized touch-points.';
