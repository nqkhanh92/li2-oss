import { supabaseService } from '@/infrastructure/database/supabase'

export interface DebugLog {
  id: string
  created_at: string
  organization_id: string
  request_id: string
  request_type: 'lead' | 'sale' | 'pageview' | 'interaction'
  request_payload: Record<string, any>
  response_status: number
  response_body: Record<string, any> | null
  ip: string
  user_agent: string
  referrer: string
  publishable_key: string
  batch_size: number
  error_message: string | null
  error_code: string | null
  client_type: 'publishable' | 'api'
}

export interface DebugLogsParams {
  page: number
  limit: number
  request_type?: string
  client_type?: string
  start_date?: string
  end_date?: string
}

export interface DebugLogsResponse {
  data: DebugLog[]
  total: number
  has_more: boolean
}

export class DebugLogsRepository {
  private table = 'sdk_debug_logs' as const

  async getDebugLogs(orgId: string, params: DebugLogsParams): Promise<DebugLogsResponse> {
    const { page, limit, request_type, client_type, start_date, end_date } = params

    // Set defaults
    const currentPage = page < 1 ? 1 : page
    const pageLimit = limit < 1 ? 50 : limit
    const offset = (currentPage - 1) * pageLimit

    // Build query
    let query = supabaseService
      .from(this.table)
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageLimit - 1)

    // Add filters
    if (request_type) {
      query = query.eq('request_type', request_type)
    }

    if (client_type) {
      query = query.eq('client_type', client_type)
    }

    if (start_date) {
      query = query.gte('created_at', start_date)
    }

    if (end_date) {
      query = query.lte('created_at', end_date)
    }

    const { data, error, count } = await query

    if (error) throw error

    const total = count || 0
    const hasMore = currentPage * pageLimit < total

    return {
      data: data as DebugLog[],
      total,
      has_more: hasMore,
    }
  }

  async clearDebugLogs(orgId: string): Promise<number> {
    // First, get count
    const { count: totalCount, error: countError } = await supabaseService
      .from(this.table)
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)

    if (countError) throw countError

    if (!totalCount || totalCount === 0) {
      return 0
    }

    // Delete all logs for organization
    const { error } = await supabaseService.from(this.table).delete().eq('organization_id', orgId)

    if (error) throw error

    return totalCount
  }
}

export const debugLogsRepo = globalThis._debugLogsRepo ?? new DebugLogsRepository()

if (process.env.NODE_ENV !== 'production') globalThis._debugLogsRepo = debugLogsRepo
