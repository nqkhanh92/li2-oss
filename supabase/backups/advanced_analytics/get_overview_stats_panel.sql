CREATE OR REPLACE FUNCTION public.get_overview_stats_panel(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    current_start_date TIMESTAMPTZ;
    current_end_date TIMESTAMPTZ;
    previous_start_date TIMESTAMPTZ;
    previous_end_date TIMESTAMPTZ;
    result JSON;
BEGIN
    -- Validate tier restrictions
    IF NOT p_is_premium AND p_period_days != 7 THEN
        RETURN json_build_object(
            'error', TRUE,
            'message', 'Free tier limited to 7 days only'
        );
    END IF;
    
    IF NOT p_is_premium AND p_touchpoint_ids IS NOT NULL AND array_length(p_touchpoint_ids, 1) > 1 THEN
        RETURN json_build_object(
            'error', TRUE,
            'message', 'Free tier limited to 1 touchpoint only'
        );
    END IF;

    -- Calculate date ranges in user's timezone
    current_end_date := CURRENT_TIMESTAMP AT TIME ZONE p_timezone;
    current_start_date := current_end_date - (p_period_days || ' days')::INTERVAL;
    previous_end_date := current_start_date;
    previous_start_date := previous_end_date - (p_period_days || ' days')::INTERVAL;
    
    -- Apply hierarchical filtering logic
    WITH base_touchpoints AS (
        -- If tags are provided, filter touchpoints by tags first
        SELECT DISTINCT tp.id as tp_id
        FROM touch_points tp
        WHERE tp.organization_id = p_organization_id            
            AND (
                p_tag_ids IS NULL 
                OR tp.id IN (
                    SELECT DISTINCT ttl.tp_id 
                    FROM tp_tag_links ttl 
                    WHERE ttl.tag_id = ANY(p_tag_ids)
                )
            )
    ),
    filtered_touchpoints AS (
        -- Step 2: Apply specific touchpoint filter if provided
        SELECT tp_id
        FROM base_touchpoints
        WHERE (
            p_touchpoint_ids IS NULL 
            OR tp_id = ANY(p_touchpoint_ids)
        )
    ),
    current_period AS (
        SELECT 
            COUNT(*) as total_visits,
            COUNT(DISTINCT fp) as unique_visits,
            COUNT(CASE WHEN type = 'LINK' THEN 1 END) as link_clicks,
            COUNT(CASE WHEN type = 'QR' THEN 1 END) as qr_scans,
            COUNT(CASE WHEN type = 'NFC' THEN 1 END) as nfc_taps,
            COUNT(CASE WHEN type = 'WIFI' THEN 1 END) as wifi_accesses,
            COUNT(DISTINCT tp_id) as touchpoints_active
        FROM visits v
        WHERE v.organization_id = p_organization_id
            AND v.created_at >= current_start_date
            AND v.created_at < current_end_date            
            AND (
                -- No filtering if no touchpoints specified
                (p_tag_ids IS NULL AND p_touchpoint_ids IS NULL)
                OR 
                -- Apply hierarchical filtering
                v.tp_id IN (SELECT tp_id FROM filtered_touchpoints)
            )
    ),
    previous_period AS (
        SELECT 
            COUNT(*) as total_visits,
            COUNT(DISTINCT fp) as unique_visits,
            COUNT(CASE WHEN type = 'LINK' THEN 1 END) as link_clicks,
            COUNT(CASE WHEN type = 'QR' THEN 1 END) as qr_scans,
            COUNT(CASE WHEN type = 'NFC' THEN 1 END) as nfc_taps,
            COUNT(CASE WHEN type = 'WIFI' THEN 1 END) as wifi_accesses
        FROM visits v
        WHERE v.organization_id = p_organization_id
            AND v.created_at >= previous_start_date
            AND v.created_at < previous_end_date            
            AND (
                -- Apply same filtering logic for comparison
                (p_tag_ids IS NULL AND p_touchpoint_ids IS NULL)
                OR 
                v.tp_id IN (SELECT tp_id FROM filtered_touchpoints)
            )
    ),
    percentage_calculations AS (
        SELECT 
            -- Current period metrics
            c.total_visits,
            c.unique_visits,
            c.link_clicks,
            c.qr_scans,
            c.nfc_taps,
            c.wifi_accesses,
            c.touchpoints_active,
            
            -- Percentage changes with proper handling of division by zero
            CASE 
                WHEN p.total_visits = 0 THEN 
                    CASE WHEN c.total_visits > 0 THEN 100.0 ELSE 0.0 END
                ELSE 
                    ROUND(((c.total_visits - p.total_visits)::DECIMAL / p.total_visits) * 100, 1)
            END as total_visits_change_pct,
            
            CASE 
                WHEN p.unique_visits = 0 THEN 
                    CASE WHEN c.unique_visits > 0 THEN 100.0 ELSE 0.0 END
                ELSE 
                    ROUND(((c.unique_visits - p.unique_visits)::DECIMAL / p.unique_visits) * 100, 1)
            END as unique_visits_change_pct,
            
            CASE 
                WHEN p.link_clicks = 0 THEN 
                    CASE WHEN c.link_clicks > 0 THEN 100.0 ELSE 0.0 END
                ELSE 
                    ROUND(((c.link_clicks - p.link_clicks)::DECIMAL / p.link_clicks) * 100, 1)
            END as link_clicks_change_pct,
            
            CASE 
                WHEN p.qr_scans = 0 THEN 
                    CASE WHEN c.qr_scans > 0 THEN 100.0 ELSE 0.0 END
                ELSE 
                    ROUND(((c.qr_scans - p.qr_scans)::DECIMAL / p.qr_scans) * 100, 1)
            END as qr_scans_change_pct,
            
            CASE 
                WHEN p.nfc_taps = 0 THEN 
                    CASE WHEN c.nfc_taps > 0 THEN 100.0 ELSE 0.0 END
                ELSE 
                    ROUND(((c.nfc_taps - p.nfc_taps)::DECIMAL / p.nfc_taps) * 100, 1)
            END as nfc_taps_change_pct,
            
            CASE 
                WHEN p.wifi_accesses = 0 THEN 
                    CASE WHEN c.wifi_accesses > 0 THEN 100.0 ELSE 0.0 END
                ELSE 
                    ROUND(((c.wifi_accesses - p.wifi_accesses)::DECIMAL / p.wifi_accesses) * 100, 1)
            END as wifi_accesses_change_pct
            
        FROM current_period c
        CROSS JOIN previous_period p
    )
    SELECT json_build_object(
        -- 'period_info', json_build_object(
        --     'period_days', p_period_days,
        --     'current_start', current_start_date,
        --     'current_end', current_end_date,
        --     'timezone', p_timezone,
        --     'is_premium', p_is_premium
        -- ),
        -- 'filters_applied', json_build_object(
        --     'has_filters', (p_tag_ids IS NOT NULL OR p_touchpoint_ids IS NOT NULL),
        --     'tags_count', COALESCE(array_length(p_tag_ids, 1), 0),
        --     'touchpoints_count', COALESCE(array_length(p_touchpoint_ids, 1), 0),
        --     'filtered_touchpoints_available', (SELECT COUNT(*) FROM filtered_touchpoints)
        -- ),
        'stats', json_build_object(
            'total_visits', json_build_object(
                'value', total_visits,
                'change_pct', total_visits_change_pct,
                'trend', CASE 
                    WHEN total_visits_change_pct > 0 THEN 'up'
                    WHEN total_visits_change_pct < 0 THEN 'down' 
                    ELSE 'stable' 
                END
            ),
            'unique_visits', json_build_object(
                'value', unique_visits,
                'change_pct', unique_visits_change_pct,
                'trend', CASE 
                    WHEN unique_visits_change_pct > 0 THEN 'up'
                    WHEN unique_visits_change_pct < 0 THEN 'down' 
                    ELSE 'stable' 
                END
            ),
            'link_clicks', json_build_object(
                'value', link_clicks,
                'change_pct', link_clicks_change_pct,
                'trend', CASE 
                    WHEN link_clicks_change_pct > 0 THEN 'up'
                    WHEN link_clicks_change_pct < 0 THEN 'down' 
                    ELSE 'stable' 
                END
            ),
            'qr_scans', json_build_object(
                'value', qr_scans,
                'change_pct', qr_scans_change_pct,
                'trend', CASE 
                    WHEN qr_scans_change_pct > 0 THEN 'up'
                    WHEN qr_scans_change_pct < 0 THEN 'down' 
                    ELSE 'stable' 
                END
            ),
            'nfc_taps', json_build_object(
                'value', nfc_taps,
                'change_pct', nfc_taps_change_pct,
                'trend', CASE 
                    WHEN nfc_taps_change_pct > 0 THEN 'up'
                    WHEN nfc_taps_change_pct < 0 THEN 'down' 
                    ELSE 'stable' 
                END
            ),
            'wifi_accesses', json_build_object(
                'value', wifi_accesses,
                'change_pct', wifi_accesses_change_pct,
                'trend', CASE 
                    WHEN wifi_accesses_change_pct > 0 THEN 'up'
                    WHEN wifi_accesses_change_pct < 0 THEN 'down' 
                    ELSE 'stable' 
                END
            ),
            'touchpoints_active', touchpoints_active
        )
    ) INTO result
    FROM percentage_calculations;
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'error', TRUE,
        'message', SQLERRM,
        'period_days', p_period_days,
        'organization_id', p_organization_id
    );
END;
$function$
