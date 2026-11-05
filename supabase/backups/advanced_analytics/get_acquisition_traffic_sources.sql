CREATE OR REPLACE FUNCTION public.get_acquisition_traffic_sources(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false)
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
