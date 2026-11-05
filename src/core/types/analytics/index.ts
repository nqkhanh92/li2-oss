type VisitByLink = {
  link_id: string
  short_link: string
  visit_count: number
  unique_count: number
}
type VisitBySpace = {
  space_id: string
  space_name: string
  visit_count: number
  unique_count: number
}

type VisitByTag = {
  tag_id: string
  tag_name: string
  visit_count: number
  unique_count: number
}

type VisitByDestination = {
  destination: string
  segment: string
  visit_count: number
  unique_count: number
}

type VisitByReferrer = {
  referrer: string
  visit_count: number
  unique_count: number
}

type VisitByUTMParameter = {
  utm_value: string
  visit_count: number
  unique_count: number
}

export type TypeVisitByLinks = 'by_links' | 'by_tags' | 'by_spaces'
type VisitByLinkMap = {
  by_links: VisitByLink[]
  by_tags: VisitByTag[]
  by_spaces: VisitBySpace[]
}
type VisitByLinkDataType<T extends TypeVisitByLinks> = VisitByLinkMap[T]

export type RankingShortLinkVisits<T extends TypeVisitByLinks> = {
  data: VisitByLinkDataType<T>
  type: T
  total: number
  total_unique: number
}

export type RankingDestinationVisits = {
  type: 'full_urls' | 'base_urls'
  data: VisitByDestination[]
  total: number
  total_unique: number
}

export type RankingReferrerVisits = {
  type: 'referrer' | 'raw'
  data: VisitByReferrer[]
  total: number
  total_unique: number
}

export type RankingUTMParameterVisits = {
  type: 'by_source' | 'by_medium' | 'by_campaign' | 'by_term' | 'by_content'
  data: VisitByUTMParameter[]
  total: number
  total_unique: number
}

export type AnalyticQueryParams = {
  tag_ids: string[]
  tp_ids: string[]
  date_range: { from: Date | string; to: Date | string }
  exclude_bot?: string
  collection_ids?: string[]
  utm_source_values?: string[]
  utm_medium_values?: string[]
  utm_campaign_values?: string[]
  removeSpaceFilters?: string
  interaction_types?: string[]
}
