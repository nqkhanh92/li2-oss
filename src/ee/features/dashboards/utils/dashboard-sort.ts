import type { DashboardWithWidgets } from '../types'

export type SortField = 'updated_at' | 'name' | 'created_at' | 'widget_count'

export const VALID_SORT_FIELDS: SortField[] = ['updated_at', 'name', 'created_at', 'widget_count']

export function sortDashboards<T extends DashboardWithWidgets>(
  dashboards: T[],
  field: SortField,
  descending: boolean,
): T[] {
  return [...dashboards].sort((a, b) => {
    // Pinned dashboards always float to top
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1

    let cmp: number
    switch (field) {
      case 'updated_at':
      case 'created_at':
        cmp = new Date(a[field]).getTime() - new Date(b[field]).getTime()
        break
      case 'name':
        cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        break
      case 'widget_count':
        cmp = a.dashboard_widgets.length - b.dashboard_widgets.length
        break
      default:
        cmp = 0
    }
    return descending ? -cmp : cmp
  })
}
