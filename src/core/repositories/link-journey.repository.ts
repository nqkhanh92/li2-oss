import { supabaseService } from '@/infrastructure/database/supabase'
import type {
  LinkJourneyTouchPoint,
  TrafficSummary,
  PageFlowItem,
  BehavioralHighlights,
  ConversionSummary,
} from '@/ee/features/link-journey/types'

export class LinkJourneyRepository {
  /** Convert YYYY-MM-DD date strings to full timestamptz boundaries */
  private startOfDay(date: string): string {
    return `${date}T00:00:00Z`
  }
  private endOfDay(date: string): string {
    return `${date}T23:59:59.999Z`
  }

  async getTouchPoints(orgId: string): Promise<LinkJourneyTouchPoint[]> {
    const { data, error } = await supabaseService.rpc('get_link_journey_touch_points', {
      _org_id: orgId,
    })
    if (error) throw error
    return data as unknown as LinkJourneyTouchPoint[]
  }

  async getTrafficSummary(
    orgId: string,
    tpId: string,
    from: string,
    to: string
  ): Promise<TrafficSummary> {
    const { data, error } = await supabaseService.rpc('get_link_journey_traffic_summary', {
      _org_id: orgId,
      _tp_id: tpId,
      _start_date: this.startOfDay(from),
      _end_date: this.endOfDay(to),
    })
    if (error) throw error
    return data as unknown as TrafficSummary
  }

  async getPageFlow(
    orgId: string,
    tpId: string,
    from: string,
    to: string,
    limit: number = 10
  ): Promise<PageFlowItem[]> {
    const { data, error } = await supabaseService.rpc('get_link_journey_page_flow', {
      _org_id: orgId,
      _tp_id: tpId,
      _start_date: this.startOfDay(from),
      _end_date: this.endOfDay(to),
      _limit: limit,
    })
    if (error) throw error
    return data as unknown as PageFlowItem[]
  }

  async getBehavioral(
    orgId: string,
    tpId: string,
    from: string,
    to: string
  ): Promise<BehavioralHighlights> {
    const { data, error } = await supabaseService.rpc('get_link_journey_behavioral', {
      _org_id: orgId,
      _tp_id: tpId,
      _start_date: this.startOfDay(from),
      _end_date: this.endOfDay(to),
    })
    if (error) throw error
    return data as unknown as BehavioralHighlights
  }

  async getConversions(
    orgId: string,
    tpId: string,
    from: string,
    to: string
  ): Promise<ConversionSummary> {
    const { data, error } = await supabaseService.rpc('get_link_journey_conversions', {
      _org_id: orgId,
      _tp_id: tpId,
      _start_date: this.startOfDay(from),
      _end_date: this.endOfDay(to),
    })
    if (error) throw error
    return data as unknown as ConversionSummary
  }
}

export const linkJourneyRepo =
  process.env.NODE_ENV !== 'production'
    ? new LinkJourneyRepository()
    : (globalThis._linkJourneyRepo ?? (globalThis._linkJourneyRepo = new LinkJourneyRepository()))
