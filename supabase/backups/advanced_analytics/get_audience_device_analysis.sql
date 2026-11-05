CREATE OR REPLACE FUNCTION public.get_audience_device_analysis(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false)
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
