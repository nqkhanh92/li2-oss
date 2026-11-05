import { supabaseService } from '@/infrastructure/database/supabase'
import { SearchFilterPagination } from '@/shared/types'

export interface SessionRow {
  id: string
  session_id: string
  visitor_id: string
  li2_cid: string | null
  started_at: string
  ended_at: string | null
  duration_ms: number | null
  page_count: number | null
  entry_page: string | null
  entry_url: string | null
  exit_page: string | null
  exit_url: string | null
  referrer: string | null
  referrer_domain: string | null
  is_bounce: boolean | null
  is_bot: boolean | null
  browser: string | null
  browser_version: string | null
  os: string | null
  os_version: string | null
  device_type: string | null
  country: string | null
  region: string | null
  city: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  ip: string | null
  recording_duration_ms: number | null
  created_at: string
}

const SESSION_COLUMNS = [
  'id',
  'session_id',
  'visitor_id',
  'li2_cid',
  'started_at',
  'ended_at',
  'duration_ms',
  'page_count',
  'entry_page',
  'entry_url',
  'exit_page',
  'exit_url',
  'referrer',
  'referrer_domain',
  'is_bounce',
  'is_bot',
  'browser',
  'browser_version',
  'os',
  'os_version',
  'device_type',
  'country',
  'region',
  'city',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'ip',
  'recording_duration_ms',
  'created_at',
].join(', ')

export interface RecordingChunkRow {
  chunk_index: number
  storage_path: string
  started_at: string
  ended_at: string
  page_url: string
  is_first_chunk: boolean
  device_type?: string
}

export class SessionRecordingRepository {
  async findSessionBySessionId(orgId: string, sessionId: string): Promise<SessionRow | null> {
    const { data, error } = await supabaseService
      .from('sessions')
      .select(SESSION_COLUMNS)
      .eq('organization_id', orgId)
      .eq('session_id', sessionId)
      .maybeSingle()

    if (error) throw error
    return data as unknown as SessionRow | null
  }

  async findChunksBySessionId(orgId: string, sessionId: string): Promise<RecordingChunkRow[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseService as any)
      .from('session_recordings')
      .select('chunk_index, storage_path, started_at, ended_at, page_url, is_first_chunk')
      .eq('organization_id', orgId)
      .eq('session_id', sessionId)
      .eq('is_bot', false)
      .order('chunk_index', { ascending: true })

    if (error) throw error
    return (data as RecordingChunkRow[]) ?? []
  }

  async findRecentFirstChunksForPage(
    orgId: string,
    hostname: string,
    pagePath: string,
    limit = 5,
    deviceType?: string,
    targetViewportWidth?: number,
  ): Promise<(RecordingChunkRow & { session_id: string; viewport_width: number | null })[]> {
    const urlPattern = `%${hostname}${pagePath}%`

    const chunks = await this._queryChunks(orgId, urlPattern, pagePath, limit, deviceType)
    console.log('[page-snapshot] chunks found:', chunks.length)

    const enriched = await this._enrichWithViewportWidth(orgId, chunks)

    if (targetViewportWidth != null) {
      enriched.sort((a, b) => {
        const da = Math.abs((a.viewport_width ?? 0) - targetViewportWidth)
        const db = Math.abs((b.viewport_width ?? 0) - targetViewportWidth)
        return da - db
      })
      console.log('[page-snapshot] sorted by nearest viewport_width to', targetViewportWidth)
    }

    return enriched
  }

  private async _queryChunks(
    orgId: string,
    urlPattern: string,
    pagePath: string,
    limit: number,
    deviceType?: string,
    sessionIds?: string[]
  ): Promise<(RecordingChunkRow & { session_id: string })[]> {
    if (sessionIds?.length === 0) return []

    // Fetch a larger pool to account for post-filtering by exact pathname
    const fetchLimit = limit * 4

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabaseService as any)
      .from('session_recordings')
      .select(
        'chunk_index, storage_path, started_at, ended_at, page_url, is_first_chunk, session_id, device_type'
      )
      .eq('organization_id', orgId)
      .eq('is_first_chunk', true)
      .eq('is_bot', false)
      .ilike('page_url', urlPattern)
      .order('started_at', { ascending: false })
      .limit(fetchLimit)

    if (deviceType) query = query.eq('device_type', deviceType)
    if (sessionIds) query = query.in('session_id', sessionIds)

    const { data, error } = await query
    if (error) throw error

    // Post-filter: exact pathname match to avoid /vi matching /vi/blog
    const normalizedPath = pagePath.endsWith('/') ? pagePath : `${pagePath}/`
    const filtered = ((data ?? []) as (RecordingChunkRow & { session_id: string })[]).filter((c) => {
      try {
        const pathname = new URL(c.page_url).pathname
        return pathname === pagePath || pathname === normalizedPath
      } catch {
        return false
      }
    })

    console.log('[page-snapshot] _queryChunks:', { urlPattern, pagePath, deviceType, sessionIds: sessionIds?.length, fetched: (data ?? []).length, afterFilter: filtered.length })
    return filtered.slice(0, limit)
  }

  private async _enrichWithViewportWidth(
    orgId: string,
    chunks: (RecordingChunkRow & { session_id: string })[]
  ): Promise<(RecordingChunkRow & { session_id: string; viewport_width: number | null })[]> {
    if (chunks.length === 0) return []

    const sessionIds = chunks.map((c) => c.session_id)
    const { data: pvData } = await supabaseService
      .from('pageviews')
      .select('session_id, viewport_width')
      .eq('organization_id', orgId)
      .in('session_id', sessionIds)
      .not('viewport_width', 'is', null)
      .limit(sessionIds.length * 5)

    const viewportMap = new Map<string, number>()
    for (const pv of (pvData ?? []) as { session_id: string; viewport_width: number }[]) {
      if (!viewportMap.has(pv.session_id)) viewportMap.set(pv.session_id, pv.viewport_width)
    }

    return chunks.map((c) => ({ ...c, viewport_width: viewportMap.get(c.session_id) ?? null }))
  }

  async findAll(
    orgId: string,
    params: SearchFilterPagination
  ): Promise<{ data: SessionRow[]; count: number }> {
    const enrichmentDelay = new Date(Date.now() - 3 * 60 * 1000).toISOString()

    let query = supabaseService
      .from('sessions')
      .select(`${SESSION_COLUMNS}, session_recordings!inner(session_id, chunk_index)`, { count: 'exact' })
      .eq('organization_id', orgId)
      .eq('session_recordings.chunk_index', 0)
      .eq('is_bot', false)
      .or('recording_duration_ms.is.null,recording_duration_ms.gte.5000')
      .lte('started_at', enrichmentDelay)

    // Search: partial match on visitor_id & session_id; exact match on ip
    const search = params?.filters?.search as string | undefined
    if (search) {
      query = query.or(`visitor_id.ilike.%${search}%,session_id.ilike.%${search}%,ip.eq.${search}`)
    }

    // Date range filter — skipped when a search term is active (search across all time)
    // Default to last 30 days to avoid full-table scans on large orgs
    if (!search) {
      const from = params?.filters?.from as string | undefined
      const to = params?.filters?.to as string | undefined
      if (from) {
        query = query.gte('started_at', from)
      } else {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('started_at', thirtyDaysAgo)
      }
      if (to) query = query.lte('started_at', to)
    }

    // Device – multi-select
    const deviceTypes = params?.filters?.device_types as string[] | undefined
    if (deviceTypes?.length) query = query.in('device_type', deviceTypes)

    // Browser – multi-select exact match
    const browsers = params?.filters?.browsers as string[] | undefined
    if (browsers?.length) query = query.in('browser', browsers)

    // OS – multi-select with normalized group mapping
    const osGroups = params?.filters?.oss as string[] | undefined
    if (osGroups?.length) {
      const osGroupMap: Record<string, string[]> = {
        macOS: ['macOS', 'Mac OS X'],
        iOS: ['iOS', 'iPhone OS'],
        Linux: ['Linux', 'Ubuntu', 'CrOS x86_64'],
        Windows: ['Windows'],
        Android: ['Android'],
      }
      const dbValues = [...new Set(osGroups.flatMap((g) => osGroupMap[g] ?? [g]))]
      query = query.in('os', dbValues)
    }

    // Country – comma-separated ISO codes, exact match
    const country = params?.filters?.country as string | undefined
    if (country) {
      const codes = country
        .split(',')
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean)
      if (codes.length) query = query.in('country', codes)
    }

    // Bounce – multi-select: only filter when exactly one value is selected
    const bounceFilters = params?.filters?.bounce_filters as string[] | undefined
    if (bounceFilters?.length === 1) {
      query = query.eq('is_bounce', bounceFilters[0] === 'true')
    }

    // Sorting
    if (params?.sorting?.length) {
      const sort = params.sorting[0]
      query = query.order(sort.id, { ascending: !sort.desc })
    } else {
      query = query.order('started_at', { ascending: false })
    }

    // Pagination
    if (params?.pagination) {
      const pageIndex = parseInt(`${params.pagination.pageIndex}`) || 0
      const pageSize = parseInt(`${params.pagination.pageSize}`) || 10
      const from = pageIndex * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)
    }

    const { data, error, count } = await query
    if (error) throw error

    return { data: (data as unknown as SessionRow[]) ?? [], count: count ?? 0 }
  }
}

export const sessionRecordingRepository = new SessionRecordingRepository()
