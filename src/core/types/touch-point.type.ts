import { privacySecuritySchema } from '@/shared/schemas/touch-points/privacy-security'
import { Tables } from '@/shared/types/database.types'
import { TouchPointVariantsContent } from '@/features/touch-points/types'
import { z } from 'zod'

export type TouchPoint = Omit<Tables<'touch_points'>, 'variants_content' | 'privacy_security'> & {
  variants_content: TouchPointVariantsContent
  privacy_security: z.infer<typeof privacySecuritySchema>
}

export type TouchPointDetail = TouchPoint & {
  profiles: Pick<Tables<'profiles'>, 'id' | 'name' | 'email'>
  tp_tag_links: {
    tag_id: string
    tags: Pick<Tables<'tags'>, 'id' | 'name' | 'color'>
  }[]
  collections?: Pick<Tables<'collections'>, 'id' | 'name' | 'color'> | null
}
export type ConversionSummary = {
  lead_count: number // unique customers (by customer_profile_id) with event_type = 'lead'
  total_revenue_usd: number // sum of amount where currency = 'USD'
  total_revenue_vnd: number // sum of amount where currency = 'VND'
}

/**
 * Metadata artifact đi kèm một touch point trong danh sách gộp.
 *
 * Chỉ những cột danh sách thật sự vẽ ra — không phải cả `ArtifactDTO`. Cột nặng (`storage_path`,
 * `password_hash`) không có mặt ở đây là cố ý: danh sách không cần, và chúng không nên rời khỏi
 * service artifact.
 */
export type TouchPointArtifactMeta = Pick<
  Tables<'artifacts'>,
  'id' | 'kind' | 'status' | 'access_mode' | 'size_bytes' | 'serve_token'
>

export type TouchPointInList = TouchPointDetail & {
  visits?: { count: number }[]
  conversion_summary?: ConversionSummary
  /**
   * `null` với link thường. Có giá trị với touch point `content_type = 'ARTIFACT'`.
   *
   * Đã chuẩn hoá về một đối tượng (hoặc `null`) bởi `normalizeArtifactEmbed` — PostgREST trả về
   * hình dạng khác nhau tuỳ nó có nhận ra quan hệ một-một hay không, và phần FE không nên phải biết
   * điều đó.
   */
  artifact?: TouchPointArtifactMeta | null
}

export const DynamicTargetingTypes = {
  GEOGRAPHY_TARGETING: 'geography',
  DEVICE_TARGETING: 'device',
  INTERACTION_TARGETING: 'interaction',
} as const

export type DynamicTargetingType =
  (typeof DynamicTargetingTypes)[keyof typeof DynamicTargetingTypes]

export type TouchPointExportType = {
  qr_enabled: TouchPointVariantsContent
  tags: {
    tag_id: string
    tags: Pick<Tables<'tags'>, 'id' | 'name' | 'color'>
  }[]
  created_by: string
  collection_name: string
  // UTM tag fields (flattened from utm_tags JSON for CSV export)
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_term: string
  utm_content: string
} & Pick<
  Tables<'touch_points'>,
  'name' | 'desc' | 'slug' | 'short_code' | 'content_value' | 'short_url' | 'created_at'
>

export type TouchPointWithCampaign = {
  id: string
  name: string
  utm_tags: Record<string, string>
  utm_campaign_touchpoints: Array<{ campaign_id: string; channel_id: string }>
  content_value: string
}
