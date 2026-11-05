CREATE OR REPLACE FUNCTION public.get_overview_daily_trend(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    start_date TIMESTAMPTZ;
    end_date TIMESTAMPTZ;
    result JSON;
BEGIN
    -- Validate tier restrictions
    IF NOT p_is_premium AND p_period_days != 7 THEN
        RETURN json_build_object('error', TRUE, 'message', 'Free tier limited to 7 days only');
    END IF;
    
    IF NOT p_is_premium AND p_touchpoint_ids IS NOT NULL AND array_length(p_touchpoint_ids, 1) > 1 THEN
        RETURN json_build_object('error', TRUE, 'message', 'Free tier limited to 1 touchpoint only');
    END IF;

    -- Calculate date range in user's timezone
    end_date := CURRENT_TIMESTAMP AT TIME ZONE p_timezone;
    start_date := end_date - (p_period_days || ' days')::INTERVAL;
    
    WITH daily_series AS (
        SELECT 
            generate_series(
                DATE_TRUNC('day', start_date),
                DATE_TRUNC('day', end_date - interval '1 day'),
                interval '1 day'
            )::DATE as date
    ),
    filtered_touchpoints AS (
        -- Apply hierarchical filtering
        SELECT DISTINCT tp.id as tp_id
        FROM touch_points tp
        WHERE tp.organization_id = p_organization_id
            AND tp.deleted_at IS NULL
            AND (
                p_tag_ids IS NULL 
                OR tp.id IN (
                    SELECT DISTINCT ttl.tp_id 
                    FROM tp_tag_links ttl 
                    WHERE ttl.tag_id = ANY(p_tag_ids)
                )
            )
            AND (
                p_touchpoint_ids IS NULL 
                OR tp.id = ANY(p_touchpoint_ids)
            )
    ),
    daily_stats AS (
        SELECT 
            DATE(v.created_at AT TIME ZONE p_timezone) as date,
            COUNT(CASE WHEN v.type = 'LINK' THEN 1 END) as link_clicks,
            COUNT(CASE WHEN v.type = 'QR' THEN 1 END) as qr_scans,
            COUNT(CASE WHEN v.type = 'NFC' THEN 1 END) as nfc_taps,
            COUNT(CASE WHEN v.type = 'WIFI' THEN 1 END) as wifi_accesses,
            COUNT(*) as total_interactions,
            COUNT(DISTINCT v.fp) as unique_users,
            COUNT(DISTINCT v.tp_id) as active_touchpoints
        FROM visits v
        WHERE v.organization_id = p_organization_id
            AND v.created_at >= start_date
            AND v.created_at < end_date            
            AND (
                -- No filtering if no touchpoints specified
                (p_tag_ids IS NULL AND p_touchpoint_ids IS NULL)
                OR 
                -- Apply hierarchical filtering
                v.tp_id IN (SELECT tp_id FROM filtered_touchpoints)
            )
        GROUP BY DATE(v.created_at AT TIME ZONE p_timezone)
    ),
    complete_daily_data AS (
        SELECT 
            ds.date,
            COALESCE(s.link_clicks, 0) as link_clicks,
            COALESCE(s.qr_scans, 0) as qr_scans,
            COALESCE(s.nfc_taps, 0) as nfc_taps,
            COALESCE(s.wifi_accesses, 0) as wifi_accesses,
            COALESCE(s.total_interactions, 0) as total_interactions,
            COALESCE(s.unique_users, 0) as unique_users,
            COALESCE(s.active_touchpoints, 0) as active_touchpoints
        FROM daily_series ds
        LEFT JOIN daily_stats s ON ds.date = s.date
        ORDER BY ds.date
    ),
    trend_analysis AS (
        SELECT 
            *,
            -- Calculate 3-day moving average for trend smoothing
            ROUND(AVG(total_interactions) OVER (
                ORDER BY date 
                ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
            ), 1) as moving_avg_3day,
            -- Week-over-week comparison where applicable
            LAG(total_interactions, 7) OVER (ORDER BY date) as same_day_last_week,
            -- Growth rate calculation
            CASE 
                WHEN LAG(total_interactions) OVER (ORDER BY date) > 0 THEN
                    ROUND(
                        ((total_interactions - LAG(total_interactions) OVER (ORDER BY date))::DECIMAL / 
                         LAG(total_interactions) OVER (ORDER BY date)) * 100, 1
                    )
                ELSE NULL
            END as daily_growth_pct
        FROM complete_daily_data
    )
    SELECT json_build_object(
        -- 'period_info', json_build_object(
        --     'period_days', p_period_days,
        --     'start_date', start_date,
        --     'end_date', end_date,
        --     'timezone', p_timezone,
        --     'is_premium', p_is_premium
        -- ),
        -- 'filters_applied', json_build_object(
        --     'has_filters', (p_tag_ids IS NOT NULL OR p_touchpoint_ids IS NOT NULL),
        --     'tags_count', COALESCE(array_length(p_tag_ids, 1), 0),
        --     'touchpoints_count', COALESCE(array_length(p_touchpoint_ids, 1), 0),
        --     'filtered_touchpoints_available', (SELECT COUNT(*) FROM filtered_touchpoints)
        -- ),
        'daily_data', json_agg(
            json_build_object(
                'date', date,
                'link_clicks', link_clicks,
                'qr_scans', qr_scans,
                'nfc_taps', nfc_taps,
                'wifi_accesses', wifi_accesses,
                'total_interactions', total_interactions,
                'unique_users', unique_users,
                'active_touchpoints', active_touchpoints,
                'moving_avg_3day', moving_avg_3day,
                'daily_growth_pct', daily_growth_pct,
                'same_day_last_week', same_day_last_week
            ) ORDER BY date
        ),
        'summary', json_build_object(
            'total_days', COUNT(*),
            'days_with_activity', COUNT(CASE WHEN total_interactions > 0 THEN 1 END),
            'avg_daily_interactions', ROUND(AVG(total_interactions), 1),
            'avg_daily_users', ROUND(AVG(unique_users), 1),
            'peak_day', json_build_object(
                'date', (SELECT date FROM trend_analysis ORDER BY total_interactions DESC LIMIT 1),
                'interactions', (SELECT total_interactions FROM trend_analysis ORDER BY total_interactions DESC LIMIT 1)
            ),
            'trend_direction', CASE
                WHEN AVG(daily_growth_pct) > 5 THEN 'strong_growth'
                WHEN AVG(daily_growth_pct) > 0 THEN 'growth'
                WHEN AVG(daily_growth_pct) > -5 THEN 'stable'
                ELSE 'decline'
            END
        )
    ) INTO result
    FROM trend_analysis;
    
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
