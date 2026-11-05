export type ConversionSource = 'all' | 'attributed' | 'direct'

export type ConversionFilterParams = {
  collectionIds?: string[]
  tagIds?: string[]
  startDate?: string
  endDate?: string
  excludeBot?: boolean
  touchPointIds?: string[]
  source?: ConversionSource
  eventNames?: string[]
  utmSources?: string[]
  channels?: string[]
}
