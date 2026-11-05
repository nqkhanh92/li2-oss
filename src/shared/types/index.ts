import { PaginationState, SortingState } from '@/shared/hooks/use-filters'

export type SearchFilterPagination = {
  pagination: PaginationState
  search?: string
  sorting: SortingState
  filters: Record<string, any>
}
export type PaginationResponse<T> = {
  pagination: PaginationState
  data: T[]
  rowCount: number
}

export interface BarChartData {
  dates: string[]
  counts: number[]
  [key: string]: any
}

export interface PieChartData {
  labels: string[]
  values: number[]
  [key: string]: any
}

export interface I18nMessage {
  key: string
  params?: Record<string, string | number>
  defaultMessage?: string
}

export interface APIResponse<T> {
  data: T
  message: string
  success: boolean
  i18nMessage?: I18nMessage
  [key: string]: any
}
