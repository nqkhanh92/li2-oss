import { BaseRepository } from '@/core/repositories/base.repository'
import { supabaseService } from '@/infrastructure/database/supabase'
import { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { FunnelData } from '@/ee/features/conversions/types'
import { currencyService } from '@/core/services/currency.service'
import { CURRENCY_CONFIG, SupportedCurrency } from '@/shared/lib/currency'
import { ConversionFilterParams } from '../types/conversions'
import { touchPointService } from '../services/touch-point.service'
import { collectionPermissionService } from '../services/collection-permission.service'
import { requestContext } from '@/shared/types/request'
import { logger } from '@/infrastructure/logging/logger'

const log = logger.child({
  module: 'ConversionEventRepository',
})
export class ConversionEventRepository extends BaseRepository<'conversion_events'> {
  constructor() {
    super('conversion_events')
  }
  async getTouchpointAttributionFull(
    orgId: string,
    viewableTpIds: string[],
    params?: ConversionFilterParams
  ) {
    const { startDate, endDate, tagIds, touchPointIds, collectionIds, excludeBot, eventNames, utmSources, channels } = params || {}

    const { data, error } = await supabaseService.rpc('get_touchpoint_attribution_full_v3', {
      _organization_id: orgId,
      _viewable_tp_ids: viewableTpIds,
      _tag_ids: tagIds || undefined,
      _tp_ids: touchPointIds || undefined,
      _collection_ids: collectionIds || undefined,
      _start_time: startDate || undefined,
      _end_time: endDate || undefined,
      _exclude_bot: excludeBot ?? true,
      _event_names: eventNames && eventNames.length > 0 ? eventNames : undefined,
      _utm_sources: utmSources && utmSources.length > 0 ? utmSources : undefined,
      _channels: channels && channels.length > 0 ? channels : undefined,
    })

    if (error) throw error

    const result = data as {
      touchpoints: Array<{
        touchPointId: string
        touchPointName: string
        touchPointShortUrl: string
        visitCount: number
        uniqueVisitCount: number
        leadCount: number
        saleCount: number
        conversionRate: number
        revenueByCurrency: Record<string, number>
      }>
      currency: string
    }

    const defaultCurrency = (result.currency || 'USD').toUpperCase()

    // Helper functions for currency conversion
    const toBaseUnit = (amount: number, currency: string): number => {
      const config = CURRENCY_CONFIG[currency as SupportedCurrency]
      if (!config) return amount
      return config.decimals > 0 ? amount / Math.pow(10, config.decimals) : amount
    }

    const toSmallestUnit = (amount: number, currency: string): number => {
      const config = CURRENCY_CONFIG[currency as SupportedCurrency]
      if (!config) return amount
      return config.decimals > 0 ? amount * Math.pow(10, config.decimals) : amount
    }

    // Collect all unique currency pairs needed for conversion
    const currencyPairs = new Set<string>()
    for (const tp of result.touchpoints) {
      if (tp.revenueByCurrency) {
        for (const currency of Object.keys(tp.revenueByCurrency)) {
          if (currency !== defaultCurrency) {
            currencyPairs.add(`${currency}:${defaultCurrency}`)
          }
        }
      }
    }

    // Fetch exchange rates if needed
    const ratePairs = Array.from(currencyPairs).map((pair) => {
      const [base, target] = pair.split(':')
      return { base, target }
    })

    const rates =
      ratePairs.length > 0 ? await currencyService.getExchangeRates(ratePairs) : new Map()

    // Convert revenue for each touchpoint
    const touchpoints = result.touchpoints.map((tp) => {
      let totalRevenue = 0

      if (tp.revenueByCurrency) {
        for (const [currency, amount] of Object.entries(tp.revenueByCurrency)) {
          if (currency === defaultCurrency) {
            totalRevenue += amount
          } else {
            const rate = rates.get(`${currency}:${defaultCurrency}`)
            if (!rate || rate <= 0 || !Number.isFinite(rate)) {
              console.warn(`Invalid rate for ${currency} -> ${defaultCurrency}, using 1:1`)
              totalRevenue += amount
            } else {
              const baseAmount = toBaseUnit(amount, currency)
              const convertedBase = baseAmount * rate
              const convertedSmallest = toSmallestUnit(convertedBase, defaultCurrency)
              totalRevenue += Math.round(convertedSmallest)
            }
          }
        }
      }

      return {
        touchPointId: tp.touchPointId,
        touchPointName: tp.touchPointName,
        touchPointShortUrl: tp.touchPointShortUrl,
        visitCount: tp.visitCount,
        uniqueVisitCount: tp.uniqueVisitCount,
        leadCount: tp.leadCount,
        saleCount: tp.saleCount,
        conversionRate: tp.conversionRate,
        revenue: totalRevenue,
      }
    })

    // Fetch direct conversions (click_id = '' means no attribution)
    let directLeadsQuery = supabaseService
      .from('conversion_events')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('event_type', 'lead')
      .eq('click_id', '')

    let directSalesQuery = supabaseService
      .from('conversion_events')
      .select('amount, currency')
      .eq('organization_id', orgId)
      .eq('event_type', 'sale')
      .eq('click_id', '')

    let directVisitsQuery = supabaseService
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .is('li2_cid', null)

    if (startDate) {
      directLeadsQuery = directLeadsQuery.gte('created_at', startDate)
      directSalesQuery = directSalesQuery.gte('created_at', startDate)
      directVisitsQuery = directVisitsQuery.gte('created_at', startDate)
    }
    if (endDate) {
      directLeadsQuery = directLeadsQuery.lte('created_at', endDate)
      directSalesQuery = directSalesQuery.lte('created_at', endDate)
      directVisitsQuery = directVisitsQuery.lte('created_at', endDate)
    }
    if (eventNames && eventNames.length > 0) {
      directLeadsQuery = directLeadsQuery.in('event_name', eventNames)
      directSalesQuery = directSalesQuery.in('event_name', eventNames)
    }

    // UTM/channel filter for the Direct row
    if ((utmSources && utmSources.length > 0) || (channels && channels.length > 0)) {
      // Resolve session_ids from direct sessions that match the UTM/channel filter
      let sessionMatchQuery = supabaseService
        .from('sessions')
        .select('session_id')
        .eq('organization_id', orgId)
        .not('session_id', 'is', null)
        .is('li2_cid', null)

      if (utmSources && utmSources.length > 0) {
        sessionMatchQuery = sessionMatchQuery.in('utm_source', utmSources)
      }
      if (channels && channels.length > 0) {
        sessionMatchQuery = sessionMatchQuery.in('channel', channels)
      }

      const { data: sessionMatchData, error: sessionMatchError } = await sessionMatchQuery
      if (sessionMatchError) throw sessionMatchError

      const matchedDirectSessionIds = (sessionMatchData || [])
        .map((s: any) => s.session_id)
        .filter(Boolean) as string[]

      // Filter directVisitsQuery directly — sessions has utm_source/channel columns
      if (utmSources && utmSources.length > 0) {
        directVisitsQuery = directVisitsQuery.in('utm_source', utmSources)
      }
      if (channels && channels.length > 0) {
        directVisitsQuery = directVisitsQuery.in('channel', channels)
      }

      // Filter directLeads/Sales by the resolved session_ids
      if (matchedDirectSessionIds.length > 0) {
        directLeadsQuery = directLeadsQuery.in('session_id', matchedDirectSessionIds)
        directSalesQuery = directSalesQuery.in('session_id', matchedDirectSessionIds)
      } else {
        // No matching direct sessions — force zero results
        directLeadsQuery = directLeadsQuery.eq('session_id', '__no_match__')
        directSalesQuery = directSalesQuery.eq('session_id', '__no_match__')
      }
    }

    const [directLeadsResult, directSalesResult, directVisitsResult] = await Promise.all([
      directLeadsQuery,
      directSalesQuery,
      directVisitsQuery,
    ])

    if (directLeadsResult.error) throw directLeadsResult.error
    if (directSalesResult.error) throw directSalesResult.error
    if (directVisitsResult.error) throw directVisitsResult.error

    const directLeadCount = directLeadsResult.count ?? 0
    const directSaleCount = (directSalesResult.data || []).length
    const directVisitCount = directVisitsResult.count ?? 0

    // Compute direct revenue (same currency conversion logic)
    const directRevenueByCurrency: Record<string, number> = {}
    for (const row of directSalesResult.data || []) {
      const { amount, currency } = row as { amount: number | null; currency: string | null }
      const cur = (currency || defaultCurrency).toUpperCase()
      directRevenueByCurrency[cur] = (directRevenueByCurrency[cur] || 0) + (amount ?? 0)
    }

    // Collect additional currency pairs from direct revenue
    for (const cur of Object.keys(directRevenueByCurrency)) {
      if (cur !== defaultCurrency) {
        const pair = `${cur}:${defaultCurrency}`
        if (!rates.has(pair)) {
          const extraRates = await currencyService.getExchangeRates([{ base: cur, target: defaultCurrency }])
          extraRates.forEach((v, k) => rates.set(k, v))
        }
      }
    }

    let directRevenue = 0
    for (const [cur, amount] of Object.entries(directRevenueByCurrency)) {
      if (cur === defaultCurrency) {
        directRevenue += amount
      } else {
        const rate = rates.get(`${cur}:${defaultCurrency}`)
        if (!rate || rate <= 0 || !Number.isFinite(rate)) {
          directRevenue += amount
        } else {
          const baseAmount = toBaseUnit(amount, cur)
          directRevenue += Math.round(toSmallestUnit(baseAmount * rate, defaultCurrency))
        }
      }
    }

    const directConversionRate =
      directLeadCount > 0 ? (directSaleCount / directLeadCount) * 100 : 0

    if (directLeadCount > 0 || directSaleCount > 0) {
      touchpoints.push({
        touchPointId: '__direct__',
        touchPointName: 'Direct',
        touchPointShortUrl: null as any,
        visitCount: directVisitCount,
        uniqueVisitCount: directVisitCount,
        leadCount: directLeadCount,
        saleCount: directSaleCount,
        conversionRate: Math.round(directConversionRate * 10) / 10,
        revenue: directRevenue,
      })
    }

    // Sort all entries (including Direct) by revenue desc, then leads desc
    touchpoints.sort((a, b) => b.revenue - a.revenue || b.leadCount - a.leadCount)

    // Calculate totals
    const totals = {
      visits: touchpoints.reduce((sum, tp) => sum + tp.visitCount, 0),
      uniqueVisits: touchpoints.reduce((sum, tp) => sum + tp.uniqueVisitCount, 0),
      leads: touchpoints.reduce((sum, tp) => sum + tp.leadCount, 0),
      sales: touchpoints.reduce((sum, tp) => sum + tp.saleCount, 0),
      revenue: touchpoints.reduce((sum, tp) => sum + tp.revenue, 0),
    }

    return {
      touchpoints,
      totals,
      currency: defaultCurrency,
    }
  }

  async findAllWithJoins(
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().select(
      `
      *,
      customer_profiles (id, email, name, phone),
      touch_points(id, name, short_url, collection_id, tp_tag_links(tag_id)),
      lead_event:lead_event_id (id, event_name, created_at)
    `,
      { count: 'exact' }
    )
    if (modifier) query = modifier(query)
    const { data, error, count } = await query
    if (error) throw error
    return { data, count }
  }

  async getStats(orgId: string, viewableTpIds: string[], params?: ConversionFilterParams) {
    const { collectionIds, excludeBot, startDate, tagIds, touchPointIds, endDate, source, eventNames, utmSources, channels } =
      params || {}

    const { data, error } = await supabaseService.rpc('get_conversion_stats_v3', {
      _organization_id: orgId,
      _viewable_tp_ids: viewableTpIds,
      _tp_ids: touchPointIds || undefined,
      _tag_ids: tagIds || undefined,
      _collection_ids: collectionIds || undefined,
      _start_date: startDate || undefined,
      _end_date: endDate || undefined,
      _exclude_bot: excludeBot ?? false,
      _source: source && source !== 'all' ? source : undefined,
      _event_names: eventNames && eventNames.length > 0 ? eventNames : undefined,
      _utm_sources: utmSources && utmSources.length > 0 ? utmSources : undefined,
      _channels: channels && channels.length > 0 ? channels : undefined,
    })

    if (error) throw error

    const result = data as {
      leads: number
      customers: number
      sales: number
      revenue_by_currency: Record<string, number>
      default_currency: string
    }

    const defaultCurrency = result.default_currency.toUpperCase()
    const salesByCurrency = result.revenue_by_currency

    // Convert all amounts to default currency
    let totalRevenue = 0
    const currencies = Object.keys(salesByCurrency)

    // Helper to convert from smallest unit to base unit
    const toBaseUnit = (amount: number, currency: string): number => {
      const config = CURRENCY_CONFIG[currency as SupportedCurrency]
      if (!config) return amount
      return config.decimals > 0 ? amount / Math.pow(10, config.decimals) : amount
    }

    // Helper to convert from base unit to smallest unit
    const toSmallestUnit = (amount: number, currency: string): number => {
      const config = CURRENCY_CONFIG[currency as SupportedCurrency]
      if (!config) return amount
      return config.decimals > 0 ? amount * Math.pow(10, config.decimals) : amount
    }

    if (currencies.length > 0) {
      const ratePairs = currencies
        .filter((currency) => currency !== defaultCurrency)
        .map((currency) => ({ base: currency, target: defaultCurrency }))

      const rates =
        ratePairs.length > 0 ? await currencyService.getExchangeRates(ratePairs) : new Map()

      for (const [currency, amount] of Object.entries(salesByCurrency)) {
        if (currency === defaultCurrency) {
          totalRevenue += amount
        } else {
          const rate = rates.get(`${currency}:${defaultCurrency}`)
          if (!rate || rate <= 0 || !Number.isFinite(rate)) {
            console.warn(`Invalid rate for ${currency} -> ${defaultCurrency}, using 1:1`)
            totalRevenue += amount
          } else {
            const baseAmount = toBaseUnit(amount, currency)
            const convertedBase = baseAmount * rate
            const convertedSmallest = toSmallestUnit(convertedBase, defaultCurrency)
            totalRevenue += Math.round(convertedSmallest)
          }
        }
      }
    }

    return {
      totalLeads: result.leads,
      totalCustomers: result.customers,
      totalSales: result.sales,
      totalRevenue,
    }
  }

  async getDistinctEventNames(orgId: string): Promise<string[]> {
    const { data, error } = await supabaseService
      .from('conversion_events')
      .select('event_name')
      .eq('organization_id', orgId)
      .not('event_name', 'is', null)
      .order('event_name', { ascending: true })

    if (error) throw error

    const names = [...new Set((data || []).map((r) => r.event_name).filter(Boolean) as string[])]
    return names
  }

  async findByCustomerId(
    orgId: string,
    customerId: string,
    options?: { orderBy?: string; orderDir?: 'asc' | 'desc' }
  ) {
    let query = this.query()
      .select(
        `
        *,
        touch_points (id, name)
      `
      )
      .eq('organization_id', orgId)
      .eq('customer_profile_id', customerId)

    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.orderDir === 'asc' })
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  async findByCustomerIdWithLeadEvent(orgId: string, customerId: string) {
    const { data, error } = await this.query()
      .select(
        `
        *,
        touch_points (id, name),
        lead_event:lead_event_id (id, event_name, created_at)
      `
      )
      .eq('organization_id', orgId)
      .eq('customer_profile_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
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
    const { startDate, endDate, touchPointId, limit = 3 } = params

    // Get all touchpoints with their metrics in optimized queries
    // Query 1: Get leads count per touchpoint
    let leadsQuery = supabaseService
      .from('conversion_events')
      .select('touch_point_id')
      .eq('organization_id', orgId)
      .eq('event_type', 'lead')
      .not('touch_point_id', 'is', null)

    if (startDate) leadsQuery = leadsQuery.gte('created_at', startDate)
    if (endDate) leadsQuery = leadsQuery.lte('created_at', endDate)
    if (touchPointId) leadsQuery = leadsQuery.eq('touch_point_id', touchPointId)

    // Query 2: Get sales count and revenue per touchpoint
    let salesQuery = supabaseService
      .from('conversion_events')
      .select('touch_point_id, amount, currency')
      .eq('organization_id', orgId)
      .eq('event_type', 'sale')
      .not('touch_point_id', 'is', null)

    if (startDate) salesQuery = salesQuery.gte('created_at', startDate)
    if (endDate) salesQuery = salesQuery.lte('created_at', endDate)
    if (touchPointId) salesQuery = salesQuery.eq('touch_point_id', touchPointId)

    // Query 3: Get touchpoint details (filter to specific touchpoint if provided)
    let touchpointsQuery = supabaseService
      .from('touch_points')
      .select('id, name, short_url')
      .eq('organization_id', orgId)
    if (touchPointId) touchpointsQuery = touchpointsQuery.eq('id', touchPointId)

    // Query 4: Get org default currency
    const orgQuery = supabaseService
      .from('organizations')
      .select('default_currency')
      .eq('id', orgId)
      .single()

    const [leadsResult, salesResult, touchpointsResult, orgResult] = await Promise.all([
      leadsQuery,
      salesQuery,
      touchpointsQuery,
      orgQuery,
    ])

    if (leadsResult.error) throw leadsResult.error
    if (salesResult.error) throw salesResult.error
    if (touchpointsResult.error) throw touchpointsResult.error
    if (orgResult.error) throw orgResult.error

    const defaultCurrency = (
      (orgResult.data as { default_currency: string | null })?.default_currency || 'USD'
    ).toUpperCase()

    // Aggregate leads by touchpoint
    const leadsByTp = (leadsResult.data || []).reduce(
      (acc, row) => {
        const tpId = (row as { touch_point_id: string }).touch_point_id
        acc[tpId] = (acc[tpId] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Aggregate sales and revenue by touchpoint
    const salesByTp: Record<string, { count: number; revenue: number }> = {}
    for (const row of salesResult.data || []) {
      const { touch_point_id, amount, currency } = row as {
        touch_point_id: string
        amount: number | null
        currency: string | null
      }
      if (!salesByTp[touch_point_id]) {
        salesByTp[touch_point_id] = { count: 0, revenue: 0 }
      }
      salesByTp[touch_point_id].count += 1
      // For simplicity, sum amounts directly (assuming same currency or conversion handled elsewhere)
      salesByTp[touch_point_id].revenue += amount ?? 0
    }

    // Build attribution array
    const touchpoints = (touchpointsResult.data || []) as Array<{
      id: string
      name: string
      short_url: string | null
    }>
    const attribution = touchpoints.map((tp) => {
      const leadCount = leadsByTp[tp.id] || 0
      const sales = salesByTp[tp.id] || { count: 0, revenue: 0 }
      const conversionRate = leadCount > 0 ? (sales.count / leadCount) * 100 : 0

      return {
        touchPointId: tp.id,
        touchPointName: tp.name,
        touchPointShortUrl: tp.short_url,
        leadCount,
        saleCount: sales.count,
        conversionRate: Math.round(conversionRate * 10) / 10, // 1 decimal place
        revenue: sales.revenue,
      }
    })

    // Sort by revenue descending
    attribution.sort((a, b) => b.revenue - a.revenue)

    // Apply limit (totals calculated before limiting for accurate aggregates)
    const totals = {
      leads: attribution.reduce((sum, a) => sum + a.leadCount, 0),
      sales: attribution.reduce((sum, a) => sum + a.saleCount, 0),
      revenue: attribution.reduce((sum, a) => sum + a.revenue, 0),
    }

    const limitedTouchpoints = limit ? attribution.slice(0, limit) : attribution

    return {
      touchpoints: limitedTouchpoints,
      totals,
      currency: defaultCurrency,
    }
  }

  async getFunnelData(
    orgId: string,
    viewableTpIds: string[] | undefined,
    params: ConversionFilterParams
  ): Promise<FunnelData> {
    const { startDate, endDate, excludeBot, tagIds, touchPointIds, collectionIds, eventNames, utmSources, channels } = params

    const { data, error } = await supabaseService.rpc('get_funnel_data_v3', {
      _organization_id: orgId,
      _viewable_tp_ids: viewableTpIds,
      _tp_ids: touchPointIds || undefined,
      _tag_ids: tagIds || undefined,
      _collection_ids: collectionIds || undefined,
      _start_date: startDate || undefined,
      _end_date: endDate || undefined,
      _exclude_bot: excludeBot ?? false,
      _event_names: eventNames && eventNames.length > 0 ? eventNames : undefined,
      _utm_sources: utmSources && utmSources.length > 0 ? utmSources : undefined,
      _channels: channels && channels.length > 0 ? channels : undefined,
    })

    if (error) throw error

    const result = data as {
      clicks: number
      leads: number
      sales: number
      direct_visits: number
      direct_leads: number
      direct_sales: number
      clicks_to_leads_rate: number
      leads_to_sales_rate: number
      overall_rate: number
    }

    const directVisits = result.direct_visits ?? 0
    const directLeads = result.direct_leads ?? 0
    const directSales = result.direct_sales ?? 0

    return {
      stages: [
        { name: 'Visits', value: result.clicks + directVisits, fill: 'hsl(var(--chart-1))', directValue: directVisits },
        { name: 'Leads', value: result.leads + directLeads, fill: 'hsl(var(--chart-2))', directValue: directLeads },
        { name: 'Sales', value: result.sales + directSales, fill: 'hsl(var(--chart-3))', directValue: directSales },
      ],
      conversionRates: {
        clicksToLeads: result.clicks_to_leads_rate,
        leadsToSales: result.leads_to_sales_rate,
        overall: result.overall_rate,
      },
    }
  }
}

export class CustomerProfileRepository extends BaseRepository<'customer_profiles'> {
  constructor() {
    super('customer_profiles')
  }

  async findAllWithJoins(
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().select(
      `
      *,
      touch_points!customer_profiles_first_tp_fkey(id, name, short_url)
    `,
      { count: 'exact' }
    )
    if (modifier) query = modifier(query)
    const { data, error, count } = await query
    if (error) throw error
    return { data, count }
  }

  async findByIdWithTouchPoint(customerId: string) {
    const { data, error } = await this.query()
      .select(
        `
        *,
        touch_points!customer_profiles_first_tp_fkey(id, name, short_url)
      `
      )
      .eq('id', customerId)
      .single()
    if (error) throw error
    return data
  }

  async findByIdAndOrg(customerId: string, orgId: string) {
    const { data, error } = await this.query()
      .select(
        `
        *,
        touch_points!customer_profiles_first_tp_fkey(id, name, short_url)
      `
      )
      .eq('id', customerId)
      .eq('organization_id', orgId)
      .maybeSingle()
    if (error) throw error
    return data
  }
}

export const conversionEventRepo =
  globalThis._conversionEventRepo ?? new ConversionEventRepository()
export const customerProfileRepo =
  globalThis._customerProfileRepo ?? new CustomerProfileRepository()

if (process.env.NODE_ENV !== 'production') {
  globalThis._conversionEventRepo = conversionEventRepo
  globalThis._customerProfileRepo = customerProfileRepo
}
