create table logs.org_audit_logs (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  user_id uuid null,
  module text not null,
  action text not null,
  target_id uuid null,
  target_name text null,
  target_table text null,
  target_extra jsonb null,
  changes jsonb null,
  metadata jsonb null,
  created_at timestamp with time zone not null default now(),
  constraint organization_activity_logs_pkey primary key (id),
  constraint organization_activity_logs_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint organization_activity_logs_user_id_fkey foreign KEY (user_id) references profiles (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists organization_activity_logs_org_created_at_idx on logs.org_audit_logs using btree (organization_id, created_at desc) TABLESPACE pg_default;

create index IF not exists organization_activity_logs_org_module_created_at_idx on logs.org_audit_logs using btree (organization_id, module, created_at desc) TABLESPACE pg_default;

create index IF not exists organization_activity_logs_target_id_idx on logs.org_audit_logs using btree (target_id) TABLESPACE pg_default
where
  (target_id is not null);

create index IF not exists organization_activity_logs_changes_gin_idx on logs.org_audit_logs using gin (changes jsonb_path_ops) TABLESPACE pg_default;


CREATE OR REPLACE FUNCTION public.get_visits_by_destinations_v2(p_tp_id uuid, p_org_id uuid, p_start_time timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_time timestamp with time zone DEFAULT NULL::timestamp with time zone, p_timezone text DEFAULT 'UTC'::text, p_exclude_bot boolean DEFAULT false)
 RETURNS TABLE(destination text, segment_type text, total_visits bigint, unique_visits bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    v.content_value AS destination,
    v.segment_type AS segment_type,
    COUNT(v.fp) AS total_visits,
    COUNT(DISTINCT v.fp) AS unique_visits
  FROM public.visits v
  WHERE v.organization_id = p_org_id
    AND v.tp_id = p_tp_id
    AND (p_start_time IS NULL OR v.created_at >= p_start_time)
    AND (p_end_time IS NULL OR v.created_at <= p_end_time)
    AND (NOT p_exclude_bot OR v.is_bot = FALSE)
  GROUP BY v.content_value, v.segment_type
  ORDER BY total_visits DESC;
END;
$function$


CREATE OR REPLACE FUNCTION logs.get_destination_history_v2(p_org_id uuid, p_tp_id uuid, p_start_time timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_time timestamp with time zone DEFAULT NULL::timestamp with time zone, p_timezone text DEFAULT 'UTC'::text)
 RETURNS TABLE(destination text, changed_at timestamp with time zone, segment_type text, type text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH activity_logs AS (
        SELECT 
            oal.changes,
            oal.created_at
        FROM logs.org_audit_logs oal
        WHERE oal.organization_id = p_org_id
            AND oal.target_id = p_tp_id
            AND oal.module = 'touch_point'
            AND oal.changes IS NOT NULL
            AND (p_start_time IS NULL OR oal.created_at >= p_start_time)
            AND (p_end_time IS NULL OR oal.created_at <= p_end_time)
    ),
    extracted_destinations AS (
        -- Extract from content_value.new field
        SELECT 
            al.changes->'content_value'->>'new' AS dest,
            al.created_at,
            'default' AS segment_type,
            'logs' AS type
        FROM activity_logs al
        WHERE al.changes ? 'content_value'
            AND al.changes->'content_value' ? 'new'
            AND al.changes->'content_value'->>'new' IS NOT NULL
            AND al.changes->'content_value'->>'new' != ''

        UNION ALL

        -- Extract from targeting.new.targets array
        SELECT 
            target->>'destination' AS dest,
            al.created_at,
            'targeting' AS segment_type,
            'logs' AS type
        FROM activity_logs al,
            jsonb_array_elements(
                al.changes->'targeting'->'new'->'targets'
            ) WITH ORDINALITY AS ord(target, ordinality)
        WHERE al.changes ? 'targeting'
            AND al.changes->'targeting' ? 'new'
            AND al.changes->'targeting'->'new' ? 'targets'
            AND target ? 'destination'
            AND target->>'destination' IS NOT NULL
            AND target->>'destination' != ''

        UNION ALL

        -- Extract from targeting.old.targets array
        SELECT 
            target->>'destination' AS dest,
            al.created_at,
            'targeting' AS segment_type,
            'logs' AS type
        FROM activity_logs al,
            jsonb_array_elements(
                al.changes->'targeting'->'old'->'targets'
            ) WITH ORDINALITY AS ord(target, ordinality)
        WHERE al.changes ? 'targeting'
            AND al.changes->'targeting' ? 'old'
            AND al.changes->'targeting'->'old' ? 'targets'
            AND target ? 'destination'
            AND target->>'destination' IS NOT NULL
            AND target->>'destination' != ''
    ),
    current_destinations AS (
        -- Extract current content_value from touch_points table
        SELECT 
            tp.content_value AS dest,
            NOW() AS created_at,
            'default' AS segment_type,
            'current' AS type
        FROM public.touch_points tp
        WHERE tp.organization_id = p_org_id
            AND tp.id = p_tp_id
            AND tp.content_value IS NOT NULL
            AND tp.content_value != ''

        UNION ALL

        -- Extract destinations from current targeting.targets array
        SELECT 
            target->>'destination' AS dest,
            NOW() AS created_at,
            'targeting' AS segment_type,
            'current' AS type
        FROM public.touch_points tp,
            jsonb_array_elements(tp.targeting->'targets') WITH ORDINALITY AS ord(target, ordinality)
        WHERE tp.organization_id = p_org_id
            AND tp.id = p_tp_id
            AND tp.targeting IS NOT NULL
            AND tp.targeting ? 'targets'
            AND target ? 'destination'
            AND target->>'destination' IS NOT NULL
            AND target->>'destination' != ''
    ),
    all_destinations AS (
        SELECT * FROM extracted_destinations
        UNION ALL
        SELECT * FROM current_destinations
    )
    SELECT DISTINCT ON (ad.dest, ad.segment_type)
        ad.dest AS destination,
        ad.created_at AS changed_at,
        ad.segment_type,
        ad.type
    FROM all_destinations ad
    ORDER BY 
        ad.dest, 
        ad.segment_type,
        CASE WHEN ad.type = 'current' THEN 0 ELSE 1 END,  -- Priority: 'current' first
        ad.created_at DESC;
END;
$function$
