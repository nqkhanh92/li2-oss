-- Migration: Add collection filtering support to all 13 advanced analytics functions
-- Created: 2025-12-04
-- Description: Adds p_collection_ids and p_include_null_collection parameters to all advanced analytics functions

-- ============================================================================
-- 1. get_acquisition_campaign_performance
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_acquisition_campaign_performance(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false, p_collection_ids uuid[] DEFAULT NULL::uuid[], p_include_null_collection boolean DEFAULT false)
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
            AND (
                p_collection_ids IS NULL
                OR v.tp_id IN (
                    SELECT tp.id
                    FROM touch_points tp
                    WHERE tp.collection_id = ANY(p_collection_ids)
                       OR (p_include_null_collection AND tp.collection_id IS NULL)
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

-- ============================================================================
-- 2. get_acquisition_growth_trends
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_acquisition_growth_trends(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false, p_collection_ids uuid[] DEFAULT NULL::uuid[], p_include_null_collection boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    start_date TIMESTAMPTZ;
    end_date TIMESTAMPTZ;
    comparison_start_date TIMESTAMPTZ;
    result JSON;
BEGIN
    -- Validate tier restrictions
    IF NOT p_is_premium AND p_period_days != 7 THEN
        RETURN json_build_object('error', TRUE, 'message', 'Free tier limited to 7 days only');
    END IF;
    
    IF NOT p_is_premium AND p_touchpoint_ids IS NOT NULL AND array_length(p_touchpoint_ids, 1) > 1 THEN
        RETURN json_build_object('error', TRUE, 'message', 'Free tier limited to 1 touchpoint only');
    END IF;

    -- Calculate date ranges (need double the period for comparison)
    end_date := CURRENT_TIMESTAMP AT TIME ZONE p_timezone;
    start_date := end_date - (p_period_days || ' days')::INTERVAL;
    comparison_start_date := start_date - (p_period_days || ' days')::INTERVAL;
    
    WITH filtered_visits AS (
        -- Apply hierarchical filtering with extended date range for comparison
        SELECT 
            v.referrer,
            v.fp,
            v.type,
            v.created_at,
            v.tp_id,
            v.platform,
            v.country,
            DATE(v.created_at AT TIME ZONE p_timezone) as visit_date,
            EXTRACT(hour FROM v.created_at AT TIME ZONE p_timezone) as visit_hour,
            EXTRACT(dow FROM v.created_at AT TIME ZONE p_timezone) as day_of_week,
            -- Categorize traffic sources
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
            END as channel
        FROM visits v
        WHERE v.organization_id = p_organization_id
            AND v.created_at >= comparison_start_date  -- Extended range for comparison
            AND v.created_at < end_date
            AND v.fp IS NOT NULL  -- Only valid users for acquisition tracking
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
            AND (
                p_collection_ids IS NULL
                OR v.tp_id IN (
                    SELECT tp.id
                    FROM touch_points tp
                    WHERE tp.collection_id = ANY(p_collection_ids)
                       OR (p_include_null_collection AND tp.collection_id IS NULL)
                )
            )
    ),
    date_series AS (
        -- Generate complete date series to handle missing days
        SELECT 
            generate_series(
                comparison_start_date::date,
                (end_date - INTERVAL '1 day')::date,
                INTERVAL '1 day'
            )::date as date_bucket
    ),
    daily_acquisition_metrics AS (
        -- Aggregate daily acquisition metrics with complete date series
        SELECT 
            ds.date_bucket,
            COALESCE(COUNT(fv.fp), 0) as total_visits,
            COALESCE(COUNT(DISTINCT fv.fp), 0) as unique_users,
            COALESCE(COUNT(DISTINCT fv.country), 0) as countries_reached,
            COALESCE(COUNT(DISTINCT fv.channel), 0) as channels_active,
            -- Platform distribution
            COALESCE(COUNT(CASE WHEN fv.platform = 'Mobile' THEN 1 END), 0) as mobile_visits,
            COALESCE(COUNT(CASE WHEN fv.platform = 'Desktop' THEN 1 END), 0) as desktop_visits,
            -- Interaction types
            COALESCE(COUNT(CASE WHEN fv.type = 'LINK' THEN 1 END), 0) as link_interactions,
            COALESCE(COUNT(CASE WHEN fv.type = 'QR' THEN 1 END), 0) as qr_interactions,
            COALESCE(COUNT(CASE WHEN fv.type = 'NFC' THEN 1 END), 0) as nfc_interactions,
            COALESCE(COUNT(CASE WHEN fv.type = 'WIFI' THEN 1 END), 0) as wifi_interactions,
            -- Quality metrics
            COALESCE(ROUND(COUNT(fv.fp)::DECIMAL / NULLIF(COUNT(DISTINCT fv.fp), 0), 2), 0) as visits_per_user,
            -- Time period classification
            CASE 
                WHEN ds.date_bucket >= start_date::date THEN 'current_period'
                ELSE 'comparison_period'
            END as period_type
        FROM date_series ds
        LEFT JOIN filtered_visits fv ON ds.date_bucket = fv.visit_date
        GROUP BY ds.date_bucket
    ),
    growth_calculations AS (
        -- Calculate period-over-period growth rates
        SELECT 
            date_bucket,
            period_type,
            total_visits,
            unique_users,
            visits_per_user,
            countries_reached,
            channels_active,
            -- Day-over-day growth calculations
            LAG(total_visits, 1) OVER (ORDER BY date_bucket) as prev_day_visits,
            LAG(unique_users, 1) OVER (ORDER BY date_bucket) as prev_day_users,
            -- Calculate growth rates
            CASE 
                WHEN LAG(total_visits, 1) OVER (ORDER BY date_bucket) > 0 THEN
                    ROUND(((total_visits - LAG(total_visits, 1) OVER (ORDER BY date_bucket))::DECIMAL / 
                           LAG(total_visits, 1) OVER (ORDER BY date_bucket)) * 100, 1)
                ELSE NULL
            END as visits_growth_rate,
            CASE 
                WHEN LAG(unique_users, 1) OVER (ORDER BY date_bucket) > 0 THEN
                    ROUND(((unique_users - LAG(unique_users, 1) OVER (ORDER BY date_bucket))::DECIMAL / 
                           LAG(unique_users, 1) OVER (ORDER BY date_bucket)) * 100, 1)
                ELSE NULL
            END as users_growth_rate,
            -- Moving averages for trend smoothing
            ROUND(AVG(total_visits) OVER (ORDER BY date_bucket ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1) as visits_3day_avg,
            ROUND(AVG(unique_users) OVER (ORDER BY date_bucket ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1) as users_3day_avg
        FROM daily_acquisition_metrics
    ),
    source_growth_analysis AS (
        -- Analyze growth patterns by traffic source
        SELECT 
            fv.channel,
            DATE(fv.created_at AT TIME ZONE p_timezone) as date_bucket,
            COUNT(*) as daily_visits,
            COUNT(DISTINCT fv.fp) as daily_users,
            CASE 
                WHEN DATE(fv.created_at AT TIME ZONE p_timezone) >= start_date::date THEN 'current_period'
                ELSE 'comparison_period'
            END as period_type
        FROM filtered_visits fv
        GROUP BY fv.channel, DATE(fv.created_at AT TIME ZONE p_timezone)
    ),
    source_growth_summary AS (
        -- Summarize source growth trends
        SELECT 
            channel,
            SUM(CASE WHEN period_type = 'current_period' THEN daily_visits ELSE 0 END) as current_period_visits,
            SUM(CASE WHEN period_type = 'comparison_period' THEN daily_visits ELSE 0 END) as comparison_period_visits,
            SUM(CASE WHEN period_type = 'current_period' THEN daily_users ELSE 0 END) as current_period_users,
            SUM(CASE WHEN period_type = 'comparison_period' THEN daily_users ELSE 0 END) as comparison_period_users,
            -- Calculate growth rates
            CASE 
                WHEN SUM(CASE WHEN period_type = 'comparison_period' THEN daily_visits ELSE 0 END) > 0 THEN
                    ROUND(((SUM(CASE WHEN period_type = 'current_period' THEN daily_visits ELSE 0 END) - 
                           SUM(CASE WHEN period_type = 'comparison_period' THEN daily_visits ELSE 0 END))::DECIMAL / 
                           SUM(CASE WHEN period_type = 'comparison_period' THEN daily_visits ELSE 0 END)) * 100, 1)
                ELSE NULL
            END as visits_growth_rate,
            -- Growth momentum classification
            CASE 
                WHEN SUM(CASE WHEN period_type = 'comparison_period' THEN daily_visits ELSE 0 END) = 0 THEN 'emerging'
                WHEN ((SUM(CASE WHEN period_type = 'current_period' THEN daily_visits ELSE 0 END) - 
                       SUM(CASE WHEN period_type = 'comparison_period' THEN daily_visits ELSE 0 END))::DECIMAL / 
                       NULLIF(SUM(CASE WHEN period_type = 'comparison_period' THEN daily_visits ELSE 0 END), 0)) * 100 > 20 THEN 'accelerating'
                WHEN ((SUM(CASE WHEN period_type = 'current_period' THEN daily_visits ELSE 0 END) - 
                       SUM(CASE WHEN period_type = 'comparison_period' THEN daily_visits ELSE 0 END))::DECIMAL / 
                       NULLIF(SUM(CASE WHEN period_type = 'comparison_period' THEN daily_visits ELSE 0 END), 0)) * 100 BETWEEN -5 AND 20 THEN 'growing'
                WHEN ((SUM(CASE WHEN period_type = 'current_period' THEN daily_visits ELSE 0 END) - 
                       SUM(CASE WHEN period_type = 'comparison_period' THEN daily_visits ELSE 0 END))::DECIMAL / 
                       NULLIF(SUM(CASE WHEN period_type = 'comparison_period' THEN daily_visits ELSE 0 END), 0)) * 100 BETWEEN -20 AND -5 THEN 'stable'
                ELSE 'declining'
            END as growth_momentum
        FROM source_growth_analysis
        GROUP BY channel
    ),
    quality_trends AS (
        -- Track acquisition quality evolution over time
        SELECT 
            period_type,
            ROUND(AVG(visits_per_user), 2) as avg_visits_per_user,
            ROUND(AVG(countries_reached), 1) as avg_countries_per_day,
            ROUND(AVG(channels_active), 1) as avg_active_channels,
            ROUND(AVG(CASE WHEN total_visits > 0 THEN mobile_visits::DECIMAL / total_visits * 100 ELSE 0 END), 1) as mobile_percentage,
            COUNT(*) as days_analyzed
        FROM daily_acquisition_metrics
        WHERE total_visits > 0  -- Only days with actual activity
        GROUP BY period_type
    ),
    trend_summary AS (
        -- Overall trend analysis and classifications
        SELECT 
            -- Current vs comparison period totals
            SUM(CASE WHEN period_type = 'current_period' THEN total_visits ELSE 0 END) as current_total_visits,
            SUM(CASE WHEN period_type = 'comparison_period' THEN total_visits ELSE 0 END) as comparison_total_visits,
            SUM(CASE WHEN period_type = 'current_period' THEN unique_users ELSE 0 END) as current_total_users,
            SUM(CASE WHEN period_type = 'comparison_period' THEN unique_users ELSE 0 END) as comparison_total_users,
            -- Growth rate calculations
            CASE 
                WHEN SUM(CASE WHEN period_type = 'comparison_period' THEN total_visits ELSE 0 END) > 0 THEN
                    ROUND(((SUM(CASE WHEN period_type = 'current_period' THEN total_visits ELSE 0 END) - 
                           SUM(CASE WHEN period_type = 'comparison_period' THEN total_visits ELSE 0 END))::DECIMAL / 
                           SUM(CASE WHEN period_type = 'comparison_period' THEN total_visits ELSE 0 END)) * 100, 1)
                ELSE NULL
            END as overall_visits_growth_rate,
            -- Trend volatility (standard deviation of daily growth rates)
            ROUND(STDDEV(visits_growth_rate), 1) as growth_volatility,
            COUNT(CASE WHEN period_type = 'current_period' AND visits_growth_rate > 0 THEN 1 END) as positive_growth_days,
            COUNT(CASE WHEN period_type = 'current_period' THEN 1 END) as total_current_days
        FROM growth_calculations
        WHERE period_type = 'current_period' OR period_type = 'comparison_period'
    )
    SELECT json_build_object(
        'period_info', json_build_object(
            'period_days', p_period_days,
            'start_date', start_date,
            'end_date', end_date,
            'comparison_start_date', comparison_start_date,
            'timezone', p_timezone,
            'is_premium', p_is_premium,
            'analysis_type', 'growth_trends'
        ),
        'filters_applied', json_build_object(
            'has_filters', (p_tag_ids IS NOT NULL OR p_touchpoint_ids IS NOT NULL),
            'tags_count', COALESCE(array_length(p_tag_ids, 1), 0),
            'touchpoints_count', COALESCE(array_length(p_touchpoint_ids, 1), 0)
        ),
        'growth_analysis', json_build_object(
            -- Daily trends (both tiers, but limited for free)
            'daily_trends', CASE 
                WHEN p_is_premium THEN
                    (
                        SELECT json_agg(
                            json_build_object(
                                'date', gc.date_bucket,
                                'total_visits', gc.total_visits,
                                'unique_users', gc.unique_users,
                                'visits_per_user', gc.visits_per_user,
                                'visits_growth_rate', gc.visits_growth_rate,
                                'users_growth_rate', gc.users_growth_rate,
                                'visits_3day_avg', gc.visits_3day_avg,
                                'countries_reached', gc.countries_reached,
                                'channels_active', gc.channels_active
                            ) ORDER BY gc.date_bucket
                        )
                        FROM growth_calculations gc
                        WHERE gc.period_type = 'current_period'
                    )
                ELSE
                    (
                        SELECT json_agg(
                            json_build_object(
                                'date', gc.date_bucket,
                                'total_visits', gc.total_visits,
                                'unique_users', gc.unique_users,
                                'visits_growth_rate', gc.visits_growth_rate
                            ) ORDER BY gc.date_bucket
                        )
                        FROM growth_calculations gc
                        WHERE gc.period_type = 'current_period'
                    )
            END,
            -- Source growth analysis
            'source_growth', CASE 
                WHEN p_is_premium THEN
                    (
                        SELECT json_agg(
                            json_build_object(
                                'channel', sgs.channel,
                                'current_period_visits', sgs.current_period_visits,
                                'comparison_period_visits', sgs.comparison_period_visits,
                                'visits_growth_rate', sgs.visits_growth_rate,
                                'growth_momentum', sgs.growth_momentum,
                                'current_period_users', sgs.current_period_users,
                                'comparison_period_users', sgs.comparison_period_users
                            ) ORDER BY sgs.current_period_visits DESC
                        )
                        FROM source_growth_summary sgs
                    )
                ELSE
                    (
                        SELECT json_agg(
                            json_build_object(
                                'channel', sgs.channel,
                                'current_period_visits', sgs.current_period_visits,
                                'visits_growth_rate', sgs.visits_growth_rate,
                                'growth_momentum', sgs.growth_momentum
                            ) ORDER BY sgs.current_period_visits DESC
                        )
                        FROM source_growth_summary sgs
                        LIMIT 5  -- Top 5 sources for free tier
                    )
            END,
            -- Quality evolution (Premium only)
            'quality_evolution', CASE 
                WHEN p_is_premium THEN
                    (
                        SELECT json_agg(
                            json_build_object(
                                'period_type', qt.period_type,
                                'avg_visits_per_user', qt.avg_visits_per_user,
                                'avg_countries_per_day', qt.avg_countries_per_day,
                                'avg_active_channels', qt.avg_active_channels,
                                'mobile_percentage', qt.mobile_percentage,
                                'days_analyzed', qt.days_analyzed
                            )
                        )
                        FROM quality_trends qt
                    )
                ELSE NULL
            END,
            -- Summary statistics
            'summary', (
                SELECT json_build_object(
                    'current_total_visits', ts.current_total_visits,
                    'comparison_total_visits', ts.comparison_total_visits,
                    'current_total_users', ts.current_total_users,
                    'comparison_total_users', ts.comparison_total_users,
                    'overall_visits_growth_rate', ts.overall_visits_growth_rate,
                    'growth_volatility', CASE WHEN p_is_premium THEN ts.growth_volatility ELSE NULL END,
                    'positive_growth_days', ts.positive_growth_days,
                    'total_current_days', ts.total_current_days,
                    'growth_consistency', CASE 
                        WHEN ts.positive_growth_days::DECIMAL / ts.total_current_days > 0.7 THEN 'high_consistency'
                        WHEN ts.positive_growth_days::DECIMAL / ts.total_current_days > 0.4 THEN 'moderate_consistency'
                        ELSE 'low_consistency'
                    END,
                    'trend_direction', CASE 
                        WHEN ts.overall_visits_growth_rate > 10 THEN 'strong_growth'
                        WHEN ts.overall_visits_growth_rate > 0 THEN 'moderate_growth'
                        WHEN ts.overall_visits_growth_rate > -10 THEN 'stable'
                        ELSE 'declining'
                    END
                )
                FROM trend_summary ts
            )
        ),
        'insights', json_build_object(
            -- Basic insights (both tiers)
            'growth_performance', (
                SELECT json_build_object(
                    'overall_trend', CASE 
                        WHEN ts.overall_visits_growth_rate > 10 THEN 'strong_growth'
                        WHEN ts.overall_visits_growth_rate > 0 THEN 'moderate_growth'
                        WHEN ts.overall_visits_growth_rate > -10 THEN 'stable'
                        ELSE 'declining'
                    END,
                    'growth_rate', ts.overall_visits_growth_rate,
                    'growth_consistency', CASE 
                        WHEN ts.positive_growth_days::DECIMAL / ts.total_current_days > 0.7 THEN 'high_consistency'
                        WHEN ts.positive_growth_days::DECIMAL / ts.total_current_days > 0.4 THEN 'moderate_consistency'
                        ELSE 'low_consistency'
                    END
                )
                FROM trend_summary ts
            ),
            'top_growing_source', (
                SELECT json_build_object(
                    'channel', sgs.channel,
                    'growth_rate', sgs.visits_growth_rate,
                    'momentum', sgs.growth_momentum,
                    'current_visits', sgs.current_period_visits
                )
                FROM source_growth_summary sgs
                WHERE sgs.visits_growth_rate IS NOT NULL
                ORDER BY sgs.visits_growth_rate DESC
                LIMIT 1
            ),
            'fastest_declining_source', (
                SELECT json_build_object(
                    'channel', sgs.channel,
                    'decline_rate', sgs.visits_growth_rate,
                    'momentum', sgs.growth_momentum,
                    'current_visits', sgs.current_period_visits
                )
                FROM source_growth_summary sgs
                WHERE sgs.visits_growth_rate IS NOT NULL
                ORDER BY sgs.visits_growth_rate ASC
                LIMIT 1
            ),
            -- Premium-only insights
            'premium_insights', CASE 
                WHEN p_is_premium THEN
                    json_build_object(
                        'growth_opportunities', (
                            SELECT json_agg(
                                json_build_object(
                                    'opportunity_type', CASE 
                                        WHEN sgs.growth_momentum = 'emerging' AND sgs.current_period_visits > 10 THEN 'scale_emerging_channel'
                                        WHEN sgs.growth_momentum = 'accelerating' THEN 'invest_in_acceleration'
                                        WHEN sgs.growth_momentum = 'declining' AND sgs.current_period_visits > 100 THEN 'revive_declining_channel'
                                        ELSE NULL
                                    END,
                                    'target_channel', sgs.channel,
                                    'current_performance', json_build_object(
                                        'visits', sgs.current_period_visits,
                                        'growth_rate', sgs.visits_growth_rate,
                                        'momentum', sgs.growth_momentum
                                    ),
                                    'priority', CASE 
                                        WHEN sgs.current_period_visits > 200 THEN 'high'
                                        WHEN sgs.current_period_visits > 50 THEN 'medium'
                                        ELSE 'low'
                                    END
                                )
                            ) -- FILTER (WHERE opportunity_type IS NOT NULL)
                            FROM source_growth_summary sgs
                        ),
                        'quality_insights', (
                            SELECT json_build_object(
                                'engagement_trend', CASE 
                                    WHEN (SELECT avg_visits_per_user FROM quality_trends WHERE period_type = 'current_period') > 
                                         (SELECT avg_visits_per_user FROM quality_trends WHERE period_type = 'comparison_period') THEN 'improving_engagement'
                                   WHEN (SELECT avg_visits_per_user FROM quality_trends WHERE period_type = 'current_period') < 
                                        (SELECT avg_visits_per_user FROM quality_trends WHERE period_type = 'comparison_period') THEN 'declining_engagement'
                                   ELSE 'stable_engagement'
                               END,
                               'geographic_expansion', CASE 
                                   WHEN (SELECT avg_countries_per_day FROM quality_trends WHERE period_type = 'current_period') > 
                                        (SELECT avg_countries_per_day FROM quality_trends WHERE period_type = 'comparison_period') THEN 'expanding'
                                   ELSE 'stable_geography'
                               END,
                               'channel_diversification', CASE 
                                   WHEN (SELECT avg_active_channels FROM quality_trends WHERE period_type = 'current_period') > 
                                        (SELECT avg_active_channels FROM quality_trends WHERE period_type = 'comparison_period') THEN 'diversifying'
                                   ELSE 'stable_channels'
                               END
                           )
                       ),
                       'growth_forecast', (
                           -- Simple linear trend projection for next period
                           SELECT json_build_object(
                               'forecast_method', 'linear_trend',
                               'confidence_level', CASE 
                                   WHEN ts.growth_volatility < 20 THEN 'high'
                                   WHEN ts.growth_volatility < 50 THEN 'medium'
                                   ELSE 'low'
                               END,
                               'projected_growth_rate', CASE 
                                   WHEN ts.overall_visits_growth_rate IS NOT NULL THEN
                                       ROUND(ts.overall_visits_growth_rate * 1.1, 1)  -- Simple momentum-based projection
                                   ELSE NULL
                               END,
                               'projected_visits', CASE 
                                   WHEN ts.overall_visits_growth_rate IS NOT NULL THEN
                                       ROUND(ts.current_total_visits * (1 + (ts.overall_visits_growth_rate * 1.1 / 100)))
                                   ELSE NULL
                               END,
                               'forecast_period', CONCAT('Next ', p_period_days, ' days'),
                               'key_assumptions', json_build_array(
                                   'current_trend_continues',
                                   'no_major_external_changes',
                                   'same_acquisition_strategy'
                               )
                           )
                           FROM trend_summary ts
                       ),
                       'momentum_analysis', (
                           SELECT json_build_object(
                               'accelerating_channels', (
                                   SELECT COUNT(*) FROM source_growth_summary WHERE growth_momentum = 'accelerating'
                               ),
                               'emerging_channels', (
                                   SELECT COUNT(*) FROM source_growth_summary WHERE growth_momentum = 'emerging'
                               ),
                               'declining_channels', (
                                   SELECT COUNT(*) FROM source_growth_summary WHERE growth_momentum = 'declining'
                               ),
                               'portfolio_health', CASE 
                                   WHEN (SELECT COUNT(*) FROM source_growth_summary WHERE growth_momentum IN ('accelerating', 'growing')) > 
                                        (SELECT COUNT(*) FROM source_growth_summary WHERE growth_momentum = 'declining') THEN 'healthy_portfolio'
                                   WHEN (SELECT COUNT(*) FROM source_growth_summary WHERE growth_momentum = 'declining') > 
                                        (SELECT COUNT(*) FROM source_growth_summary WHERE growth_momentum IN ('accelerating', 'growing')) THEN 'portfolio_needs_attention'
                                   ELSE 'balanced_portfolio'
                               END
                           )
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


-- ============================================================================
-- 3. get_acquisition_touchpoint_attribution
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_acquisition_touchpoint_attribution(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false, p_collection_ids uuid[] DEFAULT NULL::uuid[], p_include_null_collection boolean DEFAULT false)
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
            AND (
                p_collection_ids IS NULL
                OR v.tp_id IN (
                    SELECT tp.id
                    FROM touch_points tp
                    WHERE tp.collection_id = ANY(p_collection_ids)
                       OR (p_include_null_collection AND tp.collection_id IS NULL)
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


-- ============================================================================
-- 4. get_acquisition_traffic_sources
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_acquisition_traffic_sources(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false, p_collection_ids uuid[] DEFAULT NULL::uuid[], p_include_null_collection boolean DEFAULT false)
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
        -- Apply hierarchical filtering to visits
        SELECT 
            v.referrer,
            v.fp,
            v.type,
            v.created_at,
            v.tp_id,
            v.platform,
            v.country
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
            AND (
                p_collection_ids IS NULL
                OR v.tp_id IN (
                    SELECT tp.id
                    FROM touch_points tp
                    WHERE tp.collection_id = ANY(p_collection_ids)
                       OR (p_include_null_collection AND tp.collection_id IS NULL)
                )
            )
    ),
    source_aggregation AS (
        -- Traffic source analysis with quality metrics
        SELECT 
            CASE 
                WHEN referrer IS NULL OR referrer = '' OR referrer = 'direct' THEN 'direct'
                WHEN referrer ILIKE '%google%' THEN 'google'
                WHEN referrer ILIKE '%facebook%' THEN 'facebook'
                WHEN referrer ILIKE '%instagram%' THEN 'instagram'
                WHEN referrer ILIKE '%twitter%' OR referrer ILIKE '%x.com%' THEN 'twitter'
                WHEN referrer ILIKE '%linkedin%' THEN 'linkedin'
                WHEN referrer ILIKE '%youtube%' THEN 'youtube'
                WHEN referrer ILIKE '%tiktok%' THEN 'tiktok'
                WHEN referrer ILIKE '%whatsapp%' THEN 'whatsapp'
                WHEN referrer ILIKE '%telegram%' THEN 'telegram'
                ELSE referrer
            END as source_category,
            COALESCE(referrer, 'direct') as original_referrer,
            COUNT(*) as total_visits,
            COUNT(DISTINCT fp) as unique_users,
            COUNT(DISTINCT tp_id) as touchpoints_accessed,
            COUNT(CASE WHEN type = 'LINK' THEN 1 END) as link_interactions,
            COUNT(CASE WHEN type = 'QR' THEN 1 END) as qr_interactions,
            COUNT(CASE WHEN type = 'NFC' THEN 1 END) as nfc_interactions,
            COUNT(CASE WHEN type = 'WIFI' THEN 1 END) as wifi_interactions,
            -- Engagement metrics for quality scoring
            ROUND(COUNT(*)::DECIMAL / NULLIF(COUNT(DISTINCT fp), 0), 2) as visits_per_user,
            COUNT(DISTINCT country) as countries_reached,
            COUNT(DISTINCT DATE(created_at AT TIME ZONE p_timezone)) as active_days,
            -- Platform preferences by source
            COUNT(CASE WHEN platform = 'Mobile' THEN 1 END) as mobile_visits,
            COUNT(CASE WHEN platform = 'Desktop' THEN 1 END) as desktop_visits,
            -- Repeat visitor analysis (Premium insight)
            COUNT(DISTINCT fp) FILTER (
                WHERE fp IN (
                    SELECT fp 
                    FROM filtered_visits 
                    GROUP BY fp 
                    HAVING COUNT(*) > 1
                )
            ) as repeat_users,
            -- Market share calculation
            ROUND(COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER() * 100, 1) as source_share_pct
        FROM filtered_visits
        GROUP BY 
            CASE 
                WHEN referrer IS NULL OR referrer = '' OR referrer = 'direct' THEN 'direct'
                WHEN referrer ILIKE '%google%' THEN 'google'
                WHEN referrer ILIKE '%facebook%' THEN 'facebook'
                WHEN referrer ILIKE '%instagram%' THEN 'instagram'
                WHEN referrer ILIKE '%twitter%' OR referrer ILIKE '%x.com%' THEN 'twitter'
                WHEN referrer ILIKE '%linkedin%' THEN 'linkedin'
                WHEN referrer ILIKE '%youtube%' THEN 'youtube'
                WHEN referrer ILIKE '%tiktok%' THEN 'tiktok'
                WHEN referrer ILIKE '%whatsapp%' THEN 'whatsapp'
                WHEN referrer ILIKE '%telegram%' THEN 'telegram'
                ELSE referrer
            END,
            COALESCE(referrer, 'direct')
    ),
    source_quality_scoring AS (
        -- Calculate quality scores for each source
        SELECT 
            *,
            -- Quality score components (0-100 scale)
            CASE 
                WHEN visits_per_user >= 3.0 THEN 25
                WHEN visits_per_user >= 2.0 THEN 20
                WHEN visits_per_user >= 1.5 THEN 15
                WHEN visits_per_user >= 1.2 THEN 10
                ELSE 5
            END as engagement_score,
            
            CASE 
                WHEN source_share_pct >= 20 THEN 25
                WHEN source_share_pct >= 10 THEN 20
                WHEN source_share_pct >= 5 THEN 15
                WHEN source_share_pct >= 1 THEN 10
                ELSE 5
            END as volume_score,
            
            CASE 
                WHEN countries_reached >= 5 THEN 20
                WHEN countries_reached >= 3 THEN 15
                WHEN countries_reached >= 2 THEN 10
                ELSE 5
            END as reach_score,
            
            CASE 
                WHEN active_days >= p_period_days * 0.7 THEN 15
                WHEN active_days >= p_period_days * 0.5 THEN 12
                WHEN active_days >= p_period_days * 0.3 THEN 8
                ELSE 5
            END as consistency_score,
            
            CASE 
                WHEN touchpoints_accessed >= 3 THEN 15
                WHEN touchpoints_accessed >= 2 THEN 10
                ELSE 5
            END as diversity_score,
            
            -- Repeat user rate for Premium scoring
            ROUND(repeat_users::DECIMAL / NULLIF(unique_users, 0) * 100, 1) as repeat_user_rate
        FROM source_aggregation
    ),
    final_source_ranking AS (
        -- Calculate final quality scores and rankings
        SELECT 
            *,
            (engagement_score + volume_score + reach_score + consistency_score + diversity_score) as quality_score,
            ROW_NUMBER() OVER (ORDER BY total_visits DESC) as volume_rank,
            ROW_NUMBER() OVER (ORDER BY visits_per_user DESC) as engagement_rank,
            -- Quality-based ranking
            ROW_NUMBER() OVER (ORDER BY (engagement_score + volume_score + reach_score + consistency_score + diversity_score) DESC) as quality_rank,
            -- Quality tier classification
            CASE 
                WHEN (engagement_score + volume_score + reach_score + consistency_score + diversity_score) >= 80 THEN 'excellent'
                WHEN (engagement_score + volume_score + reach_score + consistency_score + diversity_score) >= 60 THEN 'good'
                WHEN (engagement_score + volume_score + reach_score + consistency_score + diversity_score) >= 40 THEN 'average'
                ELSE 'needs_improvement'
            END as quality_tier
        FROM source_quality_scoring
    ),
    source_summary AS (
        -- Summary statistics
        SELECT 
            COUNT(DISTINCT source_category) as total_source_categories,
            COUNT(*) as total_sources,
            SUM(total_visits) as total_visits_all,
            SUM(unique_users) as total_unique_users,
            ROUND(AVG(visits_per_user), 2) as avg_engagement_rate,
            ROUND(AVG(quality_score), 1) as avg_quality_score
        FROM final_source_ranking
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
        'traffic_sources', json_build_object(
            -- Tier-specific source data
            'sources', CASE 
                WHEN p_is_premium THEN
                    -- Premium: Full source list with quality scoring
                    (
                        SELECT json_agg(
                            json_build_object(
                                'source_category', fsr.source_category,
                                'original_referrer', fsr.original_referrer,
                                'volume_rank', fsr.volume_rank,
                                'engagement_rank', fsr.engagement_rank,
                                'quality_rank', fsr.quality_rank,
                                'quality_score', fsr.quality_score,
                                'quality_tier', fsr.quality_tier,
                                'total_visits', fsr.total_visits,
                                'unique_users', fsr.unique_users,
                                'source_share_pct', fsr.source_share_pct,
                                'visits_per_user', fsr.visits_per_user,
                                'repeat_user_rate', fsr.repeat_user_rate,
                                'touchpoints_accessed', fsr.touchpoints_accessed,
                                'countries_reached', fsr.countries_reached,
                                'active_days', fsr.active_days,
                                'platform_distribution', json_build_object(
                                    'mobile_visits', fsr.mobile_visits,
                                    'desktop_visits', fsr.desktop_visits,
                                    'mobile_pct', ROUND(fsr.mobile_visits::DECIMAL / fsr.total_visits * 100, 1)
                                ),
                                'interaction_breakdown', json_build_object(
                                    'link_interactions', fsr.link_interactions,
                                    'qr_interactions', fsr.qr_interactions,
                                    'nfc_interactions', fsr.nfc_interactions,
                                    'wifi_interactions', fsr.wifi_interactions
                                ),
                                'quality_breakdown', json_build_object(
                                    'engagement_score', fsr.engagement_score,
                                    'volume_score', fsr.volume_score,
                                    'reach_score', fsr.reach_score,
                                    'consistency_score', fsr.consistency_score,
                                    'diversity_score', fsr.diversity_score
                                )
                            ) ORDER BY fsr.quality_rank
                        )
                        FROM final_source_ranking fsr
                    )
                ELSE
                    -- Free: Top 5 sources by volume only
                    (
                        SELECT json_agg(
                            json_build_object(
                                'source_category', fsr.source_category,
                                'volume_rank', fsr.volume_rank,
                                'total_visits', fsr.total_visits,
                                'unique_users', fsr.unique_users,
                                'source_share_pct', fsr.source_share_pct,
                                'visits_per_user', fsr.visits_per_user
                            ) ORDER BY fsr.volume_rank
                        )
                        FROM final_source_ranking fsr
                        WHERE fsr.volume_rank <= 5
                    )
            END,
            -- Summary with tier-appropriate data
            'summary', (
                SELECT json_build_object(
                    'total_source_categories', ss.total_source_categories,
                    'total_sources', ss.total_sources,
                    'sources_shown', CASE WHEN p_is_premium THEN ss.total_sources ELSE LEAST(5, ss.total_sources) END,
                    'total_visits', ss.total_visits_all,
                    'total_unique_users', ss.total_unique_users,
                    'avg_engagement_rate', ss.avg_engagement_rate,
                    'avg_quality_score', CASE WHEN p_is_premium THEN ss.avg_quality_score ELSE NULL END
                )
                FROM source_summary ss
            )
        ),
        'insights', json_build_object(
            -- Basic insights (both tiers)
            'top_source', (
                SELECT json_build_object(
                    'source_category', fsr.source_category,
                    'visits', fsr.total_visits,
                    'market_share_pct', fsr.source_share_pct,
                    'engagement_rate', fsr.visits_per_user
                )
                FROM final_source_ranking fsr
                WHERE fsr.volume_rank = 1
            ),
            'source_diversity', (
                SELECT CASE 
                    WHEN ss.total_source_categories >= 6 THEN 'high_diversity'
                    WHEN ss.total_source_categories >= 3 THEN 'medium_diversity'
                    ELSE 'low_diversity'
                END
                FROM source_summary ss
            ),
            -- Premium-only insights
            'premium_insights', CASE 
                WHEN p_is_premium THEN
                    json_build_object(
                        'highest_quality_source', (
                            SELECT json_build_object(
                                'source_category', fsr.source_category,
                                'quality_score', fsr.quality_score,
                                'quality_tier', fsr.quality_tier,
                                'visits_per_user', fsr.visits_per_user,
                                'repeat_user_rate', fsr.repeat_user_rate
                            )
                            FROM final_source_ranking fsr
                            WHERE fsr.quality_rank = 1
                        ),
                        'source_recommendations', (
                            SELECT json_agg(recommendation)
                            FROM (
                                SELECT CASE 
                                    WHEN fsr.quality_tier = 'excellent' AND fsr.source_share_pct < 20 THEN 
                                        CONCAT('Scale up ', fsr.source_category, ' - high quality, low volume')
                                    WHEN fsr.quality_tier = 'needs_improvement' AND fsr.source_share_pct > 10 THEN 
                                        CONCAT('Optimize ', fsr.source_category, ' experience - high volume, low quality')
                                    WHEN fsr.repeat_user_rate < 20 AND fsr.total_visits > 50 THEN 
                                        CONCAT('Improve ', fsr.source_category, ' retention - low repeat rate')
                                    WHEN fsr.countries_reached = 1 AND fsr.total_visits > 100 THEN 
                                        CONCAT('Expand ', fsr.source_category, ' geographic reach')
                                    ELSE NULL
                                END as recommendation
                                FROM final_source_ranking fsr
                                WHERE fsr.total_visits >= 10  -- Only meaningful data
                            ) recommendations
                            WHERE recommendation IS NOT NULL
                        ),
                        'quality_distribution', json_build_object(
                            'excellent_sources', (SELECT COUNT(*) FROM final_source_ranking WHERE quality_tier = 'excellent'),
                            'good_sources', (SELECT COUNT(*) FROM final_source_ranking WHERE quality_tier = 'good'),
                            'average_sources', (SELECT COUNT(*) FROM final_source_ranking WHERE quality_tier = 'average'),
                            'needs_improvement_sources', (SELECT COUNT(*) FROM final_source_ranking WHERE quality_tier = 'needs_improvement')
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


-- ============================================================================
-- 5. get_audience_device_analysis
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_audience_device_analysis(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false, p_collection_ids uuid[] DEFAULT NULL::uuid[], p_include_null_collection boolean DEFAULT false)
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
        -- Apply hierarchical filtering directly to visits
        SELECT 
            v.platform,
            v.os,
            v.fp,
            v.type,
            v.created_at,
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
            AND (
                p_collection_ids IS NULL
                OR v.tp_id IN (
                    SELECT tp.id
                    FROM touch_points tp
                    WHERE tp.collection_id = ANY(p_collection_ids)
                       OR (p_include_null_collection AND tp.collection_id IS NULL)
                )
            )
    ),
    platform_aggregation AS (
        -- Platform-level analysis (Mobile, Desktop, etc.)
        SELECT 
            COALESCE(platform, 'Unknown') as platform,
            COUNT(*) as total_visits,
            COUNT(DISTINCT fp) as unique_users,
            COUNT(DISTINCT tp_id) as touchpoints_accessed,
            COUNT(CASE WHEN type = 'LINK' THEN 1 END) as link_clicks,
            COUNT(CASE WHEN type = 'QR' THEN 1 END) as qr_scans,
            COUNT(CASE WHEN type = 'NFC' THEN 1 END) as nfc_taps,
            COUNT(CASE WHEN type = 'WIFI' THEN 1 END) as wifi_accesses,
            -- Premium: Engagement metrics
            ROUND(COUNT(*)::DECIMAL / NULLIF(COUNT(DISTINCT fp), 0), 2) as visits_per_user,
            -- Premium: Time-based patterns
            COUNT(CASE WHEN EXTRACT(dow FROM created_at AT TIME ZONE p_timezone) BETWEEN 1 AND 5 THEN 1 END) as weekday_visits,
            COUNT(CASE WHEN EXTRACT(dow FROM created_at AT TIME ZONE p_timezone) IN (0, 6) THEN 1 END) as weekend_visits,
            COUNT(CASE WHEN EXTRACT(hour FROM created_at AT TIME ZONE p_timezone) BETWEEN 9 AND 17 THEN 1 END) as business_hours_visits,
            -- Market share calculation
            ROUND(COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER() * 100, 1) as platform_share_pct
        FROM filtered_visits
        WHERE platform IS NOT NULL
        GROUP BY COALESCE(platform, 'Unknown')
    ),
    os_aggregation AS (
        -- Operating system analysis
        SELECT 
            COALESCE(platform, 'Unknown') as platform,
            COALESCE(os, 'Unknown') as os,
            COUNT(*) as total_visits,
            COUNT(DISTINCT fp) as unique_users,
            -- Premium: Engagement metrics
            ROUND(COUNT(*)::DECIMAL / NULLIF(COUNT(DISTINCT fp), 0), 2) as visits_per_user,
            -- OS rank within platform
            ROW_NUMBER() OVER (PARTITION BY COALESCE(platform, 'Unknown') ORDER BY COUNT(*) DESC) as os_rank_in_platform,
            -- Market share within platform
            ROUND(COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER(PARTITION BY COALESCE(platform, 'Unknown')) * 100, 1) as os_share_in_platform_pct
        FROM filtered_visits
        WHERE platform IS NOT NULL AND os IS NOT NULL
        GROUP BY COALESCE(platform, 'Unknown'), COALESCE(os, 'Unknown')
    ),
    device_summary AS (
        -- Summary statistics
        SELECT 
            COUNT(DISTINCT COALESCE(platform, 'Unknown')) as total_platforms,
            COUNT(DISTINCT COALESCE(os, 'Unknown')) as total_os,
            COUNT(*) as total_visits_all,
            COUNT(DISTINCT fp) as total_unique_users
        FROM filtered_visits
        WHERE platform IS NOT NULL OR os IS NOT NULL
    ),
    premium_insights AS (
        -- Premium-only advanced analysis
        SELECT 
            -- Cross-platform users (users who use multiple platforms)
            COUNT(DISTINCT fp) FILTER (
                WHERE fp IN (
                    SELECT fp 
                    FROM filtered_visits 
                    WHERE platform IS NOT NULL 
                    GROUP BY fp 
                    HAVING COUNT(DISTINCT platform) > 1
                )
            ) as cross_platform_users,
            -- Device loyalty analysis
            ROUND(AVG(platform_consistency), 2) as avg_platform_consistency
        FROM (
            SELECT 
                fp,
                COUNT(DISTINCT platform)::DECIMAL / COUNT(*) as platform_consistency
            FROM filtered_visits
            WHERE fp IS NOT NULL AND platform IS NOT NULL
            GROUP BY fp
            HAVING COUNT(*) >= 2  -- Only users with multiple visits
        ) user_consistency
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
        'device_data', json_build_object(
            -- Platform breakdown (both tiers, but different detail levels)
            'platforms', CASE 
                WHEN p_is_premium THEN
                    -- Premium: Full platform data with engagement metrics
                    (
                        SELECT json_agg(data) 
                        FROM (
                            SELECT json_build_object(
                                'platform', pa.platform,
                                'total_visits', pa.total_visits,
                                'unique_users', pa.unique_users,
                                'platform_share_pct', pa.platform_share_pct,
                                'visits_per_user', pa.visits_per_user,
                                'touchpoints_accessed', pa.touchpoints_accessed,
                                'usage_patterns', json_build_object(
                                    'weekday_visits', pa.weekday_visits,
                                    'weekend_visits', pa.weekend_visits,
                                    'business_hours_visits', pa.business_hours_visits,
                                    'weekend_usage_pct', ROUND(pa.weekend_visits::DECIMAL / pa.total_visits * 100, 1),
                                    'business_hours_pct', ROUND(pa.business_hours_visits::DECIMAL / pa.total_visits * 100, 1)
                                ),
                                'interaction_breakdown', json_build_object(
                                    'link_clicks', pa.link_clicks,
                                    'qr_scans', pa.qr_scans,
                                    'nfc_taps', pa.nfc_taps,
                                    'wifi_accesses', pa.wifi_accesses
                                )
                            ) as data
                            FROM platform_aggregation pa
                            ORDER BY pa.total_visits DESC
                        ) as ordered
                    )
                ELSE
                    -- Free: Basic platform data only
                    (
                        SELECT json_agg(data)
                        FROM (
                            SELECT json_build_object(
                                'platform', pa.platform,
                                'total_visits', pa.total_visits,
                                'unique_users', pa.unique_users,
                                'platform_share_pct', pa.platform_share_pct
                            ) as data
                            FROM platform_aggregation pa
                            ORDER BY pa.total_visits DESC
                        ) as ordered                        
                    )
            END,
            -- Operating system breakdown
            'operating_systems', CASE 
                WHEN p_is_premium THEN
                    -- Premium: OS data with engagement metrics
                    (
                        SELECT json_agg(data)
                        FROM (
                            SELECT json_build_object(
                                'platform', oa.platform,
                                'os', oa.os,
                                'os_rank_in_platform', oa.os_rank_in_platform,
                                'total_visits', oa.total_visits,
                                'unique_users', oa.unique_users,
                                'visits_per_user', oa.visits_per_user,
                                'os_share_in_platform_pct', oa.os_share_in_platform_pct
                            ) as data
                            FROM os_aggregation oa
                            ORDER BY oa.total_visits DESC
                        ) as ordered             
                    )
                ELSE
                    -- Free: Basic OS counts only
                    (
                        SELECT json_agg(data)
                        FROM (
                            SELECT json_build_object(
                                'platform', oa.platform,
                                'os', oa.os,
                                'total_visits', oa.total_visits,
                                'unique_users', oa.unique_users
                            ) as data
                            FROM os_aggregation oa    
                            ORDER BY oa.total_visits DESC
                        ) as data
                    )
            END,
            -- Summary statistics
            'summary', (
                SELECT json_build_object(
                    'total_platforms', ds.total_platforms,
                    'total_operating_systems', ds.total_os,
                    'total_visits', ds.total_visits_all,
                    'total_unique_users', ds.total_unique_users,
                    'device_diversity', CASE 
                        WHEN ds.total_platforms >= 4 THEN 'high_diversity'
                        WHEN ds.total_platforms >= 2 THEN 'medium_diversity'
                        ELSE 'single_platform'
                    END
                )
                FROM device_summary ds
            )
        ),
        'insights', json_build_object(
            -- Basic insights (both tiers)
            'dominant_platform', (
                SELECT json_build_object(
                    'platform', pa.platform,
                    'visits', pa.total_visits,
                    'market_share_pct', pa.platform_share_pct,
                    'users', pa.unique_users
                )
                FROM platform_aggregation pa
                ORDER BY pa.total_visits DESC
                LIMIT 1
            ),            
            -- Premium-only insights
            'premium_insights', CASE 
                WHEN p_is_premium THEN
                    (
                        SELECT json_build_object(
                            'engagement_leader', (
                                SELECT json_build_object(
                                    'platform', pa.platform,
                                    'visits_per_user', pa.visits_per_user,
                                    'engagement_advantage', CASE 
                                        WHEN pa.visits_per_user > 2.5 THEN 'high'
                                        WHEN pa.visits_per_user > 1.8 THEN 'medium'
                                        ELSE 'standard'
                                    END
                                )
                                FROM platform_aggregation pa
                                ORDER BY pa.visits_per_user DESC
                                LIMIT 1
                            ),
                            'cross_platform_users', (
                                SELECT json_build_object(
                                    'count', pi.cross_platform_users,
                                    'percentage', ROUND(pi.cross_platform_users::DECIMAL / ds.total_unique_users * 100, 1)
                                )
                                FROM premium_insights pi, device_summary ds
                            ),
                            'usage_timing', (
                                SELECT json_agg(data)
                                FROM (
                                    SELECT json_build_object(
                                        'platform', pa.platform,
                                        'peak_time', CASE 
                                            WHEN pa.business_hours_visits > pa.weekend_visits THEN 'business_hours'
                                            WHEN pa.weekend_visits > pa.business_hours_visits THEN 'weekends'
                                            ELSE 'balanced'
                                        END,
                                        'business_hours_pct', ROUND(pa.business_hours_visits::DECIMAL / pa.total_visits * 100, 1)
                                    ) as data
                                    FROM platform_aggregation pa
                                    ORDER BY pa.total_visits DESC
                                ) as ordered                                
                            )
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


-- ============================================================================
-- 6. get_audience_geographic_distribution
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_audience_geographic_distribution(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false, p_collection_ids uuid[] DEFAULT NULL::uuid[], p_include_null_collection boolean DEFAULT false)
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
        -- Apply hierarchical filtering directly to visits
        SELECT 
            v.country,
            v.city,
            v.fp,
            v.type,
            v.created_at,
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
            AND (
                p_collection_ids IS NULL
                OR v.tp_id IN (
                    SELECT tp.id
                    FROM touch_points tp
                    WHERE tp.collection_id = ANY(p_collection_ids)
                       OR (p_include_null_collection AND tp.collection_id IS NULL)
                )
            )
    ),
    country_aggregation AS (
        -- Country-level aggregation
        SELECT 
            COALESCE(country, 'Unknown') as country,
            COUNT(*) as total_visits,
            COUNT(DISTINCT fp) as unique_users,
            COUNT(DISTINCT tp_id) as touchpoints_accessed,            
            -- Engagement metrics
            ROUND(COUNT(*)::DECIMAL / NULLIF(COUNT(DISTINCT fp), 0), 2) as visits_per_user,
            COUNT(DISTINCT city) as cities_in_country,
            -- Market share calculation
            ROUND(COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER() * 100, 1) as visit_share_pct,
            ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as country_rank
        FROM filtered_visits
        GROUP BY COALESCE(country, 'Unknown')
    ),
    city_aggregation AS (
        -- City-level aggregation (Premium only)
        SELECT 
            COALESCE(country, 'Unknown') as country,
            COALESCE(city, 'Unknown') as city,
            COUNT(*) as total_visits,
            COUNT(DISTINCT fp) as unique_users,
            COUNT(DISTINCT tp_id) as touchpoints_accessed,
            COUNT(CASE WHEN type = 'LINK' THEN 1 END) as link_clicks,
            COUNT(CASE WHEN type = 'QR' THEN 1 END) as qr_scans,
            COUNT(CASE WHEN type = 'NFC' THEN 1 END) as nfc_taps,
            COUNT(CASE WHEN type = 'WIFI' THEN 1 END) as wifi_accesses,
            ROUND(COUNT(*)::DECIMAL / NULLIF(COUNT(DISTINCT fp), 0), 2) as visits_per_user,
            -- City rank within country
            ROW_NUMBER() OVER (PARTITION BY COALESCE(country, 'Unknown') ORDER BY COUNT(*) DESC) as city_rank_in_country,
            -- Overall city rank
            ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as city_rank_global
        FROM filtered_visits
        GROUP BY COALESCE(country, 'Unknown'), COALESCE(city, 'Unknown')
    ),
    geographic_summary AS (
        -- Summary statistics
        SELECT 
            COUNT(DISTINCT country) as total_countries,
            COUNT(DISTINCT city) as total_cities,
            COUNT(*) as total_visits_all,
            COUNT(DISTINCT fp) as total_unique_users,
            ROUND(COUNT(*)::DECIMAL / NULLIF(COUNT(DISTINCT fp), 0), 2) as avg_engagement_rate
        FROM filtered_visits
        WHERE country IS NOT NULL OR city IS NOT NULL
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
    'geographic_data', json_build_object(
        -- Tier-specific country data
        'countries', CASE 
            WHEN p_is_premium THEN
                -- Premium: Full country list (using subquery to access country_aggregation)
                (
                    SELECT json_agg(
                        json_build_object(
                            'country', ca.country,
                            'rank', ca.country_rank,
                            'total_visits', ca.total_visits,
                            'unique_users', ca.unique_users,
                            'visits_per_user', ca.visits_per_user,
                            'visit_share_pct', ca.visit_share_pct,
                            'cities_in_country', ca.cities_in_country,
                            'touchpoints_accessed', ca.touchpoints_accessed
                        ) ORDER BY ca.country_rank
                    )
                    FROM country_aggregation ca
                )
            ELSE
                -- Free: Top 5 countries only (using subquery to access country_aggregation)
                (
                    SELECT json_agg(
                        json_build_object(
                            'country', ca.country,
                            'rank', ca.country_rank,
                            'total_visits', ca.total_visits,
                            'unique_users', ca.unique_users,
                            'visits_per_user', ca.visits_per_user,
                            'visit_share_pct', ca.visit_share_pct
                        ) ORDER BY ca.country_rank
                    )
                    FROM country_aggregation ca
                    WHERE ca.country_rank <= 5
                )
        END,
        -- Premium-only city data (using subquery to access city_aggregation)
        'cities', CASE 
            WHEN p_is_premium THEN
                (
                    SELECT json_agg(
                        json_build_object(
                            'country', cta.country,
                            'city', cta.city,
                            'city_rank_in_country', cta.city_rank_in_country,
                            'city_rank_global', cta.city_rank_global,
                            'total_visits', cta.total_visits,
                            'unique_users', cta.unique_users,
                            'visits_per_user', cta.visits_per_user,
                            'touchpoints_accessed', cta.touchpoints_accessed,
                            'interaction_breakdown', json_build_object(
                                'link_clicks', cta.link_clicks,
                                'qr_scans', cta.qr_scans,
                                'nfc_taps', cta.nfc_taps,
                                'wifi_accesses', cta.wifi_accesses
                            )
                        ) ORDER BY cta.city_rank_global
                    )
                    FROM city_aggregation cta
                    WHERE cta.city_rank_global <= 20 -- Top 20 cities globally
                )
            ELSE 
                NULL -- json_build_object('premium_feature', TRUE, 'message', 'City-level analysis requires Premium plan')
        END,
        -- Summary (using subquery to access geographic_summary)
        'summary', (
            SELECT json_build_object(
                'total_countries', gs.total_countries,
                'total_cities', CASE WHEN p_is_premium THEN gs.total_cities ELSE NULL END,
                'countries_shown', CASE WHEN p_is_premium THEN gs.total_countries ELSE LEAST(5, gs.total_countries) END,
                'cities_shown', CASE WHEN p_is_premium THEN LEAST(20, gs.total_cities) ELSE NULL END,
                'total_visits', gs.total_visits_all,
                'total_unique_users', gs.total_unique_users,
                'avg_engagement_rate', gs.avg_engagement_rate,
                'geographic_diversity', CASE 
                    WHEN p_is_premium THEN
                        CASE 
                            WHEN gs.total_countries >= 10 THEN 'high_diversity'
                            WHEN gs.total_countries >= 5 THEN 'medium_diversity'
                            WHEN gs.total_countries >= 2 THEN 'low_diversity'
                            ELSE 'single_market'
                        END
                    ELSE NULL
                END
            )
            FROM geographic_summary gs
        )
    ),
    'insights', json_build_object(
        'top_market', (
            SELECT json_build_object(
                'country', ca.country,
                'visits', ca.total_visits,
                'market_share_pct', ca.visit_share_pct,
                'engagement_rate', ca.visits_per_user
            )
            FROM country_aggregation ca
            WHERE ca.country_rank = 1
        ),
        'geographic_concentration', (
            SELECT CASE 
                WHEN ca.visit_share_pct > 70 THEN 'highly_concentrated'
                WHEN ca.visit_share_pct > 50 THEN 'moderately_concentrated'  
                ELSE 'well_distributed'
            END
            FROM country_aggregation ca 
            WHERE ca.country_rank = 1
        ),
        'premium_insights', CASE 
            WHEN p_is_premium THEN
                json_build_object(
                    'top_city', (
                        SELECT json_build_object(
                            'city', cta.city,
                            'country', cta.country,
                            'visits', cta.total_visits,
                            'engagement_rate', cta.visits_per_user
                        )
                        FROM city_aggregation cta
                        WHERE cta.city_rank_global = 1
                    ),
                    'expansion_opportunities', (
                        SELECT json_agg(data)
                        FROM (
                            SELECT json_build_object(
                                'country', ca.country,
                                'cities_count', ca.cities_in_country,
                                'current_visits', ca.total_visits,
                                'growth_potential', CASE 
                                    WHEN ca.cities_in_country = 1 AND ca.total_visits > 10 THEN 'high'
                                    WHEN ca.cities_in_country <= 3 AND ca.total_visits > 5 THEN 'medium'
                                    ELSE 'low'
                                END
                            ) AS data
                            FROM country_aggregation ca
                            WHERE ca.country_rank <= 10 AND ca.cities_in_country <= 5
                            ORDER BY ca.total_visits DESC
                        ) AS ordered
                    )
                )
            ELSE 
                NULL -- json_build_object('message', 'Premium insights require Premium plan')
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


-- ============================================================================
-- 7. get_behavior_interaction_frequency
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_behavior_interaction_frequency(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false, p_collection_ids uuid[] DEFAULT NULL::uuid[], p_include_null_collection boolean DEFAULT false)
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
            AND (
                p_collection_ids IS NULL
                OR v.tp_id IN (
                    SELECT tp.id
                    FROM touch_points tp
                    WHERE tp.collection_id = ANY(p_collection_ids)
                       OR (p_include_null_collection AND tp.collection_id IS NULL)
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


-- ============================================================================
-- 8. get_behavior_temporal_patterns
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_behavior_temporal_patterns(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false, p_collection_ids uuid[] DEFAULT NULL::uuid[], p_include_null_collection boolean DEFAULT false)
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
            AND (
                p_collection_ids IS NULL
                OR v.tp_id IN (
                    SELECT tp.id
                    FROM touch_points tp
                    WHERE tp.collection_id = ANY(p_collection_ids)
                       OR (p_include_null_collection AND tp.collection_id IS NULL)
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


-- ============================================================================
-- 9. get_behavior_user_journeys
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_behavior_user_journeys(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false, p_collection_ids uuid[] DEFAULT NULL::uuid[], p_include_null_collection boolean DEFAULT false)
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
            AND (
                p_collection_ids IS NULL
                OR v.tp_id IN (
                    SELECT tp.id
                    FROM touch_points tp
                    WHERE tp.collection_id = ANY(p_collection_ids)
                       OR (p_include_null_collection AND tp.collection_id IS NULL)
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


-- ============================================================================
-- 10. get_overview_daily_trend
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_overview_daily_trend(
    p_organization_id uuid,
    p_period_days integer,
    p_timezone text DEFAULT 'UTC'::text,
    p_tag_ids uuid[] DEFAULT NULL::uuid[],
    p_touchpoint_ids uuid[] DEFAULT NULL::uuid[],
    p_is_premium boolean DEFAULT false,
    p_collection_ids uuid[] DEFAULT NULL::uuid[],
    p_include_null_collection boolean DEFAULT false
)
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
        -- Apply hierarchical filtering including collections
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
            AND (
                p_collection_ids IS NULL
                OR tp.collection_id = ANY(p_collection_ids)
                OR (p_include_null_collection AND tp.collection_id IS NULL)
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
                -- FIXED: Include p_collection_ids in the no-filter check
                (p_tag_ids IS NULL AND p_touchpoint_ids IS NULL AND p_collection_ids IS NULL)
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
$function$;


-- ============================================================================
-- 11. get_overview_peak_heatmap
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_overview_peak_heatmap(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false, p_collection_ids uuid[] DEFAULT NULL::uuid[], p_include_null_collection boolean DEFAULT false)
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
            AND (
                p_collection_ids IS NULL
                OR v.tp_id IN (
                    SELECT tp.id
                    FROM touch_points tp
                    WHERE tp.collection_id = ANY(p_collection_ids)
                       OR (p_include_null_collection AND tp.collection_id IS NULL)
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


-- ============================================================================
-- 12. get_overview_stats_panel
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_overview_stats_panel(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false, p_collection_ids uuid[] DEFAULT NULL::uuid[], p_include_null_collection boolean DEFAULT false)
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
            AND (
                p_collection_ids IS NULL
                OR tp.collection_id = ANY(p_collection_ids)
                OR (p_include_null_collection AND tp.collection_id IS NULL)
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


-- ============================================================================
-- 13. get_overview_top_touchpoints
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_overview_top_touchpoints(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false, p_collection_ids uuid[] DEFAULT NULL::uuid[], p_include_null_collection boolean DEFAULT false)
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
    
    WITH filtered_touchpoints AS (
        -- Apply hierarchical filtering logic
        SELECT DISTINCT tp.id as tp_id, tp.name, tp.slug
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
            AND (
                p_collection_ids IS NULL
                OR tp.collection_id = ANY(p_collection_ids)
                OR (p_include_null_collection AND tp.collection_id IS NULL)
            )
    ),
    touchpoint_performance AS (
        SELECT 
            ft.tp_id,
            ft.name as touchpoint_name,            
            ft.slug as touchpoint_slug,
            COUNT(*) as total_interactions,
            COUNT(DISTINCT v.fp) as unique_users,
            COUNT(CASE WHEN v.type = 'LINK' THEN 1 END) as link_clicks,
            COUNT(CASE WHEN v.type = 'QR' THEN 1 END) as qr_scans,
            COUNT(CASE WHEN v.type = 'NFC' THEN 1 END) as nfc_taps,
            COUNT(CASE WHEN v.type = 'WIFI' THEN 1 END) as wifi_accesses,
            -- Advanced engagement metrics
            ROUND(COUNT(*)::DECIMAL / NULLIF(COUNT(DISTINCT v.fp), 0), 2) as interactions_per_user,
            COUNT(DISTINCT DATE(v.created_at AT TIME ZONE p_timezone)) as active_days,
            -- Geographic and device insights
            COUNT(DISTINCT v.country) as countries_reached,
            COUNT(DISTINCT v.city) as cities_reached,
            COUNT(CASE WHEN v.platform = 'Mobile' THEN 1 END) as mobile_interactions,
            COUNT(CASE WHEN v.platform = 'Desktop' THEN 1 END) as desktop_interactions,
            -- Traffic source analysis
            COUNT(CASE WHEN v.referrer = 'direct' THEN 1 END) as direct_visits,
            COUNT(CASE WHEN v.referrer != 'direct' AND v.referrer IS NOT NULL THEN 1 END) as referred_visits,
            -- Time-based patterns
            COUNT(CASE WHEN EXTRACT(dow FROM v.created_at AT TIME ZONE p_timezone) BETWEEN 1 AND 5 THEN 1 END) as weekday_interactions,
            COUNT(CASE WHEN EXTRACT(dow FROM v.created_at AT TIME ZONE p_timezone) IN (0, 6) THEN 1 END) as weekend_interactions,
            -- Peak performance hour
            MODE() WITHIN GROUP (ORDER BY EXTRACT(hour FROM v.created_at AT TIME ZONE p_timezone)) as peak_hour,
            -- Tags associated with this touchpoint
            (
                SELECT json_agg(
                    json_build_object('id', t.id, 'name', t.name)
                )
                FROM tp_tag_links ttl
                JOIN tags t ON ttl.tag_id = t.id
                WHERE ttl.tp_id = ft.tp_id
            ) as associated_tags
        FROM filtered_touchpoints ft
        LEFT JOIN visits v ON ft.tp_id = v.tp_id
            AND v.organization_id = p_organization_id
            AND v.created_at >= start_date
            AND v.created_at < end_date            
        GROUP BY ft.tp_id, ft.name, ft.slug
    ),
    ranked_touchpoints AS (
        SELECT 
            *,
            -- Multiple ranking criteria
            ROW_NUMBER() OVER (ORDER BY total_interactions DESC) as rank_by_volume,
            ROW_NUMBER() OVER (ORDER BY unique_users DESC) as rank_by_reach,
            ROW_NUMBER() OVER (ORDER BY interactions_per_user DESC) as rank_by_engagement,
            ROW_NUMBER() OVER (ORDER BY active_days DESC) as rank_by_consistency,
            ROW_NUMBER() OVER (ORDER BY countries_reached DESC) as rank_by_geographic_reach,
            -- Composite performance score (weighted)
            (
                COALESCE(total_interactions::DECIMAL / NULLIF(MAX(total_interactions) OVER(), 0), 0) * 0.3 +
                COALESCE(unique_users::DECIMAL / NULLIF(MAX(unique_users) OVER(), 0), 0) * 0.25 +
                COALESCE(interactions_per_user::DECIMAL / NULLIF(MAX(interactions_per_user) OVER(), 0), 0) * 0.2 +
                COALESCE(active_days::DECIMAL / NULLIF(MAX(active_days) OVER(), 0), 0) * 0.15 +
                COALESCE(countries_reached::DECIMAL / NULLIF(MAX(countries_reached) OVER(), 0), 0) * 0.1
            ) * 100 as performance_score,
            -- Market share calculations
            ROUND(total_interactions::DECIMAL / NULLIF(SUM(total_interactions) OVER(), 0) * 100, 1) as volume_share_pct,
            ROUND(unique_users::DECIMAL / NULLIF(SUM(unique_users) OVER(), 0) * 100, 1) as user_share_pct,
            -- Usage pattern insights
            ROUND(mobile_interactions::DECIMAL / NULLIF(total_interactions, 0) * 100, 1) as mobile_usage_pct,
            ROUND(weekend_interactions::DECIMAL / NULLIF(total_interactions, 0) * 100, 1) as weekend_usage_pct,
            ROUND(direct_visits::DECIMAL / NULLIF(total_interactions, 0) * 100, 1) as direct_traffic_pct
        FROM touchpoint_performance
        WHERE total_interactions > 0  -- Only include touchpoints with activity
    ),
    top_performers AS (
        SELECT 
            *,
            ROW_NUMBER() OVER (ORDER BY performance_score DESC) as overall_rank,
            -- Performance tier classification
            CASE 
                WHEN performance_score >= 80 THEN 'top_performer'
                WHEN performance_score >= 60 THEN 'good_performer'
                WHEN performance_score >= 40 THEN 'average_performer'
                WHEN performance_score >= 20 THEN 'underperformer'
                ELSE 'poor_performer'
            END as performance_tier,
            -- Engagement quality assessment
            CASE 
                WHEN interactions_per_user >= 3.0 THEN 'high_engagement'
                WHEN interactions_per_user >= 2.0 THEN 'medium_engagement'
                WHEN interactions_per_user >= 1.5 THEN 'low_engagement'
                ELSE 'very_low_engagement'
            END as engagement_quality
        FROM ranked_touchpoints
    ),
    summary_stats AS (
        SELECT 
            COUNT(*) as total_touchpoints_analyzed,
            SUM(total_interactions) as total_interactions_all,
            COUNT(DISTINCT tp_id) as active_touchpoints_count,
            ROUND(AVG(performance_score), 1) as avg_performance_score,
            ROUND(AVG(interactions_per_user), 2) as avg_engagement_rate
        FROM top_performers
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
            'touchpoints_count', COALESCE(array_length(p_touchpoint_ids, 1), 0),
            'total_touchpoints_in_filter', (SELECT COUNT(*) FROM filtered_touchpoints),
            'active_touchpoints_in_period', (SELECT active_touchpoints_count FROM summary_stats)
        ),
        'top_touchpoints', COALESCE(
            (
                SELECT json_agg(
                    json_build_object(
                        'rank', overall_rank,
                        'touchpoint_id', tp_id,
                        'name', touchpoint_name,                        
                        'slug', touchpoint_slug,
                        'performance_score', ROUND(performance_score::NUMERIC, 1),
                        'performance_tier', performance_tier,
                        'engagement_quality', engagement_quality,
                        'associated_tags', associated_tags,
                        'core_metrics', json_build_object(
                            'total_interactions', total_interactions,
                            'unique_users', unique_users,
                            'interactions_per_user', interactions_per_user,
                            'active_days', active_days,
                            'volume_share_pct', volume_share_pct,
                            'user_share_pct', user_share_pct
                        ),
                        'interaction_breakdown', json_build_object(
                            'link_clicks', link_clicks,
                            'qr_scans', qr_scans,
                            'nfc_taps', nfc_taps,
                            'wifi_accesses', wifi_accesses
                        ),
                        'audience_insights', json_build_object(
                            'countries_reached', countries_reached,
                            'cities_reached', cities_reached,
                            'mobile_usage_pct', mobile_usage_pct,
                            'weekend_usage_pct', weekend_usage_pct,
                            'direct_traffic_pct', direct_traffic_pct,
                            'peak_hour', peak_hour
                        ),
                        'rankings', json_build_object(
                            'by_volume', rank_by_volume,
                            'by_reach', rank_by_reach,
                            'by_engagement', rank_by_engagement,
                            'by_consistency', rank_by_consistency,
                            'by_geographic_reach', rank_by_geographic_reach
                        )
                    ) ORDER BY overall_rank
                )
                FROM top_performers 
                WHERE overall_rank <= 5
            ),
            '[]'::json
        ),
        'summary', json_build_object(
            'total_touchpoints_analyzed', (SELECT total_touchpoints_analyzed FROM summary_stats),
            'active_touchpoints_count', (SELECT active_touchpoints_count FROM summary_stats),
            'total_interactions_all', (SELECT total_interactions_all FROM summary_stats),
            'avg_performance_score', (SELECT avg_performance_score FROM summary_stats),
            'avg_engagement_rate', (SELECT avg_engagement_rate FROM summary_stats),
            'top_performer', COALESCE(
                (
                    SELECT json_build_object(
                        'name', touchpoint_name,
                        'performance_score', ROUND(performance_score::NUMERIC, 1),
                        'total_interactions', total_interactions,
                        'performance_tier', performance_tier
                    )
                    FROM top_performers 
                    WHERE overall_rank = 1
                ),
                json_build_object('message', 'No active touchpoints in selected period')
            ),
            'performance_distribution', json_build_object(
                'top_performers', (SELECT COUNT(*) FROM top_performers WHERE performance_tier = 'top_performer'),
                'good_performers', (SELECT COUNT(*) FROM top_performers WHERE performance_tier = 'good_performer'),
                'average_performers', (SELECT COUNT(*) FROM top_performers WHERE performance_tier = 'average_performer'),  
                'underperformers', (SELECT COUNT(*) FROM top_performers WHERE performance_tier = 'underperformer'),
                'poor_performers', (SELECT COUNT(*) FROM top_performers WHERE performance_tier = 'poor_performer')
            )
        )
    ) INTO result
    FROM summary_stats;
    
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


