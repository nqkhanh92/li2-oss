-- Add pagination support to get_raw_visit_data RPC
-- This migration updates the function to accept p_limit and p_offset parameters
-- and returns both the paginated data and total count

CREATE OR REPLACE FUNCTION public.get_raw_visit_data(
  p_organization_id uuid,
  p_last_hours integer,
  p_timezone text DEFAULT 'UTC'::text,
  p_is_premium boolean DEFAULT false,
  p_tp_ids uuid[] DEFAULT NULL::uuid[],
  p_tag_ids uuid[] DEFAULT NULL::uuid[],
  p_exclude_bot boolean DEFAULT false,
  p_start_time timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_end_time timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_limit integer DEFAULT NULL,
  p_offset integer DEFAULT 0
)
 RETURNS TABLE(
   touchpoint_id uuid,
   touchpoint_name text,
   os text,
   platform text,
   channel text,
   country text,
   city text,
   ip text,
   isp text,
   referrer text,
   created_at timestamp with time zone,
   id uuid,
   total_count bigint
 )
 LANGUAGE plpgsql
AS $function$
declare
  end_local   timestamp;
  start_local timestamp;
begin
  -- Determine end time (use provided end_time or current time in timezone)
  end_local := coalesce(
    p_end_time at time zone p_timezone,
    now() at time zone p_timezone
  );

  -- Determine start time (use provided start_time or calculate from p_last_hours)
  start_local := coalesce(
    p_start_time at time zone p_timezone,
    end_local - make_interval(hours => p_last_hours)
  );

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
      v.ip::text  as ip,
      v.isp,
      v.created_at,
      v.id
    from public.visits v
    left join public.touch_points tp
      on tp.id = v.tp_id
     and tp.deleted_at is null
    where v.organization_id = p_organization_id
      and v.created_at >= (start_local at time zone p_timezone)
      and v.created_at <  (end_local at time zone p_timezone)
      -- Filter by touch point IDs if provided
      and (p_tp_ids is null or p_tp_ids = '{}' or v.tp_id = any(p_tp_ids))
      -- Filter by tags if provided (join with tp_tag_links through touch points)
      and (
        p_tag_ids is null
        or p_tag_ids = '{}'
        or exists (
          select 1 from public.tp_tag_links tl
          where tl.tp_id = v.tp_id
            and tl.tag_id = any(p_tag_ids)
        )
      )
      -- Exclude bots if requested
      and (p_exclude_bot = false or v.platform != 'bot')
  ),
  total as (
    select count(*) as total_count
    from filtered
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
    f.id,
    t.total_count
  from filtered f
  cross join total t
  order by f.created_at desc
  limit p_limit
  offset p_offset;
end;
$function$;