import { supabaseService } from '@/infrastructure/database/supabase'
import type { FunnelSuggestion, EventRuleSuggestion } from '@/infrastructure/external/claude/claude.types'
import type { Json } from '@/shared/types/database.types'
import crypto from 'crypto'

export class SmartSetupRepository {
  private query = () => supabaseService.from('smart_setup_cache')

  computeUrlHash(orgId: string, url: string): string {
    const normalized = url.replace(/\/+$/, '').toLowerCase()
    return crypto.createHash('sha256').update(`${orgId}:${normalized}`).digest('hex')
  }

  async findByUrlHash(orgId: string, urlHash: string) {
    const { data, error } = await this.query()
      .select('*')
      .eq('organization_id', orgId)
      .eq('url_hash', urlHash)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    return {
      ...data,
      isFresh: new Date(data.expires_at) > new Date(),
    }
  }

  async upsert(
    orgId: string,
    url: string,
    urlHash: string,
    funnelSuggestions: FunnelSuggestion[],
    eventRuleSuggestions: EventRuleSuggestion[],
    locale: string
  ) {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const { data, error } = await this.query()
      .upsert(
        {
          organization_id: orgId,
          url,
          url_hash: urlHash,
          funnel_suggestions: funnelSuggestions as unknown as Json,
          event_rule_suggestions: eventRuleSuggestions as unknown as Json,
          locale,
          applied_at: null,
          applied_funnel_indices: null,
          applied_event_rule_indices: null,
          created_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: 'organization_id,url_hash', ignoreDuplicates: false }
      )
      .select('id')
      .single()

    if (error) throw error
    return data
  }

  async findById(cacheId: string, orgId: string) {
    const { data, error } = await this.query()
      .select('*')
      .eq('id', cacheId)
      .eq('organization_id', orgId)
      .single()

    if (error) throw error
    return data
  }

  async markApplied(
    cacheId: string,
    funnelIndices: number[],
    eventRuleIndices: number[]
  ) {
    const { error } = await this.query()
      .update({
        applied_at: new Date().toISOString(),
        applied_funnel_indices: funnelIndices,
        applied_event_rule_indices: eventRuleIndices,
      })
      .eq('id', cacheId)

    if (error) throw error
  }

  async findPending(orgId: string) {
    const { data, error } = await this.query()
      .select('id, url, funnel_suggestions, event_rule_suggestions, expires_at')
      .eq('organization_id', orgId)
      .is('applied_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  }
}

export const smartSetupRepo =
  process.env.NODE_ENV !== 'production'
    ? new SmartSetupRepository()
    : (globalThis._smartSetupRepo ?? (globalThis._smartSetupRepo = new SmartSetupRepository()))
