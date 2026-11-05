import { TagIcon, Link as LinkIcon } from 'lucide-react'

export type FilterOption = {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
  color?: string
}

export type FilterConfig = {
  key: string // 'tag_ids' | 'tp_ids'
  title: string
  icon?: React.ComponentType<{ className?: string }>
  queryKey: string
  fetchOptions: () => Promise<FilterOption[]>
}

/**
 * Factory function to create filter configurations
 * Defines how each filter type should be fetched and displayed
 */

export function createFilterConfigs(
  fetchTagDropdowns: () => Promise<
    Array<{ id: string; name: string; color?: string }>
  >,
  fetchTouchPointDropdowns: () => Promise<
    Array<{ id: string; name: string }>
  >,
): FilterConfig[] {
  return [
    {
      key: 'tag_ids',
      title: 'Filter by Tag',
      icon: TagIcon,
      queryKey: 'tag_ids',
      fetchOptions: async () => {
        const tags = await fetchTagDropdowns()
        return tags.map((tag) => ({
          label: tag.name,
          value: tag.id,
          color: tag.color,
        }))
      },
    },
    {
      key: 'tp_ids',
      title: 'Filter by Link',
      icon: LinkIcon,
      queryKey: 'tp_ids',
      fetchOptions: async () => {
        const touchPoints = await fetchTouchPointDropdowns()
        return touchPoints.map((tp) => ({
          label: tp.name,
          value: tp.id,
        }))
      },
    },
  ]
}

/**
 * Validation function to ensure filter config is valid
 */
export function isValidFilterConfig(config: Partial<FilterConfig>): boolean {
  return !!(config.key && config.title && config.queryKey && config.fetchOptions)
}

/**
 * Get filter config by key
 */
export function getFilterConfigByKey(
  configs: FilterConfig[],
  key: string,
): FilterConfig | undefined {
  return configs.find((config) => config.key === key)
}

/**
 * Type guard to check if value is a valid filter key
 */
export function isValidFilterKey(
  value: unknown,
  configs: FilterConfig[],
): value is string {
  return typeof value === 'string' && configs.some((c) => c.key === value)
}