-- Backfill channel column on sessions and visits using GA4-compatible channel classification.
-- Only updates rows where channel IS NULL (i.e. rows created before the channel feature).

CREATE OR REPLACE FUNCTION classify_channel(
  p_source   text,
  p_medium   text,
  p_campaign text,
  p_referrer text
) RETURNS varchar(32)
LANGUAGE sql
IMMUTABLE
AS $$
SELECT
  CASE
    -- 1. Direct: no source, no medium, no referrer
    WHEN lower(trim(coalesce(p_source,   ''))) IN ('', '(direct)')
     AND lower(trim(coalesce(p_medium,   ''))) IN ('', '(not set)', '(none)', 'none')
     AND coalesce(p_referrer, '') = ''
    THEN 'Direct'

    -- 2. Cross-network
    WHEN lower(coalesce(p_campaign, '')) LIKE '%cross-network%'
    THEN 'Cross-network'

    -- 3. Email
    WHEN lower(coalesce(p_source, ''))  ~ 'email|e-mail|e_mail|e mail'
      OR lower(coalesce(p_medium, ''))  ~ 'email|e-mail|e_mail|e mail'
    THEN 'Email'

    -- 4. SMS
    WHEN lower(coalesce(p_source, '')) = 'sms'
      OR lower(coalesce(p_medium, '')) = 'sms'
    THEN 'SMS'

    -- 5. Mobile Push
    WHEN lower(coalesce(p_medium, '')) LIKE '%push'
      OR lower(coalesce(p_medium, '')) LIKE '%mobile%'
      OR lower(coalesce(p_medium, '')) LIKE '%notification%'
      OR lower(coalesce(p_source, '')) = 'firebase'
    THEN 'Mobile Push'

    -- 6. Affiliates
    WHEN lower(coalesce(p_medium, '')) = 'affiliate'
    THEN 'Affiliates'

    -- 7. Audio
    WHEN lower(coalesce(p_medium, '')) = 'audio'
    THEN 'Audio'

    -- 8. Paid Shopping
    WHEN (
      lower(coalesce(p_source, '')) = ANY(ARRAY[
        'google shopping','shopping.google.com','amazon','amazon.com',
        'ebay','ebay.com','etsy','etsy.com','walmart','walmart.com',
        'shopify','target','target.com','bestbuy','wayfair','wish',
        'aliexpress','lazada','shopee','tiki','sendo'
      ])
      OR coalesce(p_campaign, '') ~* '^(.*(([^a-df-z]|^)shopp.*))$'
    )
    AND lower(coalesce(p_medium, '')) ~ '^(.*cp.*|ppc|retargeting|paid.*)$'
    THEN 'Paid Shopping'

    -- 9. Paid Search
    WHEN lower(coalesce(p_source, '')) = ANY(ARRAY[
      'google','bing','yahoo','baidu','yandex','yandex.ru','duckduckgo',
      'ask','aol','ecosia','qwant','dogpile','naver','daum','sogou',
      'so.com','seznam.cz','virgilio.it','alice.it','lycos','altavista',
      'webcrawler','info.com'
    ])
    AND lower(coalesce(p_medium, '')) ~ '^(.*cp.*|ppc|retargeting|paid.*)$'
    THEN 'Paid Search'

    -- 10. Paid Social
    WHEN lower(coalesce(p_source, '')) = ANY(ARRAY[
      'facebook','instagram','twitter','x.com','t.co','linkedin','pinterest',
      'tiktok','snapchat','reddit','tumblr','whatsapp','telegram','discord',
      'quora','nextdoor','vk','vk.com','ok.ru','line','line.me','wechat',
      'weibo','threads','mastodon'
    ])
    AND lower(coalesce(p_medium, '')) ~ '^(.*cp.*|ppc|retargeting|paid.*)$'
    THEN 'Paid Social'

    -- 11. Paid Video
    WHEN lower(coalesce(p_source, '')) = ANY(ARRAY[
      'youtube','youtu.be','vimeo','tiktok','dailymotion','twitch','twitch.tv',
      'rumble','bilibili','wistia','loom','vzaar','brightcove','vidyard'
    ])
    AND lower(coalesce(p_medium, '')) ~ '^(.*cp.*|ppc|retargeting|paid.*)$'
    THEN 'Paid Video'

    -- 12. Display
    WHEN lower(coalesce(p_medium, '')) IN ('display','banner','expandable','interstitial','cpm')
    THEN 'Display'

    -- 13. Paid Other (paid medium that didn't match any specific channel above)
    WHEN lower(coalesce(p_medium, '')) ~ '^(.*cp.*|ppc|retargeting|paid.*)$'
    THEN 'Paid Other'

    -- 14. Organic Shopping
    WHEN lower(coalesce(p_source, '')) = ANY(ARRAY[
      'google shopping','shopping.google.com','amazon','amazon.com',
      'ebay','ebay.com','etsy','etsy.com','walmart','walmart.com',
      'shopify','target','target.com','bestbuy','wayfair','wish',
      'aliexpress','lazada','shopee','tiki','sendo'
    ])
    OR coalesce(p_campaign, '') ~* '^(.*(([^a-df-z]|^)shopp.*))$'
    THEN 'Organic Shopping'

    -- 15. Organic Social
    WHEN lower(coalesce(p_source, '')) = ANY(ARRAY[
      'facebook','instagram','twitter','x.com','t.co','linkedin','pinterest',
      'tiktok','snapchat','reddit','tumblr','whatsapp','telegram','discord',
      'quora','nextdoor','vk','vk.com','ok.ru','line','line.me','wechat',
      'weibo','threads','mastodon'
    ])
    OR lower(coalesce(p_medium, '')) = ANY(ARRAY[
      'social','social-network','social-media','sm','social network','social media'
    ])
    THEN 'Organic Social'

    -- 16. Organic Video
    WHEN lower(coalesce(p_source, '')) = ANY(ARRAY[
      'youtube','youtu.be','vimeo','tiktok','dailymotion','twitch','twitch.tv',
      'rumble','bilibili','wistia','loom','vzaar','brightcove','vidyard'
    ])
    OR lower(coalesce(p_medium, '')) LIKE '%video%'
    THEN 'Organic Video'

    -- 17. Organic Search
    WHEN lower(coalesce(p_source, '')) = ANY(ARRAY[
      'google','bing','yahoo','baidu','yandex','yandex.ru','duckduckgo',
      'ask','aol','ecosia','qwant','dogpile','naver','daum','sogou',
      'so.com','seznam.cz','virgilio.it','alice.it','lycos','altavista',
      'webcrawler','info.com'
    ])
    OR lower(coalesce(p_medium, '')) = 'organic'
    THEN 'Organic Search'

    -- 18. Referral
    WHEN lower(coalesce(p_medium, '')) IN ('referral','app','link')
      OR (
        coalesce(p_source,   '') = ''
        AND coalesce(p_medium,   '') = ''
        AND coalesce(p_referrer, '') <> ''
      )
    THEN 'Referral'

    ELSE 'Unassigned'
  END
$$;

-- Backfill sessions (utm stored as flat columns, referrer is the full URL)
UPDATE public.sessions
SET channel = classify_channel(utm_source, utm_medium, utm_campaign, referrer)
WHERE channel IS NULL;

-- Backfill visits (utm stored as JSONB in utm_tags, referrer is raw_referrer)
UPDATE public.visits
SET channel = classify_channel(
  utm_tags->>'utm_source',
  utm_tags->>'utm_medium',
  utm_tags->>'utm_campaign',
  raw_referrer
)
WHERE channel IS NULL;
