CREATE OR REPLACE FUNCTION public.get_behavior_user_journeys(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false)
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
            tp.name as touchpoint_name
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
    user_journeys AS (
        -- Analyze individual user journeys
        SELECT 
            fp,
            COUNT(*) as total_interactions,
            COUNT(DISTINCT tp_id) as unique_touchpoints_visited,
            COUNT(DISTINCT type) as interaction_types_used,
            COUNT(DISTINCT DATE(created_at AT TIME ZONE p_timezone)) as active_days,
            MIN(created_at) as journey_start,
            MAX(created_at) as journey_end,
            EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 60 as journey_duration_minutes,
            -- Get first touchpoint using MIN(created_at)
            (array_agg(tp_id ORDER BY created_at))[1] as first_touchpoint_id,
            (array_agg(touchpoint_name ORDER BY created_at))[1] as first_touchpoint_name,
            (array_agg(type ORDER BY created_at))[1] as first_interaction_type,
            -- Get last touchpoint using MAX(created_at)
            (array_agg(tp_id ORDER BY created_at DESC))[1] as last_touchpoint_id,
            (array_agg(touchpoint_name ORDER BY created_at DESC))[1] as last_touchpoint_name,
            (array_agg(type ORDER BY created_at DESC))[1] as last_interaction_type,
            -- Journey classification
            CASE 
                WHEN COUNT(DISTINCT tp_id) = 1 THEN 'single_touchpoint'
                WHEN COUNT(DISTINCT tp_id) = 2 THEN 'two_touchpoint'
                WHEN COUNT(DISTINCT tp_id) >= 3 THEN 'multi_touchpoint'
            END as journey_complexity,
            -- Interaction patterns
            CASE 
                WHEN COUNT(DISTINCT type) = 1 THEN 'single_method'
                WHEN COUNT(DISTINCT type) >= 2 THEN 'multi_method'
            END as interaction_diversity
        FROM filtered_visits
        GROUP BY fp
    ),
    journey_patterns AS (
        -- Analyze journey patterns and flows
        SELECT 
            journey_complexity,
            interaction_diversity,
            COUNT(*) as users_count,
            ROUND(AVG(total_interactions), 2) as avg_interactions_per_journey,
            ROUND(AVG(unique_touchpoints_visited), 2) as avg_touchpoints_per_journey,
            ROUND(AVG(journey_duration_minutes), 1) as avg_journey_duration_minutes,
            ROUND(AVG(active_days), 2) as avg_active_days
        FROM user_journeys
        GROUP BY journey_complexity, interaction_diversity
    ),
    journey_patterns_with_percentages AS (
        -- Calculate percentages using window function
        SELECT 
            *,
            ROUND(users_count::DECIMAL / SUM(users_count) OVER() * 100, 1) as pattern_percentage
        FROM journey_patterns
    ),
    touchpoint_transitions AS (
        -- Analyze touchpoint-to-touchpoint flows (Premium feature)
        SELECT 
            lag_tp_name as from_touchpoint,
            current_tp_name as to_touchpoint,
            lag_type as from_interaction_type,
            current_type as to_interaction_type,
            COUNT(*) as transition_count,
            COUNT(DISTINCT fp) as unique_users,
            ROUND(AVG(time_between_minutes), 1) as avg_time_between_minutes
        FROM (
            SELECT 
                fv.fp,
                fv.touchpoint_name as current_tp_name,
                fv.type as current_type,
                LAG(fv.touchpoint_name) OVER (PARTITION BY fv.fp ORDER BY fv.created_at) as lag_tp_name,
                LAG(fv.type) OVER (PARTITION BY fv.fp ORDER BY fv.created_at) as lag_type,
                EXTRACT(EPOCH FROM (fv.created_at - LAG(fv.created_at) OVER (PARTITION BY fv.fp ORDER BY fv.created_at))) / 60 as time_between_minutes
            FROM filtered_visits fv
        ) transitions
        WHERE lag_tp_name IS NOT NULL
            AND lag_tp_name != current_tp_name -- Only cross-touchpoint transitions
        GROUP BY lag_tp_name, current_tp_name, lag_type, current_type
        HAVING COUNT(*) >= 3 -- Only significant transition patterns
    ),
    entry_exit_analysis AS (
        -- Analyze entry and exit touchpoints
        SELECT 
            'entry' as touchpoint_role,
            first_touchpoint_name as touchpoint_name,
            first_interaction_type as interaction_type,
            COUNT(*) as users_count,
            ROUND(AVG(total_interactions), 2) as avg_interactions,
            ROUND(AVG(journey_duration_minutes), 1) as avg_journey_duration,
            ROUND(COUNT(CASE WHEN journey_complexity != 'single_touchpoint' THEN 1 END)::DECIMAL / COUNT(*) * 100, 1) as effectiveness_metric
        FROM user_journeys
        GROUP BY first_touchpoint_name, first_interaction_type
        
        UNION ALL
        
        SELECT 
            'exit' as touchpoint_role,
            last_touchpoint_name as touchpoint_name,
            last_interaction_type as interaction_type,
            COUNT(*) as users_count,
            ROUND(AVG(total_interactions), 2) as avg_interactions,
            ROUND(AVG(journey_duration_minutes), 1) as avg_journey_duration,
            ROUND(COUNT(CASE WHEN journey_complexity != 'single_touchpoint' THEN 1 END)::DECIMAL / COUNT(*) * 100, 1) as effectiveness_metric 
        FROM user_journeys
        GROUP BY last_touchpoint_name, last_interaction_type
    ),
    journey_insights AS (
        -- Generate journey insights and metrics
        SELECT 
            COUNT(DISTINCT fp) as total_users,
            COUNT(*) as total_interactions_analyzed,
            ROUND(AVG(total_interactions), 2) as avg_interactions_per_user,
            ROUND(AVG(journey_duration_minutes), 1) as avg_journey_duration_minutes,
            ROUND(AVG(unique_touchpoints_visited), 2) as avg_touchpoints_per_user,
            -- Journey complexity distribution
            ROUND(COUNT(CASE WHEN journey_complexity = 'single_touchpoint' THEN 1 END)::DECIMAL / COUNT(*) * 100, 1) as single_touchpoint_percentage,
            ROUND(COUNT(CASE WHEN journey_complexity = 'two_touchpoint' THEN 1 END)::DECIMAL / COUNT(*) * 100, 1) as two_touchpoint_percentage,
            ROUND(COUNT(CASE WHEN journey_complexity = 'multi_touchpoint' THEN 1 END)::DECIMAL / COUNT(*) * 100, 1) as multi_touchpoint_percentage,
            -- Interaction diversity
            ROUND(COUNT(CASE WHEN interaction_diversity = 'multi_method' THEN 1 END)::DECIMAL / COUNT(*) * 100, 1) as multi_method_percentage,
            -- Duration insights
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY journey_duration_minutes) as median_journey_duration_minutes,
            MAX(journey_duration_minutes) as longest_journey_minutes,
            COUNT(CASE WHEN journey_duration_minutes > 60 THEN 1 END) as journeys_over_1_hour
        FROM user_journeys
    )
    SELECT json_build_object(
        'period_info', json_build_object(
            'period_days', p_period_days,
            'start_date', start_date,
            'end_date', end_date,
            'timezone', p_timezone,
            'is_premium', p_is_premium,
            'analysis_type', 'user_journeys'
        ),
        'filters_applied', json_build_object(
            'has_filters', (p_tag_ids IS NOT NULL OR p_touchpoint_ids IS NOT NULL),
            'tags_count', COALESCE(array_length(p_tag_ids, 1), 0),
            'touchpoints_count', COALESCE(array_length(p_touchpoint_ids, 1), 0)
        ),
        'journey_analysis', json_build_object(
            -- Journey patterns and complexity
            'journey_patterns', (
                SELECT json_agg(
                    json_build_object(
                        'complexity', journey_complexity,
                        'interaction_diversity', interaction_diversity,
                        'users_count', users_count,
                        'pattern_percentage', pattern_percentage,
                        'avg_interactions_per_journey', avg_interactions_per_journey,
                        'avg_touchpoints_per_journey', avg_touchpoints_per_journey,
                        'avg_journey_duration_minutes', avg_journey_duration_minutes,
                        'avg_active_days', avg_active_days
                    )
                )
                FROM (
                    SELECT *
                    FROM journey_patterns_with_percentages
                    ORDER BY users_count DESC
                ) ordered_patterns
            ),
            -- Entry and exit point analysis
            'entry_exit_analysis', (
                SELECT json_agg(
                    json_build_object(
                        'role', touchpoint_role,
                        'touchpoint_name', touchpoint_name,
                        'interaction_type', interaction_type,
                        'users_count', users_count,
                        'avg_interactions', avg_interactions,
                        'avg_journey_duration', avg_journey_duration,
                        'effectiveness_metric', effectiveness_metric
                    )
                )
                FROM (
                    SELECT *
                    FROM entry_exit_analysis
                    ORDER BY users_count DESC
                ) ordered_entry_exit
            ),
            -- Touchpoint transitions (Premium only)
            'touchpoint_transitions', CASE 
                WHEN p_is_premium THEN
                    (
                        SELECT json_agg(
                            json_build_object(
                                'from_touchpoint', from_touchpoint,
                                'to_touchpoint', to_touchpoint,
                                'from_interaction_type', from_interaction_type,
                                'to_interaction_type', to_interaction_type,
                                'transition_count', transition_count,
                                'unique_users', unique_users,
                                'avg_time_between_minutes', avg_time_between_minutes,
                                'flow_strength', CASE 
                                    WHEN transition_count >= 20 THEN 'strong'
                                    WHEN transition_count >= 10 THEN 'moderate'
                                    ELSE 'weak'
                                END
                            )
                        )
                        FROM (
                            SELECT *
                            FROM touchpoint_transitions
                            ORDER BY transition_count DESC
                            LIMIT CASE WHEN p_is_premium THEN 20 ELSE 5 END
                        ) ordered_transitions
                    )
                ELSE NULL
            END
        ),
        'insights', json_build_object(
            -- Journey summary metrics
            'journey_summary', (
                SELECT json_build_object(
                    'total_users', total_users,
                    'avg_interactions_per_user', avg_interactions_per_user,
                    'avg_journey_duration_minutes', avg_journey_duration_minutes,
                    'median_journey_duration_minutes', median_journey_duration_minutes,
                    'avg_touchpoints_per_user', avg_touchpoints_per_user,
                    'longest_journey_minutes', longest_journey_minutes,
                    'journeys_over_1_hour', journeys_over_1_hour,
                    'complexity_distribution', json_build_object(
                        'single_touchpoint_percentage', single_touchpoint_percentage,
                        'two_touchpoint_percentage', two_touchpoint_percentage,
                        'multi_touchpoint_percentage', multi_touchpoint_percentage
                    ),
                    'interaction_diversity', json_build_object(
                        'multi_method_percentage', multi_method_percentage
                    )
                )
                FROM journey_insights
            ),
            -- Journey optimization recommendations
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
                                'high_single_touchpoint_rate' as recommendation_type,
                                'high' as priority,
                                'journey_optimization' as category,
                                'single_touchpoint_percentage' as metric_key,
                                70.0 as threshold,
                                ji.single_touchpoint_percentage as current_value,
                                'create_touchpoint_connections' as improvement_potential
                            FROM journey_insights ji
                            WHERE ji.single_touchpoint_percentage > 70
                            
                            UNION ALL
                            
                            SELECT 
                                'low_multi_touchpoint_engagement' as recommendation_type,
                                'medium' as priority,
                                'engagement_depth' as category,
                                'multi_touchpoint_percentage' as metric_key,
                                20.0 as threshold,
                                ji.multi_touchpoint_percentage as current_value,
                                'improve_cross_touchpoint_flows' as improvement_potential
                            FROM journey_insights ji
                            WHERE ji.multi_touchpoint_percentage < 20
                            
                            UNION ALL
                            
                            SELECT 
                                'short_journey_duration' as recommendation_type,
                                'medium' as priority,
                                'user_engagement' as category,
                                'avg_journey_duration_minutes' as metric_key,
                                5.0 as threshold,
                                ji.avg_journey_duration_minutes as current_value,
                                'increase_engagement_depth' as improvement_potential
                            FROM journey_insights ji
                            WHERE ji.avg_journey_duration_minutes < 5
                            
                            UNION ALL
                            
                            SELECT 
                                'limited_interaction_diversity' as recommendation_type,
                                'low' as priority,
                                'interaction_optimization' as category,
                                'multi_method_percentage' as metric_key,
                                25.0 as threshold,
                                ji.multi_method_percentage as current_value,
                                'diversify_interaction_types' as improvement_potential
                            FROM journey_insights ji
                            WHERE ji.multi_method_percentage < 25
                            
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
