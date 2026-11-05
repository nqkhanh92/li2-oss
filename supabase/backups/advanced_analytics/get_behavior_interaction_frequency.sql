CREATE OR REPLACE FUNCTION public.get_behavior_interaction_frequency(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false)
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
            DATE(v.created_at AT TIME ZONE p_timezone) as visit_date,
            EXTRACT(hour FROM v.created_at AT TIME ZONE p_timezone) as visit_hour,
            EXTRACT(dow FROM v.created_at AT TIME ZONE p_timezone) as day_of_week
        FROM visits v
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
    daily_frequency_analysis AS (
        -- Analyze daily interaction patterns
        SELECT 
            visit_date,
            COUNT(*) as total_interactions,
            COUNT(DISTINCT fp) as unique_users,
            COUNT(DISTINCT tp_id) as active_touchpoints,
            -- Interaction type breakdown
            COUNT(CASE WHEN type = 'LINK' THEN 1 END) as link_interactions,
            COUNT(CASE WHEN type = 'QR' THEN 1 END) as qr_interactions,
            COUNT(CASE WHEN type = 'NFC' THEN 1 END) as nfc_interactions,
            COUNT(CASE WHEN type = 'WIFI' THEN 1 END) as wifi_interactions,
            -- Platform breakdown
            COUNT(CASE WHEN platform = 'Mobile' THEN 1 END) as mobile_interactions,
            COUNT(CASE WHEN platform = 'Desktop' THEN 1 END) as desktop_interactions,
            -- Engagement metrics
            ROUND(COUNT(*)::DECIMAL / NULLIF(COUNT(DISTINCT fp), 0), 2) as interactions_per_user,
            -- Peak hour identification
            MODE() WITHIN GROUP (ORDER BY visit_hour) as peak_hour
        FROM filtered_visits
        GROUP BY visit_date
        ORDER BY visit_date
    ),
    hourly_frequency_analysis AS (
        -- Analyze hourly patterns across all days
        SELECT 
            visit_hour,
            COUNT(*) as total_interactions,
            COUNT(DISTINCT fp) as unique_users,
            COUNT(DISTINCT visit_date) as active_days,
            ROUND(COUNT(*)::DECIMAL / NULLIF(COUNT(DISTINCT visit_date), 0), 1) as avg_interactions_per_day,
            ROUND(COUNT(DISTINCT fp)::DECIMAL / NULLIF(COUNT(DISTINCT visit_date), 0), 1) as avg_users_per_day
        FROM filtered_visits
        GROUP BY visit_hour
        ORDER BY visit_hour
    ),
    day_of_week_analysis AS (
        -- Analyze day-of-week patterns
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
            COUNT(*) as total_interactions,
            COUNT(DISTINCT fp) as unique_users,
            COUNT(DISTINCT visit_date) as occurrences,
            ROUND(COUNT(*)::DECIMAL / NULLIF(COUNT(DISTINCT visit_date), 0), 1) as avg_interactions_per_occurrence,
            ROUND(COUNT(DISTINCT fp)::DECIMAL / NULLIF(COUNT(DISTINCT visit_date), 0), 1) as avg_users_per_occurrence
        FROM filtered_visits
        GROUP BY day_of_week
        ORDER BY day_of_week
    ),
    user_frequency_segments AS (
        -- Analyze user interaction frequency patterns
        SELECT 
            fp,
            COUNT(*) as total_interactions,
            COUNT(DISTINCT visit_date) as active_days,
            COUNT(DISTINCT tp_id) as unique_touchpoints,
            ROUND(COUNT(*)::DECIMAL / NULLIF(COUNT(DISTINCT visit_date), 0), 2) as interactions_per_day,
            -- Classify users by frequency
            CASE 
                WHEN COUNT(*) = 1 THEN 'one_time'
                WHEN COUNT(*) BETWEEN 2 AND 5 THEN 'occasional'
                WHEN COUNT(*) BETWEEN 6 AND 15 THEN 'regular'
                WHEN COUNT(*) > 15 THEN 'frequent'
            END as frequency_segment,
            -- Classify by consistency
            CASE 
                WHEN COUNT(DISTINCT visit_date) = 1 THEN 'single_day'
                WHEN COUNT(DISTINCT visit_date)::DECIMAL / p_period_days > 0.7 THEN 'highly_consistent'
                WHEN COUNT(DISTINCT visit_date)::DECIMAL / p_period_days > 0.3 THEN 'moderately_consistent'
                ELSE 'sporadic'
            END as consistency_segment
        FROM filtered_visits
        GROUP BY fp
    ),
    frequency_distribution AS (
        -- Aggregate frequency segments
        SELECT 
            frequency_segment,
            consistency_segment,
            COUNT(*) as user_count,
            ROUND(AVG(total_interactions), 2) as avg_interactions,
            ROUND(AVG(active_days), 2) as avg_active_days,
            ROUND(AVG(interactions_per_day), 2) as avg_interactions_per_day
        FROM user_frequency_segments
        GROUP BY frequency_segment, consistency_segment
    ),
    peak_periods AS (
        -- Identify peak activity periods
        SELECT 
            -- Peak day of week
            (SELECT day_name FROM day_of_week_analysis ORDER BY total_interactions DESC LIMIT 1) as peak_day,
            (SELECT total_interactions FROM day_of_week_analysis ORDER BY total_interactions DESC LIMIT 1) as peak_day_interactions,
            -- Peak hour
            (SELECT visit_hour FROM hourly_frequency_analysis ORDER BY total_interactions DESC LIMIT 1) as peak_hour,
            (SELECT total_interactions FROM hourly_frequency_analysis ORDER BY total_interactions DESC LIMIT 1) as peak_hour_interactions,
            -- Low activity periods
            (SELECT day_name FROM day_of_week_analysis ORDER BY total_interactions ASC LIMIT 1) as lowest_day,
            (SELECT visit_hour FROM hourly_frequency_analysis ORDER BY total_interactions ASC LIMIT 1) as lowest_hour
    ),
    frequency_insights AS (
        -- Generate behavioral insights
        SELECT 
            -- User distribution
            (SELECT COUNT(*) FROM user_frequency_segments WHERE frequency_segment = 'one_time') as one_time_users,
            (SELECT COUNT(*) FROM user_frequency_segments WHERE frequency_segment = 'occasional') as occasional_users,
            (SELECT COUNT(*) FROM user_frequency_segments WHERE frequency_segment = 'regular') as regular_users,
            (SELECT COUNT(*) FROM user_frequency_segments WHERE frequency_segment = 'frequent') as frequent_users,
            -- Consistency distribution
            (SELECT COUNT(*) FROM user_frequency_segments WHERE consistency_segment = 'highly_consistent') as highly_consistent_users,
            (SELECT COUNT(*) FROM user_frequency_segments WHERE consistency_segment = 'moderately_consistent') as moderately_consistent_users,
            (SELECT COUNT(*) FROM user_frequency_segments WHERE consistency_segment = 'sporadic') as sporadic_users,
            -- Overall metrics
            (SELECT COUNT(DISTINCT fp) FROM filtered_visits) as total_unique_users,
            (SELECT COUNT(*) FROM filtered_visits) as total_interactions,
            (SELECT COUNT(DISTINCT visit_date) FROM filtered_visits) as total_active_days
    )
    SELECT json_build_object(
        'period_info', json_build_object(
            'period_days', p_period_days,
            'start_date', start_date,
            'end_date', end_date,
            'timezone', p_timezone,
            'is_premium', p_is_premium,
            'analysis_type', 'interaction_frequency'
        ),
        'filters_applied', json_build_object(
            'has_filters', (p_tag_ids IS NOT NULL OR p_touchpoint_ids IS NOT NULL),
            'tags_count', COALESCE(array_length(p_tag_ids, 1), 0),
            'touchpoints_count', COALESCE(array_length(p_touchpoint_ids, 1), 0)
        ),
        'frequency_analysis', json_build_object(
            -- Daily trends
            'daily_patterns', (
                SELECT json_agg(
                    json_build_object(
                        'date', visit_date,
                        'total_interactions', total_interactions,
                        'unique_users', unique_users,
                        'interactions_per_user', interactions_per_user,
                        'active_touchpoints', active_touchpoints,
                        'peak_hour', peak_hour,
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
                    ) ORDER BY visit_date
                )
                FROM daily_frequency_analysis
            ),
            -- Hourly patterns
            'hourly_patterns', (
                SELECT json_agg(
                    json_build_object(
                        'hour', visit_hour,
                        'total_interactions', total_interactions,
                        'unique_users', unique_users,
                        'avg_interactions_per_day', avg_interactions_per_day,
                        'avg_users_per_day', avg_users_per_day,
                        'active_days', active_days
                    ) ORDER BY visit_hour
                )
                FROM hourly_frequency_analysis
            ),
            -- Day of week patterns
            'day_of_week_patterns', (
                SELECT json_agg(
                    json_build_object(
                        'day_of_week', day_of_week,
                        'day_name', day_name,
                        'total_interactions', total_interactions,
                        'unique_users', unique_users,
                        'avg_interactions_per_occurrence', avg_interactions_per_occurrence,
                        'avg_users_per_occurrence', avg_users_per_occurrence,
                        'occurrences', occurrences
                    ) ORDER BY day_of_week
                )
                FROM day_of_week_analysis
            ),
            -- User frequency distribution
            'user_frequency_distribution', CASE 
                WHEN p_is_premium THEN
                    (
                        SELECT json_agg(
                            json_build_object(
                                'frequency_segment', frequency_segment,
                                'consistency_segment', consistency_segment,
                                'user_count', user_count,
                                'avg_interactions', avg_interactions,
                                'avg_active_days', avg_active_days,
                                'avg_interactions_per_day', avg_interactions_per_day
                            )
                        )
                        FROM frequency_distribution
                    )
                ELSE NULL
            END
        ),
        'insights', json_build_object(
            -- Peak activity insights
            'peak_periods', (
                SELECT json_build_object(
                    'peak_day', json_build_object(
                        'day', peak_day,
                        'interactions', peak_day_interactions
                    ),
                    'peak_hour', json_build_object(
                        'hour', peak_hour,
                        'interactions', peak_hour_interactions
                    ),
                    'lowest_activity', json_build_object(
                        'day', lowest_day,
                        'hour', lowest_hour
                    )
                )
                FROM peak_periods
            ),
            -- User behavior insights
            'user_behavior_summary', (
                SELECT json_build_object(
                    'total_users', total_unique_users,
                    'total_interactions', total_interactions,
                    'active_days', total_active_days,
                    'avg_interactions_per_user', ROUND(total_interactions::DECIMAL / NULLIF(total_unique_users, 0), 2),
                    'avg_interactions_per_day', ROUND(total_interactions::DECIMAL / NULLIF(total_active_days, 0), 1),
                    'frequency_distribution', json_build_object(
                        'one_time_users', one_time_users,
                        'occasional_users', occasional_users,
                        'regular_users', regular_users,
                        'frequent_users', frequent_users
                    ),
                    'consistency_distribution', CASE 
                        WHEN p_is_premium THEN
                            json_build_object(
                                'highly_consistent', highly_consistent_users,
                                'moderately_consistent', moderately_consistent_users,
                                'sporadic', sporadic_users
                            )
                        ELSE NULL
                    END
                )
                FROM frequency_insights
            ),
            -- Behavioral recommendations
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
                            'high_one_time_users' as recommendation_type,
                            'high' as priority,
                            'retention' as category,
                            'one_time_user_rate' as metric_key,
                            0.6 as threshold,
                            ROUND(fi.one_time_users::DECIMAL / fi.total_unique_users, 3) as current_value,
                            'implement_follow_up_campaigns' as improvement_potential
                        FROM frequency_insights fi
                        WHERE fi.one_time_users::DECIMAL / fi.total_unique_users > 0.6
                        
                        UNION ALL
                        
                        SELECT 
                            'strong_frequent_users' as recommendation_type,
                            'medium' as priority,
                            'loyalty' as category,
                            'frequent_user_rate' as metric_key,
                            0.2 as threshold,
                            ROUND(fi.frequent_users::DECIMAL / fi.total_unique_users, 3) as current_value,
                            'implement_loyalty_programs' as improvement_potential
                        FROM frequency_insights fi
                        WHERE fi.frequent_users::DECIMAL / fi.total_unique_users > 0.2
                        
                        UNION ALL
                        
                        SELECT 
                            'business_hours_peak' as recommendation_type,
                            'medium' as priority,
                            'timing_optimization' as category,
                            'peak_hour' as metric_key,
                            9 as threshold,
                            pp.peak_hour as current_value,
                            'optimize_for_professional_use' as improvement_potential
                        FROM peak_periods pp
                        WHERE pp.peak_hour BETWEEN 9 AND 17
                        
                        UNION ALL
                        
                        SELECT 
                            'evening_peak' as recommendation_type,
                            'medium' as priority,
                            'timing_optimization' as category,
                            'peak_hour' as metric_key,
                            18 as threshold,
                            pp.peak_hour as current_value,
                            'focus_on_leisure_marketing' as improvement_potential
                        FROM peak_periods pp
                        WHERE pp.peak_hour BETWEEN 18 AND 22
                        
                        UNION ALL
                        
                        SELECT 
                            'high_sporadic_usage' as recommendation_type,
                            'high' as priority,
                            'engagement_consistency' as category,
                            'sporadic_user_rate' as metric_key,
                            0.5 as threshold,
                            ROUND(fi.sporadic_users::DECIMAL / fi.total_unique_users, 3) as current_value,
                            'improve_content_scheduling' as improvement_potential
                        FROM frequency_insights fi
                        WHERE fi.sporadic_users::DECIMAL / fi.total_unique_users > 0.5
                        
                        UNION ALL
                        
                        SELECT 
                            'low_engagement_consistency' as recommendation_type,
                            'medium' as priority,
                            'user_experience' as category,
                            'consistent_user_rate' as metric_key,
                            0.3 as threshold,
                            ROUND(fi.highly_consistent_users::DECIMAL / fi.total_unique_users, 3) as current_value,
                            'enhance_user_experience' as improvement_potential
                        FROM frequency_insights fi
                        WHERE fi.highly_consistent_users::DECIMAL / fi.total_unique_users < 0.3
                        
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
