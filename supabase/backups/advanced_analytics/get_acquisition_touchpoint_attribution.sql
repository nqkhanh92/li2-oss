CREATE OR REPLACE FUNCTION public.get_acquisition_touchpoint_attribution(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false)
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
        -- Get visits with touchpoint and channel information
        SELECT 
            v.referrer,
            v.fp,
            v.type as interaction_channel,  -- QR, LINK, NFC, WIFI
            v.created_at,
            v.tp_id,
            v.platform,
            v.country,
            tp.name as touchpoint_name,
            -- Categorize discovery channels (how they found this touchpoint)
            CASE 
                WHEN v.referrer IS NULL OR v.referrer = '' OR v.referrer = 'direct' THEN 'direct'
                WHEN v.referrer ILIKE '%google%' THEN 'google'
                WHEN v.referrer ILIKE '%facebook%' THEN 'facebook'
                WHEN v.referrer ILIKE '%instagram%' THEN 'instagram'
                WHEN v.referrer ILIKE '%twitter%' OR v.referrer ILIKE '%x.com%' THEN 'twitter'
                WHEN v.referrer ILIKE '%linkedin%' THEN 'linkedin'
                WHEN v.referrer ILIKE '%youtube%' THEN 'youtube'
                WHEN v.referrer ILIKE '%tiktok%' THEN 'tiktok'
                WHEN v.referrer ILIKE '%whatsapp%' THEN 'whatsapp'
                WHEN v.referrer ILIKE '%telegram%' THEN 'telegram'
                ELSE 'other'
            END as discovery_channel
        FROM visits v
        INNER JOIN touch_points tp ON v.tp_id = tp.id
        WHERE v.organization_id = p_organization_id
            AND v.created_at >= start_date
            AND v.created_at < end_date            
            AND v.fp IS NOT NULL  -- Only users with valid fingerprints for attribution
            AND tp.deleted_at IS NULL
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
    user_touchpoint_journeys AS (
        -- Calculate touchpoint attribution for each visit (NO GROUP BY)
        SELECT 
            fp,
            tp_id,
            touchpoint_name,
            interaction_channel,
            discovery_channel,
            created_at,
            -- Window functions to get first and last touchpoint per user
            FIRST_VALUE(tp_id) OVER (PARTITION BY fp ORDER BY created_at ASC) as first_touch_tp_id,
            FIRST_VALUE(touchpoint_name) OVER (PARTITION BY fp ORDER BY created_at ASC) as first_touch_tp_name,
            FIRST_VALUE(interaction_channel) OVER (PARTITION BY fp ORDER BY created_at ASC) as first_touch_channel,
            FIRST_VALUE(discovery_channel) OVER (PARTITION BY fp ORDER BY created_at ASC) as first_touch_discovery,
            
            LAST_VALUE(tp_id) OVER (PARTITION BY fp ORDER BY created_at ASC 
                ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) as last_touch_tp_id,
            LAST_VALUE(touchpoint_name) OVER (PARTITION BY fp ORDER BY created_at ASC 
                ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) as last_touch_tp_name,
            LAST_VALUE(interaction_channel) OVER (PARTITION BY fp ORDER BY created_at ASC 
                ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) as last_touch_channel,
            LAST_VALUE(discovery_channel) OVER (PARTITION BY fp ORDER BY created_at ASC 
                ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) as last_touch_discovery,
            
            -- Journey timeline
            FIRST_VALUE(created_at) OVER (PARTITION BY fp ORDER BY created_at ASC) as first_interaction,
            LAST_VALUE(created_at) OVER (PARTITION BY fp ORDER BY created_at ASC 
                ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) as last_interaction
        FROM filtered_visits
    ),
    user_journey_summary AS (
        -- Aggregate user journey data (NOW we can GROUP BY)
        SELECT 
            fp,
            COUNT(*) as total_interactions,
            COUNT(DISTINCT tp_id) as touchpoints_used,
            COUNT(DISTINCT interaction_channel) as channels_used,
            COUNT(DISTINCT discovery_channel) as discovery_methods_used,
            COUNT(DISTINCT DATE(created_at AT TIME ZONE p_timezone)) as active_days,
            -- Get first and last touch (use ANY since they're the same for each user)
            (ARRAY_AGG(first_touch_tp_id))[1] as first_touch_tp_id,
            (ARRAY_AGG(first_touch_tp_name))[1] as first_touch_tp_name,
            (ARRAY_AGG(first_touch_channel))[1] as first_touch_channel,
            (ARRAY_AGG(first_touch_discovery))[1] as first_touch_discovery,
            (ARRAY_AGG(last_touch_tp_id))[1] as last_touch_tp_id,
            (ARRAY_AGG(last_touch_tp_name))[1] as last_touch_tp_name,
            (ARRAY_AGG(last_touch_channel))[1] as last_touch_channel,
            (ARRAY_AGG(last_touch_discovery))[1] as last_touch_discovery,
            (ARRAY_AGG(first_interaction))[1] as first_interaction,
            (ARRAY_AGG(last_interaction))[1] as last_interaction,
            EXTRACT(EPOCH FROM ((ARRAY_AGG(last_interaction))[1] - (ARRAY_AGG(first_interaction))[1])) / 3600 as journey_duration_hours,
            -- Journey classification
            CASE 
                WHEN COUNT(DISTINCT tp_id) = 1 THEN 'single_touchpoint'
                WHEN COUNT(DISTINCT tp_id) = 2 THEN 'two_touchpoint'
                WHEN COUNT(DISTINCT tp_id) >= 3 THEN 'multi_touchpoint'
            END as journey_complexity
        FROM user_touchpoint_journeys
        GROUP BY fp
    ),
    first_touch_touchpoint_attribution AS (
        -- First-touch touchpoint attribution analysis
        SELECT 
            first_touch_tp_id as tp_id,
            first_touch_tp_name as touchpoint_name,
            first_touch_channel as interaction_channel,
            first_touch_discovery as discovery_channel,
            COUNT(*) as attributed_users,
            SUM(total_interactions) as total_attributed_interactions,
            ROUND(AVG(total_interactions), 2) as avg_interactions_per_user,
            ROUND(AVG(journey_duration_hours), 1) as avg_journey_duration_hours,
            COUNT(CASE WHEN journey_complexity = 'single_touchpoint' THEN 1 END) as single_touchpoint_users,
            COUNT(CASE WHEN journey_complexity = 'multi_touchpoint' THEN 1 END) as multi_touchpoint_users
        FROM user_journey_summary
        GROUP BY first_touch_tp_id, first_touch_tp_name, first_touch_channel, first_touch_discovery
    ),
    last_touch_touchpoint_attribution AS (
        -- Last-touch touchpoint attribution analysis
        SELECT 
            last_touch_tp_id as tp_id,
            last_touch_tp_name as touchpoint_name,
            last_touch_channel as interaction_channel,
            last_touch_discovery as discovery_channel,
            COUNT(*) as attributed_users,
            SUM(total_interactions) as total_attributed_interactions,
            ROUND(AVG(total_interactions), 2) as avg_interactions_per_user,
            COUNT(CASE WHEN journey_complexity = 'single_touchpoint' THEN 1 END) as single_touchpoint_users,
            COUNT(CASE WHEN journey_complexity = 'multi_touchpoint' THEN 1 END) as multi_touchpoint_users
        FROM user_journey_summary
        GROUP BY last_touch_tp_id, last_touch_tp_name, last_touch_channel, last_touch_discovery
    ),
    interaction_channel_performance AS (
        -- Analyze performance by interaction channel (QR, LINK, NFC, WIFI)
        SELECT 
            interaction_channel,
            COUNT(DISTINCT tp_id) as unique_touchpoints_using_channel,
            SUM(attributed_users) as total_attributed_users,
            SUM(total_attributed_interactions) as total_interactions,
            ROUND(AVG(avg_interactions_per_user), 2) as avg_engagement,
            ROUND(SUM(attributed_users)::DECIMAL / SUM(SUM(attributed_users)) OVER() * 100, 1) as channel_market_share_pct,
            ROUND(AVG(avg_journey_duration_hours), 1) as avg_journey_duration
        FROM first_touch_touchpoint_attribution
        GROUP BY interaction_channel
    ),
    touchpoint_sequence_analysis AS (
        -- Analyze common touchpoint sequences (Premium feature)
        SELECT 
            CASE 
                WHEN first_touch_tp_name != last_touch_tp_name THEN 
                    CONCAT(first_touch_tp_name, ' → ', last_touch_tp_name)
                ELSE first_touch_tp_name
            END as touchpoint_path,
            CASE 
                WHEN first_touch_channel != last_touch_channel THEN 
                    CONCAT(first_touch_channel, ' → ', last_touch_channel)
                ELSE first_touch_channel
            END as channel_path,
            journey_complexity,
            COUNT(*) as users_count,
            ROUND(AVG(total_interactions), 2) as avg_interactions,
            ROUND(AVG(journey_duration_hours), 1) as avg_duration_hours,
            ROUND(COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER() * 100, 1) as path_share_pct
        FROM user_journey_summary
        GROUP BY 
            CASE 
                WHEN first_touch_tp_name != last_touch_tp_name THEN 
                    CONCAT(first_touch_tp_name, ' → ', last_touch_tp_name)
                ELSE first_touch_tp_name
            END,
            CASE 
                WHEN first_touch_channel != last_touch_channel THEN 
                    CONCAT(first_touch_channel, ' → ', last_touch_channel)
                ELSE first_touch_channel
            END,
            journey_complexity
    ),
    touchpoint_channel_combinations AS (
        -- Analyze which touchpoint + channel combinations work best
        SELECT 
            tp_id,
            touchpoint_name,
            interaction_channel,
            discovery_channel,
            SUM(attributed_users) as total_users,
            SUM(total_attributed_interactions) as total_interactions,
            ROUND(AVG(avg_interactions_per_user), 2) as avg_engagement,
            ROUND(SUM(attributed_users)::DECIMAL / SUM(SUM(attributed_users)) OVER() * 100, 1) as combination_share_pct
        FROM first_touch_touchpoint_attribution
        GROUP BY tp_id, touchpoint_name, interaction_channel, discovery_channel
    ),
    attribution_summary AS (
        -- Summary statistics for all attribution models
        SELECT 
            COUNT(DISTINCT fp) as total_users_analyzed,
            ROUND(AVG(total_interactions), 2) as avg_interactions_per_user,
            ROUND(AVG(touchpoints_used), 2) as avg_touchpoints_per_user,
            ROUND(AVG(channels_used), 2) as avg_channels_per_user,
            ROUND(AVG(journey_duration_hours), 1) as avg_journey_duration,
            COUNT(CASE WHEN journey_complexity = 'single_touchpoint' THEN 1 END) as single_touchpoint_journeys,
            COUNT(CASE WHEN journey_complexity = 'two_touchpoint' THEN 1 END) as two_touchpoint_journeys,
            COUNT(CASE WHEN journey_complexity = 'multi_touchpoint' THEN 1 END) as multi_touchpoint_journeys,
            -- Journey complexity metrics
            ROUND(COUNT(CASE WHEN journey_complexity != 'single_touchpoint' THEN 1 END)::DECIMAL / COUNT(*) * 100, 1) as multi_touch_rate_pct,
            COUNT(DISTINCT first_touch_tp_id) as unique_first_touchpoints,
            COUNT(DISTINCT last_touch_tp_id) as unique_last_touchpoints,
            COUNT(DISTINCT first_touch_channel) as unique_first_channels,
            COUNT(DISTINCT last_touch_channel) as unique_last_channels
        FROM user_journey_summary
    )
    SELECT json_build_object(
        'period_info', json_build_object(
            'period_days', p_period_days,
            'start_date', start_date,
            'end_date', end_date,
            'timezone', p_timezone,
            'is_premium', p_is_premium,
            'analysis_type', 'touchpoint_attribution'
        ),
        'filters_applied', json_build_object(
            'has_filters', (p_tag_ids IS NOT NULL OR p_touchpoint_ids IS NOT NULL),
            'tags_count', COALESCE(array_length(p_tag_ids, 1), 0),
            'touchpoints_count', COALESCE(array_length(p_touchpoint_ids, 1), 0)
        ),
        'touchpoint_attribution', json_build_object(
            -- First-touch touchpoint attribution (both tiers)
            'first_touch_attribution', (
                SELECT json_agg(
                    json_build_object(
                        'tp_id', ftta.tp_id,
                        'touchpoint_name', ftta.touchpoint_name,
                        'interaction_channel', ftta.interaction_channel,
                        'discovery_channel', ftta.discovery_channel,
                        'attributed_users', ftta.attributed_users,
                        'total_attributed_interactions', ftta.total_attributed_interactions,
                        'avg_interactions_per_user', ftta.avg_interactions_per_user,
                        'user_share_pct', ROUND(ftta.attributed_users::DECIMAL / (SELECT total_users_analyzed FROM attribution_summary) * 100, 1),
                        'single_touchpoint_users', ftta.single_touchpoint_users,
                        'multi_touchpoint_users', ftta.multi_touchpoint_users,
                        'avg_journey_duration_hours', ftta.avg_journey_duration_hours
                    ) ORDER BY ftta.attributed_users DESC
                )
                FROM first_touch_touchpoint_attribution ftta
            ),
            -- Last-touch touchpoint attribution (both tiers)
            'last_touch_attribution', (
                SELECT json_agg(
                    json_build_object(
                        'tp_id', ltta.tp_id,
                        'touchpoint_name', ltta.touchpoint_name,
                        'interaction_channel', ltta.interaction_channel,
                        'discovery_channel', ltta.discovery_channel,
                        'attributed_users', ltta.attributed_users,
                        'total_attributed_interactions', ltta.total_attributed_interactions,
                        'avg_interactions_per_user', ltta.avg_interactions_per_user,
                        'user_share_pct', ROUND(ltta.attributed_users::DECIMAL / (SELECT total_users_analyzed FROM attribution_summary) * 100, 1),
                        'single_touchpoint_users', ltta.single_touchpoint_users,
                        'multi_touchpoint_users', ltta.multi_touchpoint_users
                    ) ORDER BY ltta.attributed_users DESC
                )
                FROM last_touch_touchpoint_attribution ltta
            ),
            -- Interaction channel performance analysis
            'channel_performance', (
                SELECT json_agg(
                    json_build_object(
                        'interaction_channel', icp.interaction_channel,
                        'unique_touchpoints_using_channel', icp.unique_touchpoints_using_channel,
                        'total_attributed_users', icp.total_attributed_users,
                        'total_interactions', icp.total_interactions,
                        'avg_engagement', icp.avg_engagement,
                        'channel_market_share_pct', icp.channel_market_share_pct,
                        'avg_journey_duration', icp.avg_journey_duration
                    ) ORDER BY icp.total_attributed_users DESC
                )
                FROM interaction_channel_performance icp
            ),
            -- Touchpoint + Channel combinations (Premium only)
            'touchpoint_channel_combinations', CASE 
                WHEN p_is_premium THEN
                    (
                        SELECT json_agg(
                            json_build_object(
                                'tp_id', tcc.tp_id,
                                'touchpoint_name', tcc.touchpoint_name,
                                'interaction_channel', tcc.interaction_channel,
                                'discovery_channel', tcc.discovery_channel,
                                'total_users', tcc.total_users,
                                'total_interactions', tcc.total_interactions,
                                'avg_engagement', tcc.avg_engagement,
                                'combination_share_pct', tcc.combination_share_pct
                            ) ORDER BY tcc.total_users DESC
                        )
                        FROM touchpoint_channel_combinations tcc
                        WHERE tcc.total_users >= 2  -- Only meaningful combinations
                        LIMIT 20  -- Top 20 combinations
                    )
                ELSE NULL
            END,
            -- Touchpoint sequence analysis (Premium only)
            'touchpoint_sequences', CASE 
                WHEN p_is_premium THEN
                    (
                        SELECT json_agg(
                            json_build_object(
                                'touchpoint_path', tsa.touchpoint_path,
                                'channel_path', tsa.channel_path,
                                'journey_complexity', tsa.journey_complexity,
                                'users_count', tsa.users_count,
                                'path_share_pct', tsa.path_share_pct,
                                'avg_interactions', tsa.avg_interactions,
                                'avg_duration_hours', tsa.avg_duration_hours
                            ) ORDER BY tsa.users_count DESC
                        )
                        FROM touchpoint_sequence_analysis tsa
                        WHERE tsa.users_count >= 2  -- Only meaningful sequences
                        LIMIT 15  -- Top 15 sequences
                    )
                ELSE NULL
            END,
            -- Summary statistics
            'summary', (
                SELECT json_build_object(
                    'total_users_analyzed', ats.total_users_analyzed,
                    'avg_interactions_per_user', ats.avg_interactions_per_user,
                    'avg_touchpoints_per_user', ats.avg_touchpoints_per_user,
                    'avg_channels_per_user', ats.avg_channels_per_user,
                    'avg_journey_duration_hours', ats.avg_journey_duration,
                    'multi_touch_rate_pct', ats.multi_touch_rate_pct,
                    'unique_first_touchpoints', ats.unique_first_touchpoints,
                    'unique_last_touchpoints', ats.unique_last_touchpoints,
                    'unique_first_channels', ats.unique_first_channels,
                    'unique_last_channels', ats.unique_last_channels,
                    'journey_distribution', json_build_object(
                        'single_touchpoint', ats.single_touchpoint_journeys,
                        'two_touchpoint', ats.two_touchpoint_journeys,
                        'multi_touchpoint', ats.multi_touchpoint_journeys
                    ),
                    'attribution_reliability', CASE 
                        WHEN ats.total_users_analyzed >= 100 THEN 'high'
                        WHEN ats.total_users_analyzed >= 50 THEN 'medium'
                        WHEN ats.total_users_analyzed >= 20 THEN 'low'
                        ELSE 'insufficient_data'
                    END
                )
                FROM attribution_summary ats
            )
        ),
        'insights', json_build_object(
            -- Basic insights (both tiers)
            'dominant_first_touch_touchpoint', (
                SELECT json_build_object(
                    'tp_id', ftta.tp_id,
                    'touchpoint_name', ftta.touchpoint_name,
                    'interaction_channel', ftta.interaction_channel,
                    'users', ftta.attributed_users,
                    'share_pct', ROUND(ftta.attributed_users::DECIMAL / (SELECT total_users_analyzed FROM attribution_summary) * 100, 1)
                )
                FROM first_touch_touchpoint_attribution ftta
                ORDER BY ftta.attributed_users DESC
                LIMIT 1
            ),
            'dominant_last_touch_touchpoint', (
                SELECT json_build_object(
                    'tp_id', ltta.tp_id,
                    'touchpoint_name', ltta.touchpoint_name,
                    'interaction_channel', ltta.interaction_channel,
                    'users', ltta.attributed_users,
                    'share_pct', ROUND(ltta.attributed_users::DECIMAL / (SELECT total_users_analyzed FROM attribution_summary) * 100, 1)
                )
                FROM last_touch_touchpoint_attribution ltta
                ORDER BY ltta.attributed_users DESC
                LIMIT 1
            ),
            'best_performing_channel', (
                SELECT json_build_object(
                    'interaction_channel', icp.interaction_channel,
                    'market_share_pct', icp.channel_market_share_pct,
                    'avg_engagement', icp.avg_engagement,
                    'unique_touchpoints', icp.unique_touchpoints_using_channel
                )
                FROM interaction_channel_performance icp
                ORDER BY icp.total_attributed_users DESC
                LIMIT 1
            ),
            'touchpoint_model_comparison', (
                SELECT json_build_object(
                    'first_vs_last_touchpoint_difference', CASE 
                        WHEN (SELECT tp_id FROM first_touch_touchpoint_attribution ORDER BY attributed_users DESC LIMIT 1) = 
                             (SELECT tp_id FROM last_touch_touchpoint_attribution ORDER BY attributed_users DESC LIMIT 1) THEN 'consistent_leader'
                        ELSE 'different_leaders'
                    END,
                    'first_vs_last_channel_difference', CASE 
                        WHEN (SELECT interaction_channel FROM first_touch_touchpoint_attribution ORDER BY attributed_users DESC LIMIT 1) = 
                             (SELECT interaction_channel FROM last_touch_touchpoint_attribution ORDER BY attributed_users DESC LIMIT 1) THEN 'consistent_channel'
                        ELSE 'different_channels'
                    END,
                    'multi_touchpoint_significance', CASE 
                        WHEN ats.multi_touch_rate_pct > 60 THEN 'high_multi_touchpoint'
                        WHEN ats.multi_touch_rate_pct > 30 THEN 'moderate_multi_touchpoint'
                        ELSE 'primarily_single_touchpoint'
                    END,
                    'touchpoint_diversity', CASE 
                        WHEN ats.avg_touchpoints_per_user >= 2.5 THEN 'high_diversity'
                        WHEN ats.avg_touchpoints_per_user >= 1.5 THEN 'moderate_diversity'
                        ELSE 'low_diversity'
                    END,
                    'channel_diversity', CASE 
                        WHEN ats.avg_channels_per_user >= 2.5 THEN 'high_channel_diversity'
                        WHEN ats.avg_channels_per_user >= 1.5 THEN 'moderate_channel_diversity'
                        ELSE 'low_channel_diversity'
                    END
                )
                FROM attribution_summary ats
            ),
            -- Premium-only insights
            'premium_insights', CASE 
                WHEN p_is_premium THEN
                    json_build_object(
                        'most_common_touchpoint_journey', (
                            SELECT json_build_object(
                                'touchpoint_path', tsa.touchpoint_path,
                                'channel_path', tsa.channel_path,
                                'users', tsa.users_count,
                                'share_pct', tsa.path_share_pct,
                                'avg_interactions', tsa.avg_interactions
                            )
                            FROM touchpoint_sequence_analysis tsa
                            ORDER BY tsa.users_count DESC
                            LIMIT 1
                        ),
                        'best_touchpoint_channel_combination', (
                            SELECT json_build_object(
                                'touchpoint_name', tcc.touchpoint_name,
                                'interaction_channel', tcc.interaction_channel,
                                'discovery_channel', tcc.discovery_channel,
                                'total_users', tcc.total_users,
                                'avg_engagement', tcc.avg_engagement,
                                'share_pct', tcc.combination_share_pct
                            )
                            FROM touchpoint_channel_combinations tcc
                            ORDER BY tcc.avg_engagement DESC
                            LIMIT 1
                        ),
                        'optimization_opportunities', (
                            SELECT json_agg(
                                json_build_object(
                                    'opportunity_type', CASE 
                                        WHEN ats.multi_touch_rate_pct > 70 THEN 'optimize_touchpoint_sequences'
                                        WHEN ats.avg_touchpoints_per_user < 1.5 THEN 'increase_touchpoint_diversity'
                                        WHEN ats.avg_channels_per_user < 1.5 THEN 'activate_underused_channels'
                                        WHEN ats.unique_first_touchpoints > ats.unique_last_touchpoints * 2 THEN 'improve_conversion_touchpoints'
                                        WHEN ats.avg_journey_duration > 72 THEN 'reduce_journey_friction'
                                        ELSE 'maintain_current_approach'
                                    END,
                                    'confidence_level', CASE 
                                        WHEN ats.total_users_analyzed >= 100 THEN 'high'
                                        WHEN ats.total_users_analyzed >= 50 THEN 'medium'
                                        ELSE 'low'
                                    END,
                                    'supporting_metrics', json_build_object(
                                        'multi_touch_rate_pct', ats.multi_touch_rate_pct,
                                        'avg_touchpoints_per_user', ats.avg_touchpoints_per_user,
                                        'avg_channels_per_user', ats.avg_channels_per_user,
                                        'avg_journey_duration_hours', ats.avg_journey_duration,
                                        'touchpoint_funnel_efficiency', ROUND(ats.unique_last_touchpoints::DECIMAL / ats.unique_first_touchpoints * 100, 1),
                                        'channel_utilization', ROUND(ats.avg_channels_per_user / 4.0 * 100, 1),  -- 4 channels available per touchpoint
                                        'sample_size', ats.total_users_analyzed
                                    )
                                )
                            )
                            FROM attribution_summary ats
                            WHERE ats.total_users_analyzed >= 20
                        )
                    )
                ELSE NULL
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
