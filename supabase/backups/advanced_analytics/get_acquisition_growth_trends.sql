CREATE OR REPLACE FUNCTION public.get_acquisition_growth_trends(p_organization_id uuid, p_period_days integer, p_timezone text DEFAULT 'UTC'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_touchpoint_ids uuid[] DEFAULT NULL::uuid[], p_is_premium boolean DEFAULT false)
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
