-- Add collection (space) filtering support to get_realtime_data RPC
-- This allows Viewers to only see realtime data from their assigned spaces

CREATE OR REPLACE FUNCTION public.get_realtime_data(
  p_organization_id uuid,
  p_last_hours integer,
  p_timezone text DEFAULT 'UTC'::text,
  p_is_premium boolean DEFAULT false,
  p_collection_ids uuid[] DEFAULT NULL,              -- NEW: Filter by collections (spaces)
  p_include_null_collection boolean DEFAULT true     -- NEW: Include uncategorized touch-points
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
  has_collection_filter := p_collection_ids IS NOT NULL AND array_length(p_collection_ids, 1) > 0;

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
      -- NEW: Apply collection filtering
      and (
        NOT has_collection_filter
        OR tp.collection_id = ANY(p_collection_ids)
        OR (p_include_null_collection = true AND tp.collection_id IS NULL)
      )
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
COMMENT ON FUNCTION public.get_realtime_data IS
'Get realtime visit data with optional filtering by collections (spaces).
Supports filtering by collection IDs to restrict data visibility for Viewers.
Use p_collection_ids with p_include_null_collection to control visibility of uncategorized touch-points.';
