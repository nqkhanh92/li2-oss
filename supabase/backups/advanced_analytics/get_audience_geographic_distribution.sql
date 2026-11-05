CREATE OR REPLACE FUNCTION public.get_audience_geographic_distribution(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false)
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
