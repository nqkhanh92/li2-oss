import {
  analyticsSettingsRepo,
  AnalyticsSettingsRepository,
} from '../repositories/analytics-settings.repository'
import { AnalyticsFeatures, AnalyticsSettings, CustomScript, TrackingSettings } from '../types/analytics-settings.type'
import { AutoEvent } from '@/features/analytics-settings/types/auto-event.types'

// Hostname validation regex: example.com, *.example.com, localhost, or localhost:{port}
const HOSTNAME_REGEX =
  /^(\*\.)?([a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+|localhost(:\d{1,5})?)$/

export class AnalyticsSettingsService {
  constructor(private repo: AnalyticsSettingsRepository) {}

  private validateHostname(hostname: string): boolean {
    return HOSTNAME_REGEX.test(hostname)
  }

  public async getSettings(orgId: string): Promise<AnalyticsSettings> {
    return this.repo.getOrCreate(orgId)
  }

  public async addHostname(orgId: string, hostname: string): Promise<AnalyticsSettings> {
    if (!this.validateHostname(hostname)) {
      throw new Error('Invalid hostname format')
    }
    return this.repo.addHostname(orgId, hostname)
  }

  public async removeHostname(orgId: string, hostname: string): Promise<AnalyticsSettings> {
    return this.repo.removeHostname(orgId, hostname)
  }

  public async regenerateKey(orgId: string): Promise<AnalyticsSettings> {
    return this.repo.regenerateKey(orgId)
  }

  public async updateAutoEvents(
    orgId: string,
    autoEvents: AutoEvent[]
  ): Promise<AnalyticsSettings> {
    return this.repo.updateAutoEvents(orgId, autoEvents)
  }

  public async updateDataCollectionRules(
    orgId: string,
    rules: { mode: 'exclude' | 'include'; exclude_paths: string[]; include_paths: string[] }
  ): Promise<AnalyticsSettings> {
    return this.repo.updateDataCollectionRules(orgId, rules)
  }

  public async validateOrigin(publishableKey: string, origin: string): Promise<boolean> {
    return this.repo.validateOrigin(publishableKey, origin)
  }

  public async updateDebugMode(orgId: string, enabled: boolean): Promise<AnalyticsSettings> {
    return this.repo.updateDebugMode(orgId, enabled)
  }

  public async updateCustomScripts(orgId: string, scripts: CustomScript[]): Promise<AnalyticsSettings> {
    return this.repo.updateCustomScripts(orgId, scripts)
  }

  public async updateFeatures(orgId: string, features: AnalyticsFeatures): Promise<AnalyticsSettings> {
    return this.repo.updateFeatures(orgId, features)
  }

  public async updateOutboundDomains(orgId: string, domains: string[]): Promise<AnalyticsSettings> {
    return this.repo.updateOutboundDomains(orgId, domains)
  }

  public async updateTracking(orgId: string, tracking: TrackingSettings): Promise<AnalyticsSettings> {
    return this.repo.updateTracking(orgId, tracking)
  }

  public async updateOnboardingSettings(
    orgId: string,
    payload: { features: AnalyticsFeatures; outbound_domains: string[]; tracking: TrackingSettings }
  ): Promise<AnalyticsSettings> {
    return this.repo.updateOnboardingSettings(orgId, payload)
  }
}

export const analyticsSettingsService =
  globalThis._analyticsSettingsService ?? new AnalyticsSettingsService(analyticsSettingsRepo)

if (process.env.NODE_ENV !== 'production')
  globalThis._analyticsSettingsService = analyticsSettingsService
