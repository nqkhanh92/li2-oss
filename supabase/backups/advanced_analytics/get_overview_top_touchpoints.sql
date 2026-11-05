CREATE OR REPLACE FUNCTION public.get_overview_top_touchpoints(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false)
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
