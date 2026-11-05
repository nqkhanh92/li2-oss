CREATE OR REPLACE FUNCTION public.get_overview_peak_heatmap(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    start_date TIMESTAMPTZ;
    end_date TIMESTAMPTZ;
    result JSON;
BEGIN
    -- Premium feature check
    IF NOT p_is_premium THEN
        RETURN json_build_object(
            'premium_feature', TRUE,
            'message', 'Peak Performance Heatmap requires Premium plan'
        );
    END IF;

    -- Calculate date range in user's timezone
    end_date := CURRENT_TIMESTAMP AT TIME ZONE p_timezone;
    start_date := end_date - (p_period_days || ' days')::INTERVAL;
    
    WITH hourly_dow_matrix AS (
        -- Generate complete 24×7 matrix (168 time slots)
        SELECT 
            days.day_of_week,
            hours.hour_of_day
        FROM generate_series(0, 6) AS days(day_of_week)  -- 7 days
        CROSS JOIN generate_series(0, 23) AS hours(hour_of_day)  -- 24 hours
    ),
    filtered_visits AS (
        -- Apply hierarchical filtering directly to visits
        SELECT 
            v.created_at,
            v.fp,
            v.type,
            v.tp_id
        FROM visits v
        WHERE v.organization_id = p_organization_id
            AND v.created_at >= start_date
            AND v.created_at < end_date            
            AND (
                -- No filtering if no filters specified
                (p_tag_ids IS NULL AND p_touchpoint_ids IS NULL)
                OR 
                -- Apply hierarchical filtering: tags first, then touchpoints
                (
                    (p_tag_ids IS NULL OR v.tp_id IN (
                        SELECT DISTINCT ttl.tp_id 
                        FROM tp_tag_links ttl 
                        WHERE ttl.tag_id = ANY(p_tag_ids)
                    ))
                    AND
                    (p_touchpoint_ids IS NULL OR v.tp_id = ANY(p_touchpoint_ids))
                )
            )
    ),
    activity_heatmap AS (
        -- Aggregate interactions by hour and day of week
        SELECT 
            EXTRACT(dow FROM fv.created_at AT TIME ZONE p_timezone)::INTEGER as day_of_week,
            EXTRACT(hour FROM fv.created_at AT TIME ZONE p_timezone)::INTEGER as hour_of_day,
            COUNT(*) as total_interactions,
            COUNT(DISTINCT fv.fp) as unique_users,
            COUNT(CASE WHEN fv.type = 'LINK' THEN 1 END) as link_clicks,
            COUNT(CASE WHEN fv.type = 'QR' THEN 1 END) as qr_scans,
            COUNT(CASE WHEN fv.type = 'NFC' THEN 1 END) as nfc_taps,
            COUNT(CASE WHEN fv.type = 'WIFI' THEN 1 END) as wifi_accesses,
            COUNT(DISTINCT fv.tp_id) as active_touchpoints,
            -- Calculate interactions per user for this time slot
            ROUND(COUNT(*)::DECIMAL / NULLIF(COUNT(DISTINCT fv.fp), 0), 2) as interactions_per_user
        FROM filtered_visits fv
        GROUP BY 
            EXTRACT(dow FROM fv.created_at AT TIME ZONE p_timezone),
            EXTRACT(hour FROM fv.created_at AT TIME ZONE p_timezone)
    ),
    complete_heatmap AS (
        -- Fill in all 168 time slots with data
        SELECT 
            hdm.day_of_week,
            hdm.hour_of_day,
            CASE hdm.day_of_week
                WHEN 0 THEN 'Sunday'
                WHEN 1 THEN 'Monday'
                WHEN 2 THEN 'Tuesday'
                WHEN 3 THEN 'Wednesday'
                WHEN 4 THEN 'Thursday'
                WHEN 5 THEN 'Friday'
                WHEN 6 THEN 'Saturday'
            END as day_name,
            COALESCE(ah.total_interactions, 0) as interactions,
            COALESCE(ah.unique_users, 0) as unique_users,
            COALESCE(ah.link_clicks, 0) as link_clicks,
            COALESCE(ah.qr_scans, 0) as qr_scans,
            COALESCE(ah.nfc_taps, 0) as nfc_taps,
            COALESCE(ah.wifi_accesses, 0) as wifi_accesses,
            COALESCE(ah.active_touchpoints, 0) as active_touchpoints,
            COALESCE(ah.interactions_per_user, 0) as interactions_per_user,
            -- Simple business hours classification
            CASE 
                WHEN hdm.hour_of_day BETWEEN 9 AND 17 AND hdm.day_of_week BETWEEN 1 AND 5 THEN 'business_hours'
                WHEN hdm.hour_of_day BETWEEN 18 AND 22 THEN 'evening'
                WHEN hdm.day_of_week IN (0, 6) THEN 'weekend'
                WHEN hdm.hour_of_day BETWEEN 0 AND 6 THEN 'late_night'
                ELSE 'other'
            END as time_category
        FROM hourly_dow_matrix hdm
        LEFT JOIN activity_heatmap ah ON hdm.day_of_week = ah.day_of_week 
                                     AND hdm.hour_of_day = ah.hour_of_day
    ),
    heatmap_with_intensity AS (
        -- Calculate intensity levels using simple quartile-based approach
        SELECT 
            *,
            -- Calculate intensity using actual data distribution (not percentiles of sparse data)
            CASE 
                WHEN interactions = 0 THEN 'no_activity'
                WHEN interactions = 1 THEN 'minimal'
                WHEN interactions <= 5 THEN 'low'
                WHEN interactions <= 15 THEN 'moderate'
                WHEN interactions <= 30 THEN 'high'
                ELSE 'peak'
            END as activity_level,
            -- Calculate intensity score (0-100) for heatmap visualization
            CASE 
                WHEN interactions = 0 THEN 0
                ELSE LEAST(100, ROUND((interactions::DECIMAL / NULLIF((SELECT MAX(interactions) FROM complete_heatmap), 0)) * 100))
            END as intensity_score
        FROM complete_heatmap
    ),
    top_performers AS (
        -- Pre-calculate top performing time slots with ranking
        SELECT 
            day_name,
            hour_of_day,
            interactions,
            unique_users,
            time_category,
            ROW_NUMBER() OVER (ORDER BY interactions DESC, unique_users DESC) as rank
        FROM heatmap_with_intensity 
        WHERE interactions > 0
    ),
    summary_stats AS (
        -- Calculate summary statistics for insights
        SELECT 
            COUNT(*) as total_time_slots,
            COUNT(CASE WHEN interactions > 0 THEN 1 END) as active_time_slots,
            ROUND(AVG(interactions), 1) as avg_interactions_per_slot,
            MAX(interactions) as peak_interactions,
            COUNT(CASE WHEN time_category = 'business_hours' AND interactions > 0 THEN 1 END) as active_business_hours,
            COUNT(CASE WHEN time_category = 'weekend' AND interactions > 0 THEN 1 END) as active_weekend_slots,
            COUNT(CASE WHEN time_category = 'evening' AND interactions > 0 THEN 1 END) as active_evening_slots
        FROM heatmap_with_intensity
    )
    SELECT json_build_object(
        'period_info', json_build_object(
            'period_days', p_period_days,
            'start_date', start_date,
            'end_date', end_date,
            'timezone', p_timezone,
            'is_premium', p_is_premium
        ),
        'filters_applied', json_build_object(
            'has_filters', (p_tag_ids IS NOT NULL OR p_touchpoint_ids IS NOT NULL),
            'tags_count', COALESCE(array_length(p_tag_ids, 1), 0),
            'touchpoints_count', COALESCE(array_length(p_touchpoint_ids, 1), 0)
        ),
        'heatmap_data', (
            SELECT json_agg(
                json_build_object(
                    'day_of_week', day_of_week,
                    'day_name', day_name,
                    'hour_of_day', hour_of_day,
                    'interactions', interactions,
                    'unique_users', unique_users,
                    'active_touchpoints', active_touchpoints,
                    'interactions_per_user', interactions_per_user,
                    'intensity_score', intensity_score,
                    'activity_level', activity_level,
                    'time_category', time_category,
                    'breakdown', json_build_object(
                        'link_clicks', link_clicks,
                        'qr_scans', qr_scans,
                        'nfc_taps', nfc_taps,
                        'wifi_accesses', wifi_accesses
                    )
                ) ORDER BY day_of_week, hour_of_day
            )
            FROM heatmap_with_intensity
        ),
        'insights', json_build_object(
            'peak_performance', (
                SELECT json_build_object(
                    'day_name', day_name,
                    'hour', hour_of_day,
                    'interactions', interactions,
                    'time_category', time_category,
                    'unique_users', unique_users
                ) 
                FROM top_performers 
                WHERE rank = 1
            ),
            'top_5_time_slots', (
                SELECT json_agg(
                    json_build_object(
                        'rank', rank,
                        'day_name', day_name,
                        'hour', hour_of_day,
                        'interactions', interactions,
                        'unique_users', unique_users,
                        'time_category', time_category
                    ) ORDER BY rank
                )
                FROM top_performers 
                WHERE rank <= 5
            ),
            'activity_summary', (
                SELECT json_build_object(
                    'total_time_slots', total_time_slots,
                    'active_time_slots', active_time_slots,
                    'activity_rate_pct', ROUND(active_time_slots::DECIMAL / total_time_slots * 100, 1),
                    'avg_interactions_per_slot', avg_interactions_per_slot,
                    'peak_interactions', peak_interactions,
                    'business_hours_active', active_business_hours,
                    'weekend_active', active_weekend_slots,
                    'evening_active', active_evening_slots
                )
                FROM summary_stats
            ),
            'recommendations', json_build_object(
                'best_posting_times', (
                    SELECT json_agg(
                        json_build_object(
                            'day_name', day_name,
                            'hour_range', CONCAT(hour_of_day, ':00-', (hour_of_day + 1), ':00'),
                            'expected_interactions', interactions,
                            'time_category', time_category
                        ) ORDER BY rank
                    )
                    FROM top_performers 
                    WHERE rank <= 3
                ),
                'optimization_tip', (
                    SELECT CASE
                        WHEN active_business_hours = 0 THEN 'Consider targeting business hours (9 AM - 5 PM weekdays)'
                        WHEN active_weekend_slots >= active_business_hours THEN 'Strong weekend performance - focus on weekend campaigns'
                        WHEN active_evening_slots > active_business_hours THEN 'Evening hours show good engagement'
                        WHEN peak_interactions < 10 THEN 'Low overall activity - consider increasing touchpoint promotion'
                        ELSE 'Good activity distribution across time periods'
                    END
                    FROM summary_stats
                )
            )
        )
    ) INTO result;
    
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
