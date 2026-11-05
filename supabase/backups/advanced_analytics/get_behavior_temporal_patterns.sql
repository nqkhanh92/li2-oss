CREATE OR REPLACE FUNCTION public.get_behavior_temporal_patterns(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false)
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
    
    WITH filtered_visits AS (
        -- Apply hierarchical filtering
        SELECT 
            v.fp,
            v.type,
            v.created_at,
            v.tp_id,
            v.platform,
            v.country,
            tp.name as touchpoint_name,
            -- Extract temporal components in user's timezone
            EXTRACT(hour FROM v.created_at AT TIME ZONE p_timezone) as hour_of_day,
            EXTRACT(dow FROM v.created_at AT TIME ZONE p_timezone) as day_of_week,
            DATE(v.created_at AT TIME ZONE p_timezone) as interaction_date,
            EXTRACT(week FROM v.created_at AT TIME ZONE p_timezone) as week_number
        FROM visits v
        LEFT JOIN touch_points tp ON v.tp_id = tp.id
        WHERE v.organization_id = p_organization_id
            AND v.created_at >= start_date
            AND v.created_at < end_date            
            AND v.fp IS NOT NULL
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
    base_temporal_data AS (
        -- Single scan with multiple aggregation levels
        SELECT 
            hour_of_day,
            day_of_week,
            week_number,
            tp_id,
            touchpoint_name,
            type,
            platform,
            fp,
            interaction_date,
            GROUPING(hour_of_day) as is_hourly_null,
            GROUPING(day_of_week) as is_daily_null,
            GROUPING(week_number) as is_weekly_null,
            GROUPING(tp_id) as is_touchpoint_null,
            COUNT(*) as interaction_count
        FROM filtered_visits
        GROUP BY GROUPING SETS (
            (hour_of_day, type, platform, interaction_date),     -- For hourly patterns
            (day_of_week, type, platform, interaction_date),     -- For daily patterns  
            (week_number, fp, interaction_date),                 -- For weekly trends
            (tp_id, touchpoint_name, hour_of_day, day_of_week, fp, interaction_date)  -- For touchpoint patterns
        )
    ),
    hourly_patterns AS (
        -- Derive hourly patterns from base data
        SELECT 
            hour_of_day,
            SUM(interaction_count) as total_interactions,
            COUNT(DISTINCT interaction_date) as active_days,
            -- Interaction type breakdown
            SUM(CASE WHEN type = 'LINK' THEN interaction_count ELSE 0 END) as link_interactions,
            SUM(CASE WHEN type = 'QR' THEN interaction_count ELSE 0 END) as qr_interactions,
            SUM(CASE WHEN type = 'NFC' THEN interaction_count ELSE 0 END) as nfc_interactions,
            SUM(CASE WHEN type = 'WIFI' THEN interaction_count ELSE 0 END) as wifi_interactions,
            -- Platform breakdown
            SUM(CASE WHEN platform = 'Mobile' THEN interaction_count ELSE 0 END) as mobile_interactions,
            SUM(CASE WHEN platform = 'Desktop' THEN interaction_count ELSE 0 END) as desktop_interactions,
            -- Calculate unique users separately to avoid grouping issues
            (SELECT COUNT(DISTINCT fp) FROM filtered_visits WHERE EXTRACT(hour FROM created_at AT TIME ZONE p_timezone) = btd.hour_of_day) as unique_users,
            (SELECT COUNT(DISTINCT tp_id) FROM filtered_visits WHERE EXTRACT(hour FROM created_at AT TIME ZONE p_timezone) = btd.hour_of_day) as active_touchpoints
        FROM base_temporal_data btd
        WHERE is_hourly_null = 0 AND hour_of_day IS NOT NULL
        GROUP BY hour_of_day
    ),
    hourly_patterns_with_metrics AS (
        -- Add calculated metrics to hourly patterns
        SELECT 
            *,
            ROUND(total_interactions::DECIMAL / NULLIF(unique_users, 0), 2) as interactions_per_user,
            ROUND(total_interactions::DECIMAL / NULLIF(active_days, 0), 1) as avg_interactions_per_day
        FROM hourly_patterns
    ),
    daily_patterns AS (
        -- Derive daily patterns from base data
        SELECT 
            day_of_week,
            CASE day_of_week
                WHEN 0 THEN 'Sunday'
                WHEN 1 THEN 'Monday'
                WHEN 2 THEN 'Tuesday'
                WHEN 3 THEN 'Wednesday'
                WHEN 4 THEN 'Thursday'
                WHEN 5 THEN 'Friday'
                WHEN 6 THEN 'Saturday'
            END as day_name,
            SUM(interaction_count) as total_interactions,
            COUNT(DISTINCT interaction_date) as occurrences,
            -- Interaction type breakdown
            SUM(CASE WHEN type = 'LINK' THEN interaction_count ELSE 0 END) as link_interactions,
            SUM(CASE WHEN type = 'QR' THEN interaction_count ELSE 0 END) as qr_interactions,
            SUM(CASE WHEN type = 'NFC' THEN interaction_count ELSE 0 END) as nfc_interactions,
            SUM(CASE WHEN type = 'WIFI' THEN interaction_count ELSE 0 END) as wifi_interactions,
            -- Calculate unique users separately
            (SELECT COUNT(DISTINCT fp) FROM filtered_visits WHERE EXTRACT(dow FROM created_at AT TIME ZONE p_timezone) = btd.day_of_week) as unique_users,
            (SELECT COUNT(DISTINCT tp_id) FROM filtered_visits WHERE EXTRACT(dow FROM created_at AT TIME ZONE p_timezone) = btd.day_of_week) as active_touchpoints
        FROM base_temporal_data btd
        WHERE is_daily_null = 0 AND day_of_week IS NOT NULL
        GROUP BY day_of_week
    ),
    daily_patterns_with_metrics AS (
        -- Add calculated metrics to daily patterns
        SELECT 
            *,
            ROUND(total_interactions::DECIMAL / NULLIF(unique_users, 0), 2) as interactions_per_user,
            ROUND(total_interactions::DECIMAL / NULLIF(occurrences, 0), 1) as avg_interactions_per_occurrence
        FROM daily_patterns
    ),
    weekly_trends AS (
        -- Derive weekly trends from base data (Premium feature)
        SELECT 
            week_number,
            SUM(interaction_count) as total_interactions,
            COUNT(DISTINCT fp) as unique_users,
            COUNT(DISTINCT interaction_date) as active_days,
            (SELECT COUNT(DISTINCT tp_id) FROM filtered_visits WHERE EXTRACT(week FROM created_at AT TIME ZONE p_timezone) = btd.week_number) as active_touchpoints
        FROM base_temporal_data btd
        WHERE is_weekly_null = 0 AND week_number IS NOT NULL
        GROUP BY week_number
    ),
    weekly_trends_with_metrics AS (
        -- Add calculated metrics to weekly trends
        SELECT 
            *,
            ROUND(total_interactions::DECIMAL / NULLIF(unique_users, 0), 2) as interactions_per_user,
            ROUND(total_interactions::DECIMAL / NULLIF(active_days, 0), 1) as avg_interactions_per_day
        FROM weekly_trends
        ORDER BY week_number
    ),
    touchpoint_temporal_patterns AS (
        -- Analyze temporal patterns by touchpoint (Premium feature)
        SELECT 
            tp_id,
            touchpoint_name,
            COUNT(DISTINCT hour_of_day) as hours_active,
            COUNT(DISTINCT day_of_week) as days_of_week_active,
            SUM(interaction_count) as total_interactions,
            COUNT(DISTINCT fp) as unique_users,
            COUNT(DISTINCT interaction_date) as active_days,
            -- Peak periods (using mode approximation)
            (array_agg(hour_of_day ORDER BY interaction_count DESC))[1] as peak_hour,
            (array_agg(day_of_week ORDER BY interaction_count DESC))[1] as peak_day_of_week,
            -- Time-based engagement
            ROUND(SUM(interaction_count)::DECIMAL / NULLIF(COUNT(DISTINCT interaction_date), 0), 1) as avg_daily_interactions,
            CASE 
                WHEN COUNT(DISTINCT hour_of_day) >= 20 THEN 'all_day'
                WHEN COUNT(DISTINCT hour_of_day) >= 12 THEN 'extended_hours'
                WHEN COUNT(DISTINCT hour_of_day) >= 6 THEN 'moderate_hours'
                ELSE 'limited_hours'
            END as activity_spread,
            CASE 
                WHEN COUNT(DISTINCT day_of_week) = 7 THEN 'all_week'
                WHEN COUNT(DISTINCT day_of_week) >= 5 THEN 'most_days'
                WHEN COUNT(DISTINCT day_of_week) >= 3 THEN 'some_days'
                ELSE 'few_days'
            END as weekly_consistency
        FROM base_temporal_data btd
        WHERE is_touchpoint_null = 0 AND tp_id IS NOT NULL
        GROUP BY tp_id, touchpoint_name
    ),
    peak_activity_analysis AS (        
        SELECT 
            (SELECT hour_of_day FROM hourly_patterns_with_metrics ORDER BY total_interactions DESC LIMIT 1) as peak_hour,
            (SELECT total_interactions FROM hourly_patterns_with_metrics ORDER BY total_interactions DESC LIMIT 1) as peak_hour_interactions,
            (SELECT day_name FROM daily_patterns_with_metrics ORDER BY total_interactions DESC LIMIT 1) as peak_day,
            (SELECT total_interactions FROM daily_patterns_with_metrics ORDER BY total_interactions DESC LIMIT 1) as peak_day_interactions,
            (SELECT hour_of_day FROM hourly_patterns_with_metrics ORDER BY total_interactions ASC LIMIT 1) as lowest_hour,
            (SELECT total_interactions FROM hourly_patterns_with_metrics ORDER BY total_interactions ASC LIMIT 1) as lowest_hour_interactions,
            (SELECT day_name FROM daily_patterns_with_metrics ORDER BY total_interactions ASC LIMIT 1) as lowest_day,
            (SELECT total_interactions FROM daily_patterns_with_metrics ORDER BY total_interactions ASC LIMIT 1) as lowest_day_interactions
    ),
    temporal_insights AS (
        -- Generate temporal behavior insights from raw data
        SELECT 
            COUNT(DISTINCT fp) as total_users,
            COUNT(*) as total_interactions,
            COUNT(DISTINCT interaction_date) as total_active_days,
            COUNT(DISTINCT tp_id) as total_active_touchpoints,
            -- Temporal distribution metrics
            ROUND(AVG(hour_of_day), 1) as avg_interaction_hour,
            (array_agg(hour_of_day ORDER BY hour_of_day))[COUNT(*)/2] as most_common_hour, -- Median approximation
            (array_agg(day_of_week ORDER BY day_of_week))[COUNT(*)/2] as most_common_day, -- Median approximation
            -- Activity consistency
            COUNT(DISTINCT hour_of_day) as unique_hours_active,
            COUNT(DISTINCT day_of_week) as unique_days_active
        FROM filtered_visits
    ),
    temporal_insights_with_patterns AS (
        -- Add pattern classifications
        SELECT 
            *,
            CASE 
                WHEN most_common_hour BETWEEN 6 AND 8 THEN 'morning_peak'
                WHEN most_common_hour BETWEEN 9 AND 17 THEN 'business_hours'
                WHEN most_common_hour BETWEEN 18 AND 22 THEN 'evening_peak'
                WHEN most_common_hour BETWEEN 23 AND 23 OR most_common_hour BETWEEN 0 AND 5 THEN 'late_night'
                ELSE 'varied'
            END as activity_pattern,
            CASE 
                WHEN most_common_day IN (1,2,3,4,5) THEN 'weekday_focused'
                WHEN most_common_day IN (0,6) THEN 'weekend_focused'
                ELSE 'balanced'
            END as weekly_pattern
        FROM temporal_insights
    ),
    activity_concentration AS (
        -- Calculate activity concentration metrics
        SELECT 
            (SELECT COUNT(*) FROM hourly_patterns_with_metrics WHERE total_interactions >= (SELECT AVG(total_interactions) FROM hourly_patterns_with_metrics)) as above_avg_hours,
            (SELECT COUNT(*) FROM daily_patterns_with_metrics WHERE total_interactions >= (SELECT AVG(total_interactions) FROM daily_patterns_with_metrics)) as above_avg_days
    )
    SELECT json_build_object(
        'period_info', json_build_object(
            'period_days', p_period_days,
            'start_date', start_date,
            'end_date', end_date,
            'timezone', p_timezone,
            'is_premium', p_is_premium,
            'analysis_type', 'temporal_patterns'
        ),
        'filters_applied', json_build_object(
            'has_filters', (p_tag_ids IS NOT NULL OR p_touchpoint_ids IS NOT NULL),
            'tags_count', COALESCE(array_length(p_tag_ids, 1), 0),
            'touchpoints_count', COALESCE(array_length(p_touchpoint_ids, 1), 0)
        ),
        'temporal_analysis', json_build_object(
            -- Hourly activity patterns
            'hourly_patterns', (
                SELECT json_agg(
                    json_build_object(
                        'hour', hour_of_day,
                        'total_interactions', total_interactions,
                        'unique_users', unique_users,
                        'interactions_per_user', interactions_per_user,
                        'avg_interactions_per_day', avg_interactions_per_day,
                        'active_touchpoints', active_touchpoints,
                        'interaction_breakdown', json_build_object(
                            'link_interactions', link_interactions,
                            'qr_interactions', qr_interactions,
                            'nfc_interactions', nfc_interactions,
                            'wifi_interactions', wifi_interactions
                        ),
                        'platform_breakdown', json_build_object(
                            'mobile_interactions', mobile_interactions,
                            'desktop_interactions', desktop_interactions
                        )
                    )
                )
                FROM (
                    SELECT * FROM hourly_patterns_with_metrics ORDER BY hour_of_day
                ) ordered_hourly
            ),
            -- Daily patterns
            'daily_patterns', (
                SELECT json_agg(
                    json_build_object(
                        'day_of_week', day_of_week,
                        'day_name', day_name,
                        'total_interactions', total_interactions,
                        'unique_users', unique_users,
                        'interactions_per_user', interactions_per_user,
                        'avg_interactions_per_occurrence', avg_interactions_per_occurrence,
                        'occurrences', occurrences,
                        'active_touchpoints', active_touchpoints,
                        'interaction_breakdown', json_build_object(
                            'link_interactions', link_interactions,
                            'qr_interactions', qr_interactions,
                            'nfc_interactions', nfc_interactions,
                            'wifi_interactions', wifi_interactions
                        )
                    )
                )
                FROM (
                    SELECT * FROM daily_patterns_with_metrics ORDER BY day_of_week
                ) ordered_daily
            ),
            -- Weekly trends (Premium feature)
            'weekly_trends', CASE 
                WHEN p_is_premium THEN
                    (
                        SELECT json_agg(
                            json_build_object(
                                'week_number', week_number,
                                'total_interactions', total_interactions,
                                'unique_users', unique_users,
                                'interactions_per_user', interactions_per_user,
                                'avg_interactions_per_day', avg_interactions_per_day,
                                'active_touchpoints', active_touchpoints,
                                'active_days', active_days
                            )
                        )
                        FROM weekly_trends_with_metrics
                    )
                ELSE NULL
            END,
            -- Touchpoint temporal patterns (Premium feature)
            'touchpoint_temporal_patterns', CASE 
                WHEN p_is_premium THEN
                    (
                        SELECT json_agg(
                            json_build_object(
                                'touchpoint_name', touchpoint_name,
                                'peak_hour', peak_hour,
                                'peak_day_of_week', peak_day_of_week,
                                'total_interactions', total_interactions,
                                'unique_users', unique_users,
                                'avg_daily_interactions', avg_daily_interactions,
                                'activity_spread', activity_spread,
                                'weekly_consistency', weekly_consistency,
                                'hours_active', hours_active,
                                'days_of_week_active', days_of_week_active
                            )
                        )
                        FROM (
                            SELECT * FROM touchpoint_temporal_patterns ORDER BY total_interactions DESC
                        ) ordered_touchpoints
                    )
                ELSE NULL
            END
        ),
        'insights', json_build_object(
            -- Peak activity analysis
            'peak_activity', (
                SELECT json_build_object(
                    'peak_periods', json_build_object(
                        'peak_hour', json_build_object(
                            'hour', peak_hour,
                            'interactions', peak_hour_interactions
                        ),
                        'peak_day', json_build_object(
                            'day', peak_day,
                            'interactions', peak_day_interactions
                        )
                    ),
                    'low_activity_periods', json_build_object(
                        'lowest_hour', json_build_object(
                            'hour', lowest_hour,
                            'interactions', lowest_hour_interactions
                        ),
                        'lowest_day', json_build_object(
                            'day', lowest_day,
                            'interactions', lowest_day_interactions
                        )
                    ),
                    'activity_concentration', json_build_object(
                        'above_avg_hours', ac.above_avg_hours,
                        'above_avg_days', ac.above_avg_days,
                        'concentration_score', ROUND((ac.above_avg_hours::DECIMAL / 24 + ac.above_avg_days::DECIMAL / 7) / 2 * 100, 1)
                    )
                )
                FROM peak_activity_analysis paa
                CROSS JOIN activity_concentration ac
            ),
            -- Temporal behavior summary
            'temporal_summary', (
                SELECT json_build_object(
                    'total_users', total_users,
                    'total_interactions', total_interactions,
                    'total_active_days', total_active_days,
                    'avg_interaction_hour', avg_interaction_hour,
                    'most_common_hour', most_common_hour,
                    'most_common_day', most_common_day,
                    'unique_hours_active', unique_hours_active,
                    'unique_days_active', unique_days_active,
                    'activity_pattern', activity_pattern,
                    'weekly_pattern', weekly_pattern,
                    'temporal_diversity', json_build_object(
                        'hour_spread_percentage', ROUND(unique_hours_active::DECIMAL / 24 * 100, 1),
                        'day_spread_percentage', ROUND(unique_days_active::DECIMAL / 7 * 100, 1)
                    )
                )
                FROM temporal_insights_with_patterns
            ),
            -- Timing optimization recommendations
            'recommendations', CASE 
                WHEN p_is_premium THEN
                (
                    SELECT json_agg(
                        json_build_object(
                            'recommendation_type', recommendation_type,
                            'priority', priority,
                            'category', category,
                            'metric_key', metric_key,
                            'threshold', threshold,
                            'current_value', current_value,
                            'improvement_potential', improvement_potential
                        )
                    )
                    FROM (
                        SELECT 
                            'optimize_peak_hours' as recommendation_type,
                            'high' as priority,
                            'timing_optimization' as category,
                            'peak_hour' as metric_key,
                            null::TEXT as threshold,
                            paa.peak_hour::TEXT as current_value,
                            'schedule_campaigns_during_peak' as improvement_potential
                        FROM peak_activity_analysis paa
                        
                        UNION ALL
                        
                        SELECT 
                            'leverage_peak_day' as recommendation_type,
                            'high' as priority,
                            'weekly_optimization' as category,
                            'peak_day' as metric_key,
                            null::TEXT as threshold,
                            paa.peak_day::TEXT as current_value,   
                            'focus_weekly_campaigns' as improvement_potential
                        FROM peak_activity_analysis paa
                        
                        UNION ALL
                        
                        SELECT 
                            'improve_low_activity_periods' as recommendation_type,
                            'medium' as priority,
                            'coverage_optimization' as category,
                            'activity_concentration' as metric_key,
                            '60.0'::TEXT as threshold,
                            ROUND(ac.above_avg_hours::DECIMAL / 24 * 100, 1)::TEXT as current_value,  
                            'increase_off_peak_engagement' as improvement_potential
                        FROM activity_concentration ac
                        WHERE (ac.above_avg_hours::DECIMAL / 24 * 100) < 60
                        
                        UNION ALL
                        
                        SELECT 
                            'expand_temporal_reach' as recommendation_type,
                            'low' as priority,
                            'reach_optimization' as category,
                            'temporal_diversity' as metric_key,
                            '80.0'::TEXT as threshold,
                            ROUND(ti.unique_hours_active::DECIMAL / 24 * 100, 1)::TEXT as current_value, 
                            'diversify_interaction_times' as improvement_potential
                        FROM temporal_insights_with_patterns ti
                        WHERE (ti.unique_hours_active::DECIMAL / 24 * 100) < 80
                        
                    ) recommendations
                )
                ELSE 
                    NULL
            END
        )
    ) INTO result;
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'error', TRUE,
        'message', SQLERRM,
        'organization_id', p_organization_id
    );
END;
$function$
