CREATE OR REPLACE FUNCTION public.get_acquisition_campaign_performance(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false)
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
        -- JOIN visits with touch_points to get UTM data
        SELECT 
            v.referrer,
            v.fp,
            v.type,
            v.created_at,
            v.tp_id,
            v.platform,
            v.country,
            tp.name as touchpoint_name,
            tp.utm_tags,
            -- Extract UTM parameters from touch_points.utm_tags JSONB column
            COALESCE(tp.utm_tags->>'utm_campaign', 'no_campaign') as utm_campaign,
            COALESCE(tp.utm_tags->>'utm_source', 'unknown') as utm_source,
            COALESCE(tp.utm_tags->>'utm_medium', 'unknown') as utm_medium,
            COALESCE(tp.utm_tags->>'utm_content', 'no_content') as utm_content,
            COALESCE(tp.utm_tags->>'utm_term', 'no_term') as utm_term,
            -- Check if UTM is enabled for this touchpoint
            COALESCE((tp.utm_tags->>'enabled')::boolean, false) as utm_enabled
        FROM visits v
        INNER JOIN touch_points tp ON v.tp_id = tp.id
        WHERE v.organization_id = p_organization_id
            AND v.created_at >= start_date
            AND v.created_at < end_date            
            AND tp.deleted_at IS NULL
            AND tp.utm_tags IS NOT NULL  -- Only touchpoints with UTM configuration
            AND COALESCE((tp.utm_tags->>'enabled')::boolean, false) = true  -- Only enabled UTM tracking
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
    campaign_aggregation AS (
        -- Campaign-level performance analysis
        SELECT 
            utm_campaign,
            utm_source,
            utm_medium,
            -- Touchpoint information
            COUNT(DISTINCT tp_id) as touchpoints_in_campaign,
            json_agg(DISTINCT touchpoint_name) as touchpoint_names,
            COUNT(*) as total_visits,
            COUNT(DISTINCT fp) as unique_users,
            COUNT(DISTINCT country) as countries_reached,
            COUNT(DISTINCT DATE(created_at AT TIME ZONE p_timezone)) as active_days,
            -- Interaction breakdown
            COUNT(CASE WHEN type = 'LINK' THEN 1 END) as link_interactions,
            COUNT(CASE WHEN type = 'QR' THEN 1 END) as qr_interactions,
            COUNT(CASE WHEN type = 'NFC' THEN 1 END) as nfc_interactions,
            COUNT(CASE WHEN type = 'WIFI' THEN 1 END) as wifi_interactions,
            -- Engagement metrics
            ROUND(COUNT(*)::DECIMAL / NULLIF(COUNT(DISTINCT fp), 0), 2) as visits_per_user,
            -- Platform distribution
            COUNT(CASE WHEN platform = 'Mobile' THEN 1 END) as mobile_visits,
            COUNT(CASE WHEN platform = 'Desktop' THEN 1 END) as desktop_visits,
            -- Time-based patterns (Premium insight)
            COUNT(CASE WHEN EXTRACT(dow FROM created_at AT TIME ZONE p_timezone) BETWEEN 1 AND 5 THEN 1 END) as weekday_visits,
            COUNT(CASE WHEN EXTRACT(dow FROM created_at AT TIME ZONE p_timezone) IN (0, 6) THEN 1 END) as weekend_visits,
            COUNT(CASE WHEN EXTRACT(hour FROM created_at AT TIME ZONE p_timezone) BETWEEN 9 AND 17 THEN 1 END) as business_hours_visits,
            -- User retention analysis (Premium)
            COUNT(DISTINCT fp) FILTER (
                WHERE fp IN (
                    SELECT fp 
                    FROM filtered_visits 
                    GROUP BY fp 
                    HAVING COUNT(*) > 1
                )
            ) as repeat_users,
            -- Campaign timeframe
            MIN(created_at) as campaign_start,
            MAX(created_at) as campaign_end,
            EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 3600 as campaign_duration_hours
        FROM filtered_visits
        GROUP BY utm_campaign, utm_source, utm_medium
    ),
    campaign_performance_scoring AS (
        -- Calculate performance scores for campaigns
        SELECT 
            *,
            -- Market share calculation
            ROUND(total_visits::DECIMAL / SUM(total_visits) OVER() * 100, 1) as campaign_share_pct,
            -- Performance score components
            CASE 
                WHEN visits_per_user >= 3.0 THEN 30
                WHEN visits_per_user >= 2.0 THEN 25
                WHEN visits_per_user >= 1.5 THEN 20
                WHEN visits_per_user >= 1.2 THEN 15
                ELSE 10
            END as engagement_score,
            
            CASE 
                WHEN total_visits >= 500 THEN 25
                WHEN total_visits >= 100 THEN 20
                WHEN total_visits >= 50 THEN 15
                WHEN total_visits >= 10 THEN 10
                ELSE 5
            END as volume_score,
            
            CASE 
                WHEN countries_reached >= 5 THEN 20
                WHEN countries_reached >= 3 THEN 15
                WHEN countries_reached >= 2 THEN 10
                ELSE 5
            END as reach_score,
            
            CASE 
                WHEN active_days >= p_period_days * 0.8 THEN 15
                WHEN active_days >= p_period_days * 0.5 THEN 12
                WHEN active_days >= p_period_days * 0.3 THEN 8
                ELSE 5
            END as consistency_score,
            
            CASE 
                WHEN touchpoints_in_campaign >= 3 THEN 10
                WHEN touchpoints_in_campaign >= 2 THEN 7
                ELSE 5
            END as touchpoint_diversity_score,
            
            -- Repeat user rate
            ROUND(repeat_users::DECIMAL / NULLIF(unique_users, 0) * 100, 1) as repeat_user_rate
        FROM campaign_aggregation
    ),
    source_medium_analysis AS (
        -- Analyze utm_source and utm_medium combinations
        SELECT 
            utm_source,
            utm_medium,
            CONCAT(utm_source, ' / ', utm_medium) as source_medium_combo,
            COUNT(DISTINCT utm_campaign) as campaigns_count,
            SUM(total_visits) as total_visits,
            SUM(unique_users) as total_unique_users,
            SUM(touchpoints_in_campaign) as total_touchpoints_used,
            ROUND(AVG(visits_per_user), 2) as avg_engagement,
            ROUND(SUM(total_visits)::DECIMAL / SUM(SUM(total_visits)) OVER() * 100, 1) as combo_share_pct,
            ROW_NUMBER() OVER (ORDER BY SUM(total_visits) DESC) as combo_rank
        FROM campaign_performance_scoring
        GROUP BY utm_source, utm_medium
    ),
    final_campaign_ranking AS (
        -- Final campaign ranking with performance scores
        SELECT 
            *,
            (engagement_score + volume_score + reach_score + consistency_score + touchpoint_diversity_score) as performance_score,
            ROW_NUMBER() OVER (ORDER BY total_visits DESC) as volume_rank,
            ROW_NUMBER() OVER (ORDER BY visits_per_user DESC) as engagement_rank,
            ROW_NUMBER() OVER (ORDER BY (engagement_score + volume_score + reach_score + consistency_score + touchpoint_diversity_score) DESC) as performance_rank,
            -- Performance tier classification
            CASE 
                WHEN (engagement_score + volume_score + reach_score + consistency_score + touchpoint_diversity_score) >= 80 THEN 'top_performer'
                WHEN (engagement_score + volume_score + reach_score + consistency_score + touchpoint_diversity_score) >= 60 THEN 'good_performer'
                WHEN (engagement_score + volume_score + reach_score + consistency_score + touchpoint_diversity_score) >= 40 THEN 'average_performer'
                ELSE 'underperformer'
            END as performance_tier
        FROM campaign_performance_scoring
    ),
    campaign_summary AS (
        -- Summary statistics
        SELECT 
            COUNT(*) as total_campaigns,
            COUNT(DISTINCT utm_source) as total_sources,
            COUNT(DISTINCT utm_medium) as total_mediums,
            SUM(total_visits) as total_campaign_visits,
            SUM(unique_users) as total_campaign_users,
            SUM(touchpoints_in_campaign) as total_touchpoints_with_utm,
            ROUND(AVG(visits_per_user), 2) as avg_campaign_engagement,
            ROUND(AVG(performance_score), 1) as avg_performance_score
        FROM final_campaign_ranking
    )
    SELECT json_build_object(
        'period_info', json_build_object(
            'period_days', p_period_days,
            'start_date', start_date,
            'end_date', end_date,
            'timezone', p_timezone,
            'is_premium', p_is_premium,
            'data_requirement', 'UTM-enabled touchpoints required'
        ),
        'filters_applied', json_build_object(
            'has_filters', (p_tag_ids IS NOT NULL OR p_touchpoint_ids IS NOT NULL),
            'tags_count', COALESCE(array_length(p_tag_ids, 1), 0),
            'touchpoints_count', COALESCE(array_length(p_touchpoint_ids, 1), 0)
        ),
        'campaign_performance', json_build_object(
            -- Tier-specific campaign data
            'campaigns', CASE 
                WHEN p_is_premium THEN
                    -- Premium: Full campaign list with performance scoring
                    (
                        SELECT json_agg(
                            json_build_object(
                                'utm_campaign', fcr.utm_campaign,
                                'utm_source', fcr.utm_source,
                                'utm_medium', fcr.utm_medium,
                                'touchpoints_in_campaign', fcr.touchpoints_in_campaign,
                                'touchpoint_names', fcr.touchpoint_names,
                                'volume_rank', fcr.volume_rank,
                                'engagement_rank', fcr.engagement_rank,
                                'performance_rank', fcr.performance_rank,
                                'performance_score', fcr.performance_score,
                                'performance_tier', fcr.performance_tier,
                                'total_visits', fcr.total_visits,
                                'unique_users', fcr.unique_users,
                                'campaign_share_pct', fcr.campaign_share_pct,
                                'visits_per_user', fcr.visits_per_user,
                                'repeat_user_rate', fcr.repeat_user_rate,
                                'countries_reached', fcr.countries_reached,
                                'active_days', fcr.active_days,
                                'campaign_duration_hours', ROUND(fcr.campaign_duration_hours, 1),
                                'platform_distribution', json_build_object(
                                    'mobile_visits', fcr.mobile_visits,
                                    'desktop_visits', fcr.desktop_visits,
                                    'mobile_pct', ROUND(fcr.mobile_visits::DECIMAL / fcr.total_visits * 100, 1)
                                ),
                                'time_patterns', json_build_object(
                                    'weekday_visits', fcr.weekday_visits,
                                    'weekend_visits', fcr.weekend_visits,
                                    'business_hours_visits', fcr.business_hours_visits,
                                    'weekend_pct', ROUND(fcr.weekend_visits::DECIMAL / fcr.total_visits * 100, 1),
                                    'business_hours_pct', ROUND(fcr.business_hours_visits::DECIMAL / fcr.total_visits * 100, 1)
                                ),
                                'interaction_breakdown', json_build_object(
                                    'link_interactions', fcr.link_interactions,
                                    'qr_interactions', fcr.qr_interactions,
                                    'nfc_interactions', fcr.nfc_interactions,
                                    'wifi_interactions', fcr.wifi_interactions
                                ),
                                'performance_breakdown', json_build_object(
                                    'engagement_score', fcr.engagement_score,
                                    'volume_score', fcr.volume_score,
                                    'reach_score', fcr.reach_score,
                                    'consistency_score', fcr.consistency_score,
                                    'touchpoint_diversity_score', fcr.touchpoint_diversity_score
                                )
                            ) ORDER BY fcr.performance_rank
                        )
                        FROM final_campaign_ranking fcr
                    )
                ELSE
                    -- Free: Top 5 campaigns by volume only
                    (
                        SELECT json_agg(
                            json_build_object(
                                'utm_campaign', fcr.utm_campaign,
                                'utm_source', fcr.utm_source,
                                'utm_medium', fcr.utm_medium,
                                'touchpoints_in_campaign', fcr.touchpoints_in_campaign,
                                'volume_rank', fcr.volume_rank,
                                'total_visits', fcr.total_visits,
                                'unique_users', fcr.unique_users,
                                'campaign_share_pct', fcr.campaign_share_pct,
                                'visits_per_user', fcr.visits_per_user
                            ) ORDER BY fcr.volume_rank
                        )
                        FROM final_campaign_ranking fcr
                        WHERE fcr.volume_rank <= 5
                    )
            END,
            -- Source/Medium analysis (Premium only)
            'source_medium_combinations', CASE 
                WHEN p_is_premium THEN
                    (
                        SELECT json_agg(
                            json_build_object(
                                'source_medium_combo', sma.source_medium_combo,
                                'utm_source', sma.utm_source,
                                'utm_medium', sma.utm_medium,
                                'combo_rank', sma.combo_rank,
                                'campaigns_count', sma.campaigns_count,
                                'total_visits', sma.total_visits,
                                'total_unique_users', sma.total_unique_users,
                                'total_touchpoints_used', sma.total_touchpoints_used,
                                'avg_engagement', sma.avg_engagement,
                                'combo_share_pct', sma.combo_share_pct
                            ) ORDER BY sma.combo_rank
                        )
                        FROM source_medium_analysis sma
                        WHERE sma.combo_rank <= 10  -- Top 10 combinations
                    )
                ELSE 
                    NULL
            END,
            -- Summary with tier-appropriate data
            'summary', (
                SELECT json_build_object(
                    'total_campaigns', cs.total_campaigns,
                    'total_sources', cs.total_sources,
                    'total_mediums', cs.total_mediums,
                    'total_touchpoints_with_utm', cs.total_touchpoints_with_utm,
                    'campaigns_shown', CASE WHEN p_is_premium THEN cs.total_campaigns ELSE LEAST(5, cs.total_campaigns) END,
                    'total_campaign_visits', cs.total_campaign_visits,
                    'total_campaign_users', cs.total_campaign_users,
                    'avg_campaign_engagement', cs.avg_campaign_engagement,
                    'avg_performance_score', CASE WHEN p_is_premium THEN cs.avg_performance_score ELSE NULL END,
                    'data_completeness', CASE 
                        WHEN cs.total_campaigns = 0 THEN 'no_utm_enabled_touchpoints'
                        WHEN cs.total_campaigns < 3 THEN 'limited_campaign_data'
                        ELSE 'sufficient_data'
                    END
                )
                FROM campaign_summary cs
            )
        ),
        'insights', json_build_object(
            -- Basic insights (both tiers)
            'top_campaign', (
                SELECT json_build_object(
                    'utm_campaign', fcr.utm_campaign,
                    'utm_source', fcr.utm_source,
                    'utm_medium', fcr.utm_medium,
                    'visits', fcr.total_visits,
                    'touchpoints_used', fcr.touchpoints_in_campaign,
                    'market_share_pct', fcr.campaign_share_pct,
                    'engagement_rate', fcr.visits_per_user
                )
                FROM final_campaign_ranking fcr
                WHERE fcr.volume_rank = 1
            ),
            'utm_setup_status', (
                SELECT json_build_object(
                    'total_touchpoints_analyzed', (
                        SELECT COUNT(DISTINCT tp_id) 
                        FROM filtered_visits
                    ),
                    'message', CASE 
                        WHEN (SELECT COUNT(*) FROM campaign_summary) = 0 THEN 
                            'No UTM-enabled touchpoints found. Enable UTM tracking on touchpoints to see campaign data.'
                        ELSE 'Campaign tracking active'
                    END
                )
            ),
            -- Premium-only insights
            'premium_insights', CASE 
                WHEN p_is_premium THEN
                    json_build_object(
                        'best_performing_campaign', (
                            SELECT json_build_object(
                                'utm_campaign', fcr.utm_campaign,
                                'utm_source', fcr.utm_source,
                                'utm_medium', fcr.utm_medium,
                                'performance_score', fcr.performance_score,
                                'performance_tier', fcr.performance_tier,
                                'visits_per_user', fcr.visits_per_user,
                                'repeat_user_rate', fcr.repeat_user_rate,
                                'touchpoints_used', fcr.touchpoints_in_campaign
                            )
                            FROM final_campaign_ranking fcr
                            WHERE fcr.performance_rank = 1
                        ),
                        'top_source_medium', (
                            SELECT json_build_object(
                                'combo', sma.source_medium_combo,
                                'campaigns_count', sma.campaigns_count,
                                'total_visits', sma.total_visits,
                                'avg_engagement', sma.avg_engagement,
                                'market_share_pct', sma.combo_share_pct
                            )
                            FROM source_medium_analysis sma
                            WHERE sma.combo_rank = 1
                        ),
                        'campaign_recommendations', (
                            SELECT json_agg(recommendation)
                            FROM (
                                SELECT CASE 
                                    WHEN fcr.performance_tier = 'top_performer' AND fcr.campaign_share_pct < 15 THEN 
                                        CONCAT('Scale up "', fcr.utm_campaign, '" campaign - high performance, low volume')
                                    WHEN fcr.performance_tier = 'underperformer' AND fcr.campaign_share_pct > 10 THEN 
                                        CONCAT('Optimize or pause "', fcr.utm_campaign, '" - high volume, low performance')
                                    WHEN fcr.repeat_user_rate < 15 AND fcr.total_visits > 100 THEN 
                                        CONCAT('Improve "', fcr.utm_campaign, '" retention strategy - low repeat rate')
                                    WHEN fcr.touchpoints_in_campaign = 1 AND fcr.total_visits > 200 THEN 
                                        CONCAT('Expand "', fcr.utm_campaign, '" to more touchpoints for better reach')
                                    ELSE NULL
                                END as recommendation
                                FROM final_campaign_ranking fcr
                                WHERE fcr.total_visits >= 20  -- Only meaningful data
                            ) recommendations
                            WHERE recommendation IS NOT NULL
                        ),
                        'performance_distribution', json_build_object(
                            'top_performers', (SELECT COUNT(*) FROM final_campaign_ranking WHERE performance_tier = 'top_performer'),
                            'good_performers', (SELECT COUNT(*) FROM final_campaign_ranking WHERE performance_tier = 'good_performer'),
                            'average_performers', (SELECT COUNT(*) FROM final_campaign_ranking WHERE performance_tier = 'average_performer'),
                            'underperformers', (SELECT COUNT(*) FROM final_campaign_ranking WHERE performance_tier = 'underperformer')
                        )
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