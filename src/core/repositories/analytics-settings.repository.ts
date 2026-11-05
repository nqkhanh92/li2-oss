import { supabaseService } from '@/infrastructure/database/supabase'
import {
  AnalyticsFeatures,
  AnalyticsSettings,
  AnalyticsSettingsInsert,
  AnalyticsSettingsUpdate,
  CustomScript,
  TrackingSettings,
} from '../types/analytics-settings.type'
import { AutoEvent } from '@/features/analytics-settings/types/auto-event.types'
import crypto from 'crypto'
import { ConflictError } from '@/infrastructure/response/errors/domain.errors'

export class AnalyticsSettingsRepository {
  private table = 'analytics_settings' as const

  private generatePublishableKey(orgId: string): string {
    const orgPrefix = orgId.replace(/-/g, '').substring(0, 8)
    const randomPart = crypto.randomBytes(16).toString('hex')
    return `li2_pk_${orgPrefix}_${randomPart}`
  }

  async findByOrgId(orgId: string): Promise<AnalyticsSettings | null> {
    const { data, error } = await supabaseService
      .from(this.table)
      .select('*')
      .eq('organization_id', orgId)
      .single()
      .overrideTypes<AnalyticsSettings, { merge: false }>()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null
      }
      throw error
    }

    return data
  }

  async findByPublishableKey(publishableKey: string): Promise<AnalyticsSettings | null> {
    const { data, error } = await supabaseService
      .from(this.table)
      .select('*')
      .eq('publishable_key', publishableKey)
      .single()
      .overrideTypes<AnalyticsSettings, { merge: false }>()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return data
  }

  async create(orgId: string): Promise<AnalyticsSettings> {
    const publishableKey = this.generatePublishableKey(orgId)

    const insertData: AnalyticsSettingsInsert & { data_collection_rules?: any } = {
      organization_id: orgId,
      publishable_key: publishableKey,
      allowed_hostnames: [],
      auto_events: [],
    }

    const { data, error } = await supabaseService
      .from(this.table)
      .insert(insertData)
      .select('*')
      .single()
      .overrideTypes<AnalyticsSettings, { merge: false }>()

    if (error) throw error
    return data
  }

  async getOrCreate(orgId: string): Promise<AnalyticsSettings> {
    const existing = await this.findByOrgId(orgId)
    if (existing) return existing
    return this.create(orgId)
  }

  async addHostname(orgId: string, hostname: string): Promise<AnalyticsSettings> {
    const settings = await this.getOrCreate(orgId)
    const hostnames = settings.allowed_hostnames || []

    if (hostnames.includes(hostname)) {
      return settings
    }

    const updatedHostnames = [...hostnames, hostname]

    const { data, error } = await supabaseService
      .from(this.table)
      .update({ allowed_hostnames: updatedHostnames })
      .eq('id', settings.id)
      .select('*')
      .single()
      .overrideTypes<AnalyticsSettings, { merge: false }>()

    if (error) throw error
    return data
  }

  async removeHostname(orgId: string, hostname: string): Promise<AnalyticsSettings> {
    const settings = await this.findByOrgId(orgId)
    if (!settings) {
      throw new Error('Analytics settings not found')
    }

    const hostnames = settings.allowed_hostnames || []
    const updatedHostnames = hostnames.filter((h) => h !== hostname)

    const { data, error } = await supabaseService
      .from(this.table)
      .update({ allowed_hostnames: updatedHostnames })
      .eq('id', settings.id)
      .select('*')
      .single()
      .overrideTypes<AnalyticsSettings, { merge: false }>()

    if (error) throw error
    return data
  }

  async regenerateKey(orgId: string): Promise<AnalyticsSettings> {
    const settings = await this.getOrCreate(orgId)
    const newKey = this.generatePublishableKey(orgId)

    const { data, error } = await supabaseService
      .from(this.table)
      .update({
        publishable_key: newKey,
        publishable_key_created_at: new Date().toISOString(),
      })
      .eq('id', settings.id)
      .select('*')
      .single()
      .overrideTypes<AnalyticsSettings, { merge: false }>()

    if (error) throw error
    return data
  }

  async updateAutoEvents(orgId: string, autoEvents: AutoEvent[]): Promise<AnalyticsSettings> {
    const settings = await this.getOrCreate(orgId)

    const { data, error } = await supabaseService
      .from(this.table)
      .update({ auto_events: autoEvents as any })
      .eq('id', settings.id)
      .select('*')
      .single()
      .overrideTypes<AnalyticsSettings, { merge: false }>()

    if (error) throw error
    return data
  }

  async updateDataCollectionRules(
    orgId: string,
    rules: { mode: 'exclude' | 'include'; exclude_paths: string[]; include_paths: string[] }
  ): Promise<AnalyticsSettings> {
    const settings = await this.getOrCreate(orgId)

    const { data, error } = await supabaseService
      .from(this.table)
      .update({ data_collection_rules: rules } as any)
      .eq('id', settings.id)
      .select('*')
      .single()
      .overrideTypes<AnalyticsSettings, { merge: false }>()

    if (error) throw error
    return data
  }

  async validateOrigin(publishableKey: string, origin: string): Promise<boolean> {
    const settings = await this.findByPublishableKey(publishableKey)
    if (!settings) return false

    const hostnames = settings.allowed_hostnames || []
    if (hostnames.length === 0) return false

    // Extract hostname from origin (e.g., https://example.com -> example.com)
    let hostname: string
    try {
      const url = new URL(origin)
      hostname = url.hostname
    } catch {
      hostname = origin
    }

    return hostnames.some((pattern) => this.matchHostname(pattern, hostname))
  }

  private matchHostname(pattern: string, hostname: string): boolean {
    // Exact match
    if (pattern === hostname) return true

    // Wildcard match (*.example.com matches sub.example.com)
    if (pattern.startsWith('*.')) {
      const baseDomain = pattern.substring(2)
      // Check if hostname ends with the base domain and has at least one subdomain
      if (hostname.endsWith(baseDomain) && hostname.length > baseDomain.length) {
        const prefix = hostname.substring(0, hostname.length - baseDomain.length)
        // Must end with a dot (e.g., "sub." for "sub.example.com")
        return prefix.endsWith('.')
      }
    }

    return false
  }

  async updateCustomScripts(orgId: string, scripts: CustomScript[]): Promise<AnalyticsSettings> {
    const settings = await this.getOrCreate(orgId)

    const { data, error } = await supabaseService
      .from(this.table)
      .update({ custom_scripts: scripts as any })
      .eq('id', settings.id)
      .select('*')
      .single()
      .overrideTypes<AnalyticsSettings, { merge: false }>()

    if (error) throw error
    return data
  }

  async updateOutboundDomains(orgId: string, domains: string[]): Promise<AnalyticsSettings> {
    const settings = await this.getOrCreate(orgId)

    const { data, error } = await supabaseService
      .from(this.table)
      .update({ outbound_domains: domains } as any)
      .eq('id', settings.id)
      .select('*')
      .single()
      .overrideTypes<AnalyticsSettings, { merge: false }>()

    if (error) throw error
    return data
  }

  async updateTracking(orgId: string, tracking: TrackingSettings): Promise<AnalyticsSettings> {
    const settings = await this.getOrCreate(orgId)

    const { data, error } = await supabaseService
      .from(this.table)
      .update({ tracking } as any)
      .eq('id', settings.id)
      .select('*')
      .single()
      .overrideTypes<AnalyticsSettings, { merge: false }>()

    if (error) throw error
    return data
  }

  async updateFeatures(orgId: string, features: AnalyticsFeatures): Promise<AnalyticsSettings> {
    const settings = await this.getOrCreate(orgId)

    const { data, error } = await supabaseService
      .from(this.table)
      .update({ features } as any)
      .eq('id', settings.id)
      .select('*')
      .single()
      .overrideTypes<AnalyticsSettings, { merge: false }>()

    if (error) throw error
    return data
  }

  async updateOnboardingSettings(
    orgId: string,
    payload: { features: AnalyticsFeatures; outbound_domains: string[]; tracking: TrackingSettings }
  ): Promise<AnalyticsSettings> {
    const settings = await this.getOrCreate(orgId)

    const { data, error } = await supabaseService
      .from(this.table)
      .update(payload as any)
      .eq('id', settings.id)
      .select('*')
      .single()
      .overrideTypes<AnalyticsSettings, { merge: false }>()

    if (error) throw error
    return data
  }

  async updateDebugMode(orgId: string, enabled: boolean): Promise<AnalyticsSettings> {
    const settings = await this.getOrCreate(orgId)

    const { data, error } = await supabaseService
      .from(this.table)
      .update({ debug_mode_enabled: enabled })
      .eq('id', settings.id)
      .select('*')
      .single()
      .overrideTypes<AnalyticsSettings, { merge: false }>()

    if (error) throw error
    return data
  }
}

export const analyticsSettingsRepo =
  globalThis._analyticsSettingsRepo ?? new AnalyticsSettingsRepository()

if (process.env.NODE_ENV !== 'production') globalThis._analyticsSettingsRepo = analyticsSettingsRepo
