import {
  ConversionEventRepository,
  CustomerProfileRepository,
  conversionEventRepo,
  customerProfileRepo,
} from '../repositories/conversion.repository'
import { BaseService } from './base.service'
import { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { SearchFilterPagination } from '@/shared/types'
import { queryBuilderByParams } from '@/shared/lib/utils'
import { supabaseService } from '@/infrastructure/database/supabase'
import { differenceInMinutes, differenceInDays } from 'date-fns'
import { ConversionFilterParams } from '../types/conversions'
import { touchPointService } from './touch-point.service'
import { requestContext } from '@/shared/types/request'
import { memberRepo } from '../repositories/member.repository'
import { logger } from '@/infrastructure/logging/logger'
import { funnelRepo } from '../repositories/funnel.repository'

const log = logger.child({ service: 'conversion' })

export interface JourneyNode {
  /**
   * `artifact_view` thêm 2026-11-01: hai khách thật duy nhất trên LiHi tồn tại CHỈ vì họ đã mở
   * một artifact, mà timeline lại không có loại sự kiện nào cho việc đó nên hiện ra trống rỗng.
   * Bốn loại kia đều của một CRM bán hàng và đều rỗng trên dữ liệu thật.
   */
  type: 'first_visit' | 'lead' | 'sale' | 'session' | 'artifact_view'
  date: string
  touchPoint: string | null
  data: {
    eventName?: string
    amount?: number | null
    currency?: string | null
    referrer?: string | null
    linkedLeadId?: string | null
    metadata?: any
    // session-specific
    sessionId?: string
    durationMs?: number | null
    entryPage?: string | null
    exitPage?: string | null
    isBounce?: boolean
    browser?: string | null
    os?: string | null
    deviceType?: string | null
    pageviewCount?: number
    hasRecording?: boolean
    // artifact_view-specific
    artifactId?: string
    artifactName?: string
    serveToken?: string | null
    /** `artifact_views.view_count` — tổng số lần mở, KHÔNG phải số sự kiện riêng lẻ. */
    openCount?: number
    /** `last_viewed_at`; `date` của node là `first_viewed_at`. */
    lastViewedAt?: string | null
  }
}

export interface JourneyMetrics {
  timeToLead: number | null
  timeToSale: number | null
  totalEvents: number
}

/**
 * First visit information from visits table
 * Includes device, location, and traffic source data
 */
export interface FirstVisitInfo {
  id: string
  date: string
  referrer: string | null
  rawReferrer: string | null
  userAgent: string | null
  os: string | null
  platform: string | null
  city: string | null
  country: string | null
  region: string | null
  utmTags: {
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    utm_term?: string
  } | null
  interactionType: string | null // LINK, QR, NFC, WIFI
}

export interface CustomerJourney {
  timeline: JourneyNode[]
  metrics: JourneyMetrics
  firstVisit: FirstVisitInfo | null
}

export class ConversionService extends BaseService<ConversionEventRepository> {
  private customerRepo: CustomerProfileRepository

  constructor(repo: ConversionEventRepository, customerRepo: CustomerProfileRepository) {
    super(repo)
    this.customerRepo = customerRepo
  }

  async findAllConversions(
    orgId: string,
    conversionFilters: ConversionFilterParams,
    queryParams: SearchFilterPagination
  ) {
    const userId = requestContext.getStore()?.userId!
    const isOwner = await memberRepo.isOrganizationOwner(orgId, userId)
    let viewableTpIds: string[] = []
    if (!isOwner) {
      viewableTpIds = await touchPointService.getViewableTouchpointIds(orgId, userId)
    }

    // Two-step UTM source filter: match via click_id→visits OR session_id→sessions
    let utmMatchedClickIds: string[] | null = null
    let utmMatchedSessionIds: string[] | null = null
    if (conversionFilters.utmSources && conversionFilters.utmSources.length > 0) {
      const [{ data: matchingVisits }, { data: matchingSessions }] = await Promise.all([
        supabaseService
          .from('visits')
          .select('li2_cid')
          .in('utm_tags->>utm_source', conversionFilters.utmSources)
          .not('li2_cid', 'is', null),
        supabaseService
          .from('sessions')
          .select('session_id')
          .in('utm_source', conversionFilters.utmSources),
      ])
      utmMatchedClickIds = [...new Set((matchingVisits ?? []).map((v) => v.li2_cid).filter(Boolean) as string[])]
      utmMatchedSessionIds = (matchingSessions ?? []).map((s) => s.session_id).filter(Boolean) as string[]
    }

    // Two-step channel filter: match via click_id→visits OR session_id→sessions
    let channelMatchedClickIds: string[] | null = null
    let channelMatchedSessionIds: string[] | null = null
    if (conversionFilters.channels && conversionFilters.channels.length > 0) {
      const [{ data: matchingVisits }, { data: matchingSessions }] = await Promise.all([
        supabaseService
          .from('visits')
          .select('li2_cid')
          .in('channel', conversionFilters.channels)
          .not('li2_cid', 'is', null),
        supabaseService
          .from('sessions')
          .select('session_id')
          .in('channel', conversionFilters.channels),
      ])
      channelMatchedClickIds = [...new Set((matchingVisits ?? []).map((v) => v.li2_cid).filter(Boolean) as string[])]
      channelMatchedSessionIds = (matchingSessions ?? []).map((s) => s.session_id).filter(Boolean) as string[]
    }

    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      q = q.eq('organization_id', orgId)
      if (!isOwner) {
        const tpFilter = viewableTpIds.length > 0
          ? `touch_point_id.in.(${viewableTpIds.join(',')}),touch_point_id.is.null`
          : `touch_point_id.is.null`
        q = q.or(tpFilter)
      }
      q = queryBuilderByParams(q, queryParams)
      if (queryParams?.search) {
        q = q.or(
          `customer_profiles.email.ilike.%${queryParams.search}%,customer_profiles.name.ilike.%${queryParams.search}%`
        )
      }
      if (conversionFilters.source === 'direct') {
        q = q.is('touch_point_id', null)
      } else if (conversionFilters.source === 'attributed') {
        q = q.not('touch_point_id', 'is', null)
      }
      if (conversionFilters.eventNames && conversionFilters.eventNames.length > 0) {
        q = q.in('event_name', conversionFilters.eventNames)
      }
      if (conversionFilters.touchPointIds && conversionFilters.touchPointIds.length > 0) {
        q = q.in('touch_point_id', conversionFilters.touchPointIds)
      }
      if (conversionFilters.tagIds && conversionFilters.tagIds.length > 0) {
        q = q.in('touch_points.tp_tag_links.tag_id', conversionFilters.tagIds)
        q = q.not('touch_points.tp_tag_links', 'is', null)
      }
      if (conversionFilters.collectionIds && conversionFilters.collectionIds.length > 0) {
        q = q.in('touch_points.collection_id', conversionFilters.collectionIds)
      }
      if (utmMatchedClickIds !== null && utmMatchedSessionIds !== null) {
        const hasClick = utmMatchedClickIds.length > 0
        const hasSession = utmMatchedSessionIds.length > 0
        if (!hasClick && !hasSession) {
          q = q.eq('id', '00000000-0000-0000-0000-000000000000')
        } else {
          const parts: string[] = []
          if (hasClick) parts.push(`click_id.in.(${utmMatchedClickIds.join(',')})`)
          if (hasSession) parts.push(`session_id.in.(${utmMatchedSessionIds.join(',')})`)
          q = q.or(parts.join(','))
        }
      }
      if (channelMatchedClickIds !== null && channelMatchedSessionIds !== null) {
        const hasClick = channelMatchedClickIds.length > 0
        const hasSession = channelMatchedSessionIds.length > 0
        if (!hasClick && !hasSession) {
          q = q.eq('id', '00000000-0000-0000-0000-000000000000')
        } else {
          const parts: string[] = []
          if (hasClick) parts.push(`click_id.in.(${channelMatchedClickIds.join(',')})`)
          if (hasSession) parts.push(`session_id.in.(${channelMatchedSessionIds.join(',')})`)
          q = q.or(parts.join(','))
        }
      }

      return q
    }

    const result = await this.repo.findAllWithJoins(modifier)

    // Enrich events with utm_source:
    // - has click_id → visits.li2_cid → visits.utm_tags.utm_source
    // - no click_id but has session_id → sessions.session_id → sessions.utm_source
    const events = result.data ?? []
    const clickIds = [...new Set(events.map((e: any) => e.click_id).filter(Boolean) as string[])]
    const noClickSessionIds = [...new Set(
      events.filter((e: any) => !e.click_id && e.session_id).map((e: any) => e.session_id) as string[]
    )]

    const [visitsData, sessionsData] = await Promise.all([
      clickIds.length > 0
        ? supabaseService.from('visits').select('li2_cid, utm_tags, channel').in('li2_cid', clickIds)
            .then(({ data }) => data ?? [])
        : Promise.resolve([]),
      noClickSessionIds.length > 0
        ? supabaseService.from('sessions').select('session_id, utm_source, channel')
            .in('session_id', noClickSessionIds)
            .then(({ data }) => data ?? [])
        : Promise.resolve([]),
    ])

    const clickIdToVisit = new Map<string, { utm_source?: string; channel?: string }>()
    for (const v of visitsData) {
      if (v.li2_cid && !clickIdToVisit.has(v.li2_cid)) {
        clickIdToVisit.set(v.li2_cid, {
          utm_source: (v.utm_tags as Record<string, string> | null)?.utm_source ?? undefined,
          channel: v.channel ?? undefined,
        })
      }
    }

    const sessionIdToSession = new Map<string, { utm_source?: string; channel?: string }>()
    for (const s of sessionsData) {
      if (s.session_id && !sessionIdToSession.has(s.session_id)) {
        sessionIdToSession.set(s.session_id, {
          utm_source: s.utm_source ?? undefined,
          channel: s.channel ?? undefined,
        })
      }
    }

    result.data = events.map((e: any) => {
      const fromVisit = e.click_id ? clickIdToVisit.get(e.click_id) : undefined
      const fromSession = !e.click_id && e.session_id ? sessionIdToSession.get(e.session_id) : undefined
      const source = fromVisit ?? fromSession
      return {
        ...e,
        utm_source: source?.utm_source ?? null,
        channel: source?.channel ?? null,
      }
    })

    return result
  }

  async findAllCustomers(orgId: string, queryParams: SearchFilterPagination) {
    // Handle country filter - get matching li2_cids from visits table
    const countries = queryParams?.filters?.countries as string[] | undefined
    let matchingLi2Cids: string[] | null = null

    if (countries && countries.length > 0) {
      const { data: visits } = await supabaseService
        .from('visits')
        .select('li2_cid')
        .in('country', countries)
        .not('li2_cid', 'is', null)

      matchingLi2Cids = [...new Set(visits?.map((v) => v.li2_cid).filter(Boolean) as string[])]

      // If no visits match the countries, return empty result
      if (matchingLi2Cids.length === 0) {
        return { data: [], count: 0 }
      }
    }

    // Remove countries from filters before passing to queryBuilderByParams
    // since we handle country filtering manually via first_click_id
    // Use destructuring to actually remove the property (undefined still gets processed by match())
    const { countries: _excludedCountries, ...restFilters } = queryParams?.filters || {}
    const filteredQueryParams = {
      ...queryParams,
      filters: restFilters,
    }

    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      q = q.eq('organization_id', orgId)
      q = queryBuilderByParams(q, filteredQueryParams)
      if (queryParams?.search) {
        q = q.or(`email.ilike.%${queryParams.search}%,name.ilike.%${queryParams.search}%`)
      }
      // Apply country filter via first_click_id
      if (matchingLi2Cids) {
        q = q.in('first_click_id', matchingLi2Cids)
      }
      return q
    }

    const result = await this.customerRepo.findAllWithJoins(modifier)

    // Enrich customers with country and visitor_id
    if (result.data?.length) {
      // Primary: first_click_id → visits.li2_cid → country, visitor_id
      const li2Cids = result.data.map((c: any) => c.first_click_id).filter(Boolean) as string[]
      const visitCountryMap = new Map<string, string>()
      const visitVisitorIdMap = new Map<string, string>()
      if (li2Cids.length > 0) {
        const { data: visits } = await supabaseService
          .from('visits')
          .select('li2_cid, country, visitor_id')
          .in('li2_cid', li2Cids)
        for (const v of visits || []) {
          if (v.li2_cid && !visitCountryMap.has(v.li2_cid)) {
            if (v.country) visitCountryMap.set(v.li2_cid, v.country)
            if (v.visitor_id) visitVisitorIdMap.set(v.li2_cid, v.visitor_id)
          }
        }
      }

      // Fallback: no first_click_id → conversion_events (visitor_id direct, session_id → sessions.country)
      const noClickIds = result.data
        .filter((c: any) => !c.first_click_id)
        .map((c: any) => c.id) as string[]
      const sessionCountryMap = new Map<string, string>()   // customer_id → country
      const sessionVisitorIdMap = new Map<string, string>() // customer_id → visitor_id
      if (noClickIds.length > 0) {
        const { data: fallbackEvents } = await supabaseService
          .from('conversion_events')
          .select('customer_profile_id, session_id, visitor_id, created_at')
          .in('customer_profile_id', noClickIds)
          .order('created_at', { ascending: true })

        const customerToSessionId = new Map<string, string>()
        for (const e of fallbackEvents || []) {
          if (!e.customer_profile_id) continue
          if (!sessionVisitorIdMap.has(e.customer_profile_id) && e.visitor_id) {
            sessionVisitorIdMap.set(e.customer_profile_id, e.visitor_id)
          }
          if (!customerToSessionId.has(e.customer_profile_id) && e.session_id) {
            customerToSessionId.set(e.customer_profile_id, e.session_id)
          }
        }

        if (customerToSessionId.size > 0) {
          const sessionIds = [...new Set(customerToSessionId.values())]
          const { data: fallbackSessions } = await supabaseService
            .from('sessions')
            .select('session_id, country')
            .in('session_id', sessionIds)
            .not('country', 'is', null)

          const sessionIdToCountry = new Map<string, string>()
          for (const s of fallbackSessions || []) {
            if (s.session_id && s.country) sessionIdToCountry.set(s.session_id, s.country)
          }

          for (const [customerId, sessionId] of customerToSessionId) {
            const country = sessionIdToCountry.get(sessionId)
            if (country) sessionCountryMap.set(customerId, country)
          }
        }
      }

      // For customers with first_click_id but no visitor_id from visits, try conversion_events
      const missingVisitorIds = result.data
        .filter((c: any) => c.first_click_id && !visitVisitorIdMap.has(c.first_click_id))
        .map((c: any) => c.id) as string[]
      const eventVisitorIdMap = new Map<string, string>() // customer_id → visitor_id
      if (missingVisitorIds.length > 0) {
        const { data: events } = await supabaseService
          .from('conversion_events')
          .select('customer_profile_id, visitor_id, created_at')
          .in('customer_profile_id', missingVisitorIds)
          .not('visitor_id', 'is', null)
          .order('created_at', { ascending: true })
        for (const e of events || []) {
          if (e.customer_profile_id && e.visitor_id && !eventVisitorIdMap.has(e.customer_profile_id)) {
            eventVisitorIdMap.set(e.customer_profile_id, e.visitor_id)
          }
        }
      }

      result.data = result.data.map((c: any) => ({
        ...c,
        country: c.first_click_id
          ? visitCountryMap.get(c.first_click_id) ?? null
          : sessionCountryMap.get(c.id) ?? null,
        visitor_id: c.first_click_id
          ? (visitVisitorIdMap.get(c.first_click_id) ?? eventVisitorIdMap.get(c.id) ?? null)
          : sessionVisitorIdMap.get(c.id) ?? null,
      }))
    }

    return result
  }

  async findCustomerById(orgId: string, customerId: string) {
    return this.customerRepo.findByIdAndOrg(customerId, orgId)
  }

  async getDistinctEventNames(orgId: string): Promise<string[]> {
    return this.repo.getDistinctEventNames(orgId)
  }

  async getStats(orgId: string, params?: ConversionFilterParams) {
    const userId = requestContext.getStore()?.userId!

    // Get viewable touch point IDs based on user permissions
    const viewableTpIds = await touchPointService.getViewableTouchpointIds(orgId, userId)

    return this.repo.getStats(orgId, viewableTpIds, params)
  }

  async getFunnelData(orgId: string, params: ConversionFilterParams) {
    const userId = requestContext.getStore()?.userId!

    // Get viewable touch point IDs based on user permissions
    const viewableTpIds = await touchPointService.getViewableTouchpointIds(orgId, userId)

    return this.repo.getFunnelData(orgId, viewableTpIds, params)
  }

  async getCustomerJourney(orgId: string, customerId: string): Promise<CustomerJourney> {
    /**
     * 1. Hồ sơ khách — lọc THEO CẢ `organization_id`.
     *
     * Trước đây gọi `findByIdWithTouchPoint(customerId)`, không có điều kiện org nào. Route đã
     * `ensurePolicy(org_id, ...)` nhưng đó chỉ chứng minh người gọi là thành viên của `org_id`
     * trong URL — `customer_id` thì vẫn lấy thẳng từ URL và repo truy bằng client service-role
     * (bỏ qua RLS). Nên một thành viên org A đọc được hành trình của khách org B chỉ cần đoán
     * đúng cặp (org của mình, uuid khách của họ).
     */
    const customer = await this.customerRepo.findByIdAndOrg(customerId, orgId)
    if (!customer) {
      return { timeline: [], metrics: { timeToLead: null, timeToSale: null, totalEvents: 0 }, firstVisit: null }
    }

    // 2. Get first visit info and sessions
    let firstVisitInfo: FirstVisitInfo | null = null
    let firstVisitForTimeline: { created_at: string; referrer: string | null } | null = null
    let sessions: any[] = []

    if (customer?.first_click_id) {
      // Primary: use first_click_id to find visit and sessions
      const { data, error } = await supabaseService
        .from('visits')
        .select(
          `id, created_at, referrer, raw_referrer, user_agent, os, platform,
           city, country, region, utm_tags, type`
        )
        .eq('li2_cid', customer.first_click_id)
        .order('created_at', { ascending: true })
        .limit(1)

      if (error) {
        log.warn(
          { customerId, li2Cid: customer.first_click_id, error: error.message },
          'Failed to fetch first visit data for customer'
        )
      } else if (data && data.length > 0) {
        const visit = data[0]
        firstVisitInfo = {
          id: visit.id,
          date: visit.created_at,
          referrer: visit.referrer,
          rawReferrer: visit.raw_referrer,
          userAgent: visit.user_agent,
          os: visit.os,
          platform: visit.platform,
          city: visit.city,
          country: visit.country,
          region: visit.region,
          utmTags: visit.utm_tags as FirstVisitInfo['utmTags'],
          interactionType: visit.type,
        }
        firstVisitForTimeline = { created_at: visit.created_at, referrer: visit.referrer }
      }

      const { data: sessionData } = await supabaseService
        .from('sessions')
        .select(
          'session_id, started_at, ended_at, duration_ms, entry_page, exit_page, browser, os, device_type, is_bounce'
        )
        .eq('organization_id', orgId)
        .eq('li2_cid', customer.first_click_id)
        .order('started_at', { ascending: true })
      sessions = sessionData ?? []
    } else {
      // Fallback: no first_click_id → find sessions via conversion_events
      const { data: fallbackEvents } = await supabaseService
        .from('conversion_events')
        .select('session_id, created_at')
        .eq('organization_id', orgId)
        .eq('customer_profile_id', customerId)
        .not('session_id', 'is', null)
        .order('created_at', { ascending: true })

      const seen = new Set<string>()
      const fallbackSessionIds: string[] = []
      for (const e of fallbackEvents || []) {
        if (e.session_id && !seen.has(e.session_id)) {
          seen.add(e.session_id)
          fallbackSessionIds.push(e.session_id)
        }
      }

      if (fallbackSessionIds.length > 0) {
        const { data: sessionData } = await supabaseService
          .from('sessions')
          .select(
            'session_id, started_at, ended_at, duration_ms, entry_page, exit_page, browser, os, device_type, is_bounce, city, country, region, referrer, utm_source, utm_medium, utm_campaign, utm_content, utm_term'
          )
          .eq('organization_id', orgId)
          .in('session_id', fallbackSessionIds)
          .order('started_at', { ascending: true })
        sessions = sessionData ?? []

        // Use earliest session as first visit info
        if (sessions.length > 0) {
          const s = sessions[0]
          const hasUtm = s.utm_source || s.utm_medium || s.utm_campaign
          firstVisitInfo = {
            id: s.session_id,
            date: s.started_at,
            referrer: s.referrer,
            rawReferrer: null,
            userAgent: null,
            os: s.os,
            platform: null,
            city: s.city,
            country: s.country,
            region: s.region,
            utmTags: hasUtm
              ? {
                  utm_source: s.utm_source ?? undefined,
                  utm_medium: s.utm_medium ?? undefined,
                  utm_campaign: s.utm_campaign ?? undefined,
                  utm_content: s.utm_content ?? undefined,
                  utm_term: s.utm_term ?? undefined,
                }
              : null,
            interactionType: null,
          }
          firstVisitForTimeline = { created_at: s.started_at, referrer: s.referrer }
        }
      }
    }

    // 4. Batch count page views per session (event_name IS NULL = actual page view)
    const pageviewCounts = new Map<string, number>()
    if (sessions.length > 0) {
      const sessionIds = sessions.map((s) => s.session_id)
      const { data: pvRows } = await supabaseService
        .from('pageviews')
        .select('session_id, event_name')
        .in('session_id', sessionIds)
        .eq('organization_id', orgId)
      for (const row of pvRows ?? []) {
        if (row.event_name === null) {
          pageviewCounts.set(row.session_id, (pageviewCounts.get(row.session_id) ?? 0) + 1)
        }
      }
    }

    // 5. Check which sessions have recordings
    const sessionIdsWithRecording = new Set<string>()
    if (sessions.length > 0) {
      const sessionIds = sessions.map((s) => s.session_id)
      const { data: recRows } = await supabaseService
        .from('session_recordings')
        .select('session_id')
        .in('session_id', sessionIds)
        .eq('organization_id', orgId)
      for (const row of recRows ?? []) {
        sessionIdsWithRecording.add(row.session_id)
      }
    }

    // 6. Get all conversion events for this customer
    const events = await this.repo.findByCustomerId(orgId, customerId, {
      orderBy: 'created_at',
      orderDir: 'asc',
    })

    // 7. Build timeline nodes
    const timeline: JourneyNode[] = []

    if (firstVisitForTimeline) {
      timeline.push({
        type: 'first_visit',
        date: firstVisitForTimeline.created_at,
        touchPoint: (customer?.touch_points as { name: string } | null)?.name ?? null,
        data: { referrer: firstVisitForTimeline.referrer },
      })
    }

    for (const s of sessions) {
      timeline.push({
        type: 'session',
        date: s.started_at,
        touchPoint: (customer?.touch_points as { name: string } | null)?.name ?? null,
        data: {
          sessionId: s.session_id,
          durationMs: s.duration_ms,
          entryPage: s.entry_page,
          exitPage: s.exit_page,
          isBounce: s.is_bounce ?? false,
          browser: s.browser,
          os: s.os,
          deviceType: s.device_type,
          pageviewCount: pageviewCounts.get(s.session_id) ?? 0,
          hasRecording: sessionIdsWithRecording.has(s.session_id),
        },
      })
    }

    /**
     * Nội dung khách này đã mở. `artifact_views` giữ MỘT hàng cho mỗi (artifact, khách) với
     * `view_count`, không giữ từng lần mở — nên một hàng ra MỘT node đặt ở `first_viewed_at`,
     * kèm `openCount` và `lastViewedAt`. UI phải nói "đã mở N lần", không được vẽ N node giả.
     */
    const { data: artifactViews, error: artifactViewError } = await supabaseService
      .from('artifact_views')
      .select('artifact_id, view_count, first_viewed_at, last_viewed_at, artifacts(name, serve_token)')
      .eq('organization_id', orgId)
      .eq('customer_profile_id', customerId)
      .order('first_viewed_at', { ascending: true })

    if (artifactViewError) {
      log.warn(
        { customerId, orgId, error: artifactViewError.message },
        'Failed to fetch artifact views for customer journey'
      )
    }

    for (const view of artifactViews || []) {
      const artifact = view.artifacts as { name: string; serve_token: string | null } | null
      timeline.push({
        type: 'artifact_view',
        date: view.first_viewed_at,
        touchPoint: null,
        data: {
          artifactId: view.artifact_id,
          artifactName: artifact?.name ?? view.artifact_id,
          serveToken: artifact?.serve_token ?? null,
          openCount: Number(view.view_count ?? 0),
          lastViewedAt: view.last_viewed_at ?? null,
        },
      })
    }

    for (const event of events || []) {
      timeline.push({
        type: event.event_type as 'lead' | 'sale',
        date: event.created_at,
        touchPoint: (event.touch_points as { name: string } | null)?.name ?? null,
        data: {
          eventName: event.event_name,
          amount: event.amount,
          currency: event.currency,
          linkedLeadId: event.lead_event_id,
          metadata: event.metadata ?? undefined,
        },
      })
    }

    // 7. Sort timeline chronologically
    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // 8. Calculate metrics
    const metrics = this.calculateJourneyMetrics(timeline)

    return { timeline, metrics, firstVisit: firstVisitInfo }
  }

  async getCustomerSessionPageviews(orgId: string, _customerId: string, sessionId: string) {
    return funnelRepo.getSessionWithPageviews(orgId, sessionId)
  }

  async getCustomerConversions(orgId: string, customerId: string) {
    return this.repo.findByCustomerIdWithLeadEvent(orgId, customerId)
  }

  async getTouchpointAttribution(
    orgId: string,
    params: {
      startDate?: string | null
      endDate?: string | null
      touchPointId?: string | null
      limit?: number | null
    }
  ) {
    return this.repo.getTouchpointAttribution(orgId, params)
  }

  async getTouchpointAttributionFull(orgId: string, params?: ConversionFilterParams) {
    const userId = requestContext.getStore()?.userId!

    // Get viewable touch point IDs based on user permissions
    const viewableTpIds = await touchPointService.getViewableTouchpointIds(orgId, userId)

    return this.repo.getTouchpointAttributionFull(orgId, viewableTpIds, params)
  }

  /**
   * Get distinct countries from customer first visits for filtering
   * Returns country codes with customer counts, sorted by count descending
   */
  async getCustomerCountries(orgId: string): Promise<Array<{ country: string; count: number }>> {
    const { data: customers, error } = await supabaseService
      .from('customer_profiles')
      .select('id, first_click_id')
      .eq('organization_id', orgId)

    if (error) {
      log.error({ error, orgId }, 'Failed to fetch customers for country aggregation')
      throw error
    }
    if (!customers?.length) return []

    const customerToCountry = new Map<string, string>() // customer_id → country

    // Primary: first_click_id → visits.li2_cid → country
    const withClickId = customers.filter((c) => c.first_click_id)
    if (withClickId.length > 0) {
      const uniqueLi2Cids = [...new Set(withClickId.map((c) => c.first_click_id).filter(Boolean))]
      const { data: visits, error: visitError } = await supabaseService
        .from('visits')
        .select('li2_cid, country')
        .in('li2_cid', uniqueLi2Cids)
        .not('country', 'is', null)
      if (visitError) {
        log.error({ error: visitError, orgId }, 'Failed to fetch visits for country aggregation')
        throw visitError
      }
      const li2CidToCountry = new Map<string, string>()
      for (const v of visits || []) {
        if (v.li2_cid && v.country && !li2CidToCountry.has(v.li2_cid)) {
          li2CidToCountry.set(v.li2_cid, v.country)
        }
      }
      for (const c of withClickId) {
        const country = li2CidToCountry.get(c.first_click_id!)
        if (country) customerToCountry.set(c.id, country)
      }
    }

    // Fallback: no first_click_id → conversion_events → session_id → sessions.country
    const withoutClickId = customers.filter((c) => !c.first_click_id)
    if (withoutClickId.length > 0) {
      const ids = withoutClickId.map((c) => c.id)
      const { data: fallbackEvents } = await supabaseService
        .from('conversion_events')
        .select('customer_profile_id, session_id, created_at')
        .in('customer_profile_id', ids)
        .not('session_id', 'is', null)
        .order('created_at', { ascending: true })

      const customerToSessionId = new Map<string, string>()
      for (const e of fallbackEvents || []) {
        if (e.customer_profile_id && e.session_id && !customerToSessionId.has(e.customer_profile_id)) {
          customerToSessionId.set(e.customer_profile_id, e.session_id)
        }
      }

      if (customerToSessionId.size > 0) {
        const sessionIds = [...new Set(customerToSessionId.values())]
        const { data: fallbackSessions } = await supabaseService
          .from('sessions')
          .select('session_id, country')
          .in('session_id', sessionIds)
          .not('country', 'is', null)

        const sessionIdToCountry = new Map<string, string>()
        for (const s of fallbackSessions || []) {
          if (s.session_id && s.country) sessionIdToCountry.set(s.session_id, s.country)
        }

        for (const [customerId, sessionId] of customerToSessionId) {
          const country = sessionIdToCountry.get(sessionId)
          if (country) customerToCountry.set(customerId, country)
        }
      }
    }

    const countryMap = new Map<string, number>()
    for (const country of customerToCountry.values()) {
      countryMap.set(country, (countryMap.get(country) || 0) + 1)
    }

    return Array.from(countryMap.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
  }

  /**
   * Get all customers for CSV export with first visit data
   */
  async findAllCustomersForExport(
    orgId: string,
    options: { limit?: number } = {}
  ): Promise<{ data: any[]; count: number }> {
    const { limit = 10000 } = options

    // Get customers with touch points
    const {
      data: customers,
      error,
      count,
    } = await supabaseService
      .from('customer_profiles')
      .select('*, touch_points!customer_profiles_first_tp_fkey(id, name, short_url)', {
        count: 'exact',
      })
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      log.error({ error, orgId }, 'Failed to fetch customers for export')
      throw error
    }

    if (!customers?.length) {
      return { data: [], count: 0 }
    }

    // Get first visit data for all customers
    const li2Cids = customers.map((c) => c.first_click_id).filter(Boolean) as string[]

    let visitMap = new Map<string, any>()
    if (li2Cids.length > 0) {
      const { data: visits } = await supabaseService
        .from('visits')
        .select('li2_cid, country, city, utm_tags')
        .in('li2_cid', li2Cids)

      // Map visits by li2_cid (take first visit for each)
      for (const v of visits || []) {
        if (v.li2_cid && !visitMap.has(v.li2_cid)) {
          visitMap.set(v.li2_cid, {
            country: v.country,
            city: v.city,
            utm_tags: v.utm_tags,
          })
        }
      }
    }

    // Merge customer data with first visit info
    const enrichedData = customers.map((customer) => ({
      ...customer,
      first_visit: customer.first_click_id ? visitMap.get(customer.first_click_id) || null : null,
    }))

    return { data: enrichedData, count: count || customers.length }
  }

  private calculateJourneyMetrics(timeline: JourneyNode[]): JourneyMetrics {
    const firstVisit = timeline.find((n) => n.type === 'first_visit')
    const firstLead = timeline.find((n) => n.type === 'lead')
    const firstSale = timeline.find((n) => n.type === 'sale')

    return {
      timeToLead:
        firstVisit && firstLead
          ? differenceInMinutes(new Date(firstLead.date), new Date(firstVisit.date))
          : null,
      timeToSale:
        firstLead && firstSale
          ? differenceInDays(new Date(firstSale.date), new Date(firstLead.date))
          : null,
      totalEvents: timeline.length,
    }
  }
}

export const conversionService =
  process.env.NODE_ENV !== 'production'
    ? new ConversionService(conversionEventRepo, customerProfileRepo)
    : (globalThis._conversionService ??
      (globalThis._conversionService = new ConversionService(
        conversionEventRepo,
        customerProfileRepo
      )))
