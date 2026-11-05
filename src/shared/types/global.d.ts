import type { Logger } from 'pino'
import type { Redis } from 'ioredis'
import { HybridAuditLogger } from '@/shared/lib/logs/hybrid-audit-logger/hybrid-audit-logger'
import { CustomLogger } from '@/infrastructure/logging/logger'
import { Database } from './database.types'
import { createServerClient } from '@supabase/ssr'
import { AuditLoggerConfig, AuditLogger } from '@/shared/lib/logs/audit-logger/audit-logger'
import { SystemLogger } from '@/shared/lib/logs/system-logger/system-logger'
import { Utilities } from '@/infrastructure/external/utilities/utilities.service'
import { TouchPointService } from '@/core/services/touch-point.service'
import { TagService } from '@/core/services/tag.service'
import { SlugRepository } from '@/core/repositories/slug.repository'
import { SlugService } from '@/core/services/slug.service'
import { DomainRepository } from '@/core/repositories/domain.repository'
import { DomainService } from '@/core/services/domain.service'
import { AnalyticService } from '@/core/services/analytic.service'
import { UserPlanService } from '@/core/services/user-plan.service'
import { ProfileService } from '@/core/services/profile.service'
import { ProfileRepository } from '@/core/repositories/profile.repository'
import { UserPlanRepository } from '@/core/repositories/user-plan.repository'
import { AnalyticRepository } from '@/core/repositories/analytic.repository'
import { AnonTouchPointRepository } from '@/core/repositories/anon-touch-point.repository'
import { AnonTouchPointService } from '@/core/services/anon-touch-point.service'
import { BootstrapService } from '@/core/services/bootstrap.service'
import { OrganizationRepository } from '@/core/repositories/organization.repository'
import { OrganizationService } from '@/core/services/organization.service'
import { AIProviderRepository } from '@/core/repositories/ai-provider.repository'
import { OrgCreditRepository } from '@/core/repositories/org-credit.repository'
import { AIProviderService } from '@/core/services/ai-provider.service'
import { Firecrawler } from '@/infrastructure/external/firecrawler/firecrawler'
import { OrgCreditService } from '@/core/services/billing-usage/org-credit.service'
import { LiteLLM } from '@/infrastructure/external/lite-llm/lite-llm'
import { TouchpointImportTasksRepository } from '@/core/repositories/touchpoint_import_tasks.repository'
import { TouchPointImportTasksService } from '@/core/services/touchpoint_import_tasks.service'
import { AuthService } from '@/core/services/auth.service'
import { OrgAuditLogService } from '../../core/services/org-audit-log.service'
import { InvitationRepository } from '@/core/repositories/invitation.repository'
import { InvitationService } from '@/core/services/invitation.service'
import { CollectionRepository } from '@/core/repositories/collection.repository'
import { CollectionService } from '@/core/services/collection.service'
import { MemberRepository } from '@/core/repositories/member.repository'
import { MemberService } from '@/core/services/member.service'
import { CollectionMemberRepository } from '@/core/repositories/collection-member.repository'
import { CollectionMemberService } from '@/core/services/collection-member.service'
import { CollectionPermissionService } from '@/core/services/collection-permission.service'
import { IntegrationRepository } from '@/core/repositories/integration.repository'
import { IntegrationService } from '@/core/services/integration.service'
import { NotificationService } from '@/core/services/notification.service'
import { NotificationRepository } from '@/core/repositories/notification.repository'
import { UtmCampaignService } from '@/core/services/utm-campaign.service'
import { UtmCampaignRepository } from '@/core/repositories/utm-campaign.repository'
import { UtmCampaignChannelsRepository } from '@/core/repositories/utm-campaign-channels.repository'
import { UtmCampaignChannelsService } from '@/core/services/utm-campaign-channels.service'
import { UtmCampaignTouchpointsRepository } from '@/core/repositories/utm-campaign-touchpoints.repository'
import { UtmCampaignTouchpointsService } from '@/core/services/utm-campaign-touchpoints.service'
import { CampaignChannelRepository } from '@/core/repositories/campaign-channel.repository'
import { CampaignChannelService } from '@/core/services/campaign-channel.service'
import { StaticQrRepository } from '@/core/repositories/static-qr.repository'
import { StaticQrService } from '@/core/services/static-qr.service'
import {
  ConversionEventRepository,
  CustomerProfileRepository,
} from '@/core/repositories/conversion.repository'
import { ConversionService } from '@/core/services/conversion.service'
import { AnalyticsSettingsRepository } from '@/core/repositories/analytics-settings.repository'
import { AnalyticsSettingsService } from '@/core/services/analytics-settings.service'
import { ExchangeRateRepository } from '@/core/repositories/exchange-rate.repository'
import { CurrencyService } from '@/core/services/currency.service'
import { ApiKeyRepository } from '@/core/repositories/api-key.repository'
import { ApiKeyService } from '@/core/services/api-key.service'
import { FunnelRepository } from '@/core/repositories/funnel.repository'
import { FunnelService } from '@/core/services/funnel.service'
import { HeatmapRepository } from '@/core/repositories/heatmap.repository'
import { HeatmapService } from '@/core/services/heatmap.service'
import { EventRuleRepository } from '@/core/repositories/event-rule.repository'
import { EventRuleService } from '@/core/services/event-rule.service'
import { LinkJourneyRepository } from '@/core/repositories/link-journey.repository'
import { LinkJourneyService } from '@/core/services/link-journey.service'
import { DebugLogsService } from '@/core/services/debug-logs.service'
import { DebugLogsRepository } from '@/core/repositories/debug-logs.repository'
import { AppSettingsRepository } from '@/core/repositories/app-settings.repository'
import { AppSettingsService } from '@/core/services/app-settings.service'
import { FormsAnalyticsRepository } from '@/core/repositories/forms-analytics.repository'
import { FormsAnalyticsService } from '@/core/services/forms-analytics.service'
import { SmartSetupRepository } from '@/core/repositories/smart-setup.repository'
import { SmartSetupService } from '@/core/services/smart-setup.service'
import { DashboardRepository } from '@/core/repositories/dashboard.repository'
import { DashboardService } from '@/core/services/dashboard.service'
import { WidgetDataService } from '@/core/services/widget-data.service'
import { SiteAnalyticsRepository } from '@/core/repositories/site-analytics.repository'
import { SiteAnalyticsService } from '@/core/services/site-analytics.service'

declare global {
  var _logger: CustomLogger | undefined
  var _redis: Redis | undefined
  var _openObserveClient: OpenObserveClient | undefined
  var _auditLogger: AuditLogger<AuditLoggerConfig> | undefined
  var _hybridAuditLogger: HybridAuditLogger | undefined
  var _supabaseService: ReturnType<typeof createServerClient<Database>>
  var _systemLogger: SystemLogger | undefined
  var _utilitiesService: Utilities | undefined
  var _firecrawlerService: Firecrawler | undefined
  var _liteLLMService: LiteLLM | undefined

  var _touchPointRepo: TouchPointRepository | undefined
  var _tagRepo: TagRepository | undefined
  var _slugRepo: SlugRepository | undefined
  var _domainRepo: DomainRepository | undefined
  var _profileRepo: ProfileRepository | undefined
  var _userPlanRepo: UserPlanRepository | undefined
  var _analyticRepo: AnalyticRepository | undefined
  var _anonTouchPointRepo: AnonTouchPointRepository | undefined
  var _organizationRepo: OrganizationRepository | undefined
  var _aiProviderRepo: AIProviderRepository | undefined
  var _orgCreditRepo: OrgCreditRepository | undefined
  var _touchpointImportTasksRepo: TouchpointImportTasksRepository | undefined
  var _invitationRepo: InvitationRepository | undefined
  var _collectionRepo: CollectionRepository | undefined
  var _memberRepo: MemberRepository | undefined
  var _collectionMemberRepo: CollectionMemberRepository | undefined
  var _integrationRepo: IntegrationRepository | undefined
  var _notificationRepo: NotificationRepository | undefined
  var _utmCampaignRepo: UtmCampaignRepository | undefined
  var _utmCampaignChannelsRepo: UtmCampaignChannelsRepository | undefined
  var _utmCampaignTouchpointsRepo: UtmCampaignTouchpointsRepository | undefined
  var _campaignChannelRepo: CampaignChannelRepository | undefined
  var _staticQrRepo: StaticQrRepository | undefined
  var _conversionEventRepo: ConversionEventRepository | undefined
  var _customerProfileRepo: CustomerProfileRepository | undefined
  var _analyticsSettingsRepo: AnalyticsSettingsRepository | undefined
  var _exchangeRateRepo: ExchangeRateRepository | undefined
  var _apiKeyRepo: ApiKeyRepository | undefined
  var _funnelRepo: FunnelRepository | undefined
  var _heatmapRepo: HeatmapRepository | undefined
  var _eventRuleRepo: EventRuleRepository | undefined
  var _linkJourneyRepo: LinkJourneyRepository | undefined
  var _debugLogsRepo: DebugLogsRepository | undefined
  var _appSettingsRepo: AppSettingsRepository | undefined
  var _formsAnalyticsRepo: FormsAnalyticsRepository | undefined
  var _smartSetupRepo: SmartSetupRepository | undefined
  var _dashboardRepo: DashboardRepository | undefined
  var _dashboardMemberRepo:
    | import('@/core/repositories/dashboard-member.repository').DashboardMemberRepository
    | undefined
  var _siteAnalyticsRepo: SiteAnalyticsRepository | undefined
  var _mcpOAuthRepo:
    | import('@/core/repositories/mcp-oauth.repository').McpOAuthRepository
    | undefined

  var _bootstrapService: BootstrapService | undefined
  var _touchPointService: TouchPointService | undefined
  var _tagService: TagService | undefined
  var _slugService: SlugService | undefined
  var _domainService: DomainService | undefined
  var _profileService: ProfileService | undefined
  var _userPlanService: UserPlanService | undefined
  var _analyticService: AnalyticService | undefined
  var _anonTouchPointService: AnonTouchPointService | undefined
  var _organizationService: OrganizationService | undefined
  var _aiProviderService: AIProviderService | undefined
  var _orgCreditService: OrgCreditService | undefined
  var _touchPointImportTasksService: TouchPointImportTasksService | undefined
  var _authService: AuthService | undefined
  var _orgAuditLogService: OrgAuditLogService | undefined
  var _invitationService: InvitationService | undefined
  var _memberService: MemberService | undefined
  var _collectionMemberService: CollectionMemberService | undefined
  var _collectionService: CollectionService | undefined
  var _collectionPermissionService: CollectionPermissionService | undefined
  var _integrationService: IntegrationService | undefined
  var _notificationService: NotificationService | undefined
  var _utmCampaignService: UtmCampaignService | undefined
  var _utmCampaignChannelsService: UtmCampaignChannelsService | undefined
  var _utmCampaignTouchpointsService: UtmCampaignTouchpointsService | undefined
  var _campaignChannelService: CampaignChannelService | undefined
  var _staticQrService: StaticQrService | undefined
  var _conversionService: ConversionService | undefined
  var _analyticsSettingsService: AnalyticsSettingsService | undefined
  var _currencyService: CurrencyService | undefined
  var _apiKeyService: ApiKeyService | undefined
  var _funnelService: FunnelService | undefined
  var _heatmapService: HeatmapService | undefined
  var _eventRuleService: EventRuleService | undefined
  var _linkJourneyService: LinkJourneyService | undefined
  var _debugLogsService: DebugLogsService | undefined
  var _appSettingsService: AppSettingsService | undefined
  var _formsAnalyticsService: FormsAnalyticsService | undefined
  var _smartSetupService: SmartSetupService | undefined
  var _conversionSetupService: import('@/core/services/conversion-setup.service').ConversionSetupService | undefined
  var _dashboardPermissionService:
    | import('@/core/services/dashboard-permission.service').DashboardPermissionService
    | undefined
  var _dashboardEditLockService:
    | import('@/core/services/dashboard-edit-lock.service').DashboardEditLockService
    | undefined
  var _dashboardService: DashboardService | undefined
  var _widgetDataService: WidgetDataService | undefined
  var _siteAnalyticsService: SiteAnalyticsService | undefined
  var _sessionRecordingService:
    | import('@/core/services/session-recording.service').SessionRecordingService
    | undefined
  var _mcpOAuthService:
    | import('@/core/services/mcp-oauth.service').McpOAuthService
    | undefined
}
