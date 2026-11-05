import { supabaseService } from '@/infrastructure/database/supabase'
import { aiProviderRepo, AIProviderRepository } from '../repositories/ai-provider.repository'
import { BaseService } from './base.service'
import { AppError, BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { AIProviderStatus, AIProviderType } from '../types/ai-provider.type'
import { firecrawlerService } from '@/infrastructure/external/firecrawler'
import { orgCreditService } from './billing-usage/org-credit.service'
import { isCloud } from '@/shared/constants/edition'
import { ensureOrgMember } from '@/shared/lib/permission/permissions'
import { liteLLMService } from '@/infrastructure/external/lite-llm'
import { cleanMarkdown } from '@/shared/utils/clean-markdown'
import { URLStructureGenerator, validateAndSanitizeSlug } from '@/shared/utils/slug-generator'
import { logger } from '@/infrastructure/logging/logger'
import { ScrapeResponse } from '@/infrastructure/external/firecrawler/firecrawler'
import { mappingColumnsSchema } from '@/shared/schemas/touch-points/touchpoint_import_tasks'
import { mappingColumnDescription } from '@/features/touch-points/constants/import'
import { TouchPointExportType } from '../types/touch-point.type'
import { notificationService } from './notification.service'
import { NotificationType } from '../types/notification.type'

const log = logger.child({
  service: 'ai-provider-service',
})

/**
 * Maximum content length for AI processing (to avoid token limits)
 * Approximately 3000 tokens worth of text
 */
const MAX_CONTENT_LENGTH = 12000

/**
 * Maximum retry attempts for provider failover
 */
const MAX_RETRY_ATTEMPTS = 2

/**
 * Result of slug generation
 */
export type SlugGenerationResult = {
  slug: string
  provider_used: AIProviderType | 'fallback'
  alternatives?: string[]
  confidence_score?: number
  error?: string
}

export class AIProviderService extends BaseService<AIProviderRepository> {
  /**
   * Get an available AI provider with active API key
   * @param excludeProviders - Optional list of providers to exclude from selection
   * @returns Provider details with API key
   */
  async getAvailableProvider(excludeProviders: AIProviderType[] = []): Promise<{
    provider: AIProviderType
    key_identifier: string
    api_key: string
  }> {
    const availableProviders = [
      AIProviderType.GEMINI,
      AIProviderType.OPENAI,
      AIProviderType.FPT_CLOUD,
    ].filter((p) => !excludeProviders.includes(p))

    if (availableProviders.length === 0) {
      log.error({ excludeProviders, method: 'getAvailableProvider' }, 'No providers available')
      throw new AppError('All AI providers are currently unavailable. Please try again later.', {
        key: 'common.errors.ai_service_unavailable',
      })
    }

    const { data, error } = await supabaseService.rpc('get_ai_provider_active_key', {
      p_provider_types: availableProviders,
    })

    if (error) {
      log.error({ error, method: 'getAvailableProvider' }, 'Failed to get AI provider')
      throw new AppError('Our AI service is currently unavailable. Please try again later.', {
        key: 'common.errors.ai_service_unavailable',
      })
    }

    if (!data || data.length === 0) {
      log.warn({ availableProviders, method: 'getAvailableProvider' }, 'No active AI providers')
      throw new AppError('No AI providers are currently available. Please try again later.', {
        key: 'common.errors.ai_service_unavailable',
      })
    }

    return {
      provider: data[0].provider_type as AIProviderType,
      key_identifier: data[0].key_identifier,
      api_key: data[0].api_key,
    }
  }

  /**
   * Generate AI-powered column mapping for CSV import
   * Maps CSV headers to database columns using AI to understand semantic relationships
   * @param headers - Array of CSV header names to map
   * @param columns - Array of available database column keys
   * @returns Array of mapping objects with header, column, and confidence_score
   * @throws {AppError} If AI provider is unavailable or mapping generation fails
   * @example
   * const mappings = await generateColumnMapping(
   *   ['Short Link', 'Destination URL'],
   *   ['short_url', 'content_value']
   * )
   * // Returns: [
   * //   { header: 'Short Link', column: 'short_url', confidence_score: 0.9 },
   * //   { header: 'Destination URL', column: 'content_value', confidence_score: 0.95 }
   * // ]
   */
  async generateColumnMapping(headers: string[], columns: (keyof TouchPointExportType)[]) {
    const startTime = Date.now()

    log.info(
      {
        method: 'generateColumnMapping',
        headersCount: headers.length,
        columnsCount: columns.length,
        headers,
        columns,
      },
      'Starting AI column mapping generation'
    )

    try {
      // Get available AI provider
      const { provider, api_key } = await this.getAvailableProvider()
      log.info(
        { method: 'generateColumnMapping', provider },
        'Retrieved AI provider for column mapping'
      )

      // Generate prompt with column descriptions
      const prompt = this.getMappingColumnPrompt(headers, columns)
      log.debug(
        { method: 'generateColumnMapping', promptLength: prompt.length },
        'Generated mapping prompt'
      )

      // Call AI service with schema validation
      const result = await liteLLMService.completionWithSchema(
        prompt,
        provider,
        api_key,
        mappingColumnsSchema
      )

      const duration = Date.now() - startTime
      const highConfidenceMappings =
        result.data?.filter((m) => m.confidence_score && m.confidence_score >= 0.5).length || 0

      log.info(
        {
          method: 'generateColumnMapping',
          provider,
          duration,
          totalMappings: result.data?.length || 0,
          highConfidenceMappings,
          mappings: result.data,
        },
        'Column mapping generated successfully'
      )

      return result.data
    } catch (error) {
      const duration = Date.now() - startTime
      log.error(
        {
          method: 'generateColumnMapping',
          error,
          duration,
          headers,
          columns,
        },
        'Failed to generate column mapping'
      )
      throw error
    }
  }

  /**
   * Generate AI prompt for column mapping with detailed instructions
   * @param headers - CSV header names to be mapped
   * @param columns - Available database column keys
   * @returns Formatted prompt string with mapping instructions and column descriptions
   * @protected
   */
  protected getMappingColumnPrompt(headers: string[], columns: (keyof TouchPointExportType)[]) {
    const columnWithDescription = columns.map((column) => ({
      id: column,
      description: mappingColumnDescription[column],
    }))

    log.debug(
      {
        method: 'getMappingColumnPrompt',
        headersCount: headers.length,
        columnsCount: columns.length,
      },
      'Generating column mapping prompt'
    )

    return `You are mapping CSV headers to columns in a short link (URL shortener) database table.

IMPORTANT RULES:
1. Only map a header to a column if you are confident it's the correct match
2. If you're unsure about a mapping, set confidence_score to less than 0.5
3. Set confidence_score to null or less than 0.5 if the header doesn't match any column
4. Be strict - it's better to have no mapping than an incorrect mapping
5. Consider common short link terminology: "short link", "short url", "destination", "target url", "original url", etc.

CSV Headers to map: ${headers.join(', ')}

Available columns with descriptions:
${JSON.stringify(columnWithDescription, null, 2)}

Return the mapping in the exact JSON format specified in the schema.
For each header, provide:
- header: the CSV header name
- column: the matched column id (or null if no good match)
- confidence_score: a number between 0 and 1 (use < 0.5 if uncertain, null if no match)`
  }

  /**
   * Generate an SEO-friendly slug for a URL using AI
   * @param orgId - Organization ID
   * @param url - Target URL to generate slug for
   * @param locale - User's locale for slug generation
   * @param attemptCount - Internal retry counter (do not pass manually)
   * @param excludedProviders - Internal list of failed providers (do not pass manually)
   * @returns Generated slug with metadata
   */
  async generateSlug(
    orgId: string,
    url: string,
    locale: string,
    attemptCount: number = 0,
    excludedProviders: AIProviderType[] = []
  ): Promise<SlugGenerationResult> {
    const startTime = Date.now()

    // Validate organization membership
    await ensureOrgMember(orgId)

    // Validate URL format
    try {
      new URL(url)
    } catch (error) {
      log.warn({ url, orgId, method: 'generateSlug' }, 'Invalid URL provided')
      throw new BadRequestError('Invalid URL format', {
        key: 'common:messages.error.invalid_url',
      })
    }

    // Check organization credits — chỉ bản cloud. Bản OSS dùng khoá LLM của chính người vận
    // hành nên không có khái niệm tín dụng Li2; xem shared/constants/edition.ts.
    if (isCloud) {
      const orgCredits = await orgCreditService.getOrgCredit(orgId)
      if (orgCredits.ai_credits_balance < 1) {
        log.warn({ orgId, balance: orgCredits.ai_credits_balance }, 'Insufficient AI credits')
        notificationService.createTypedNotification(NotificationType.AI_CREDIT_QUOTA_EXCEEDED, {
          organizationId: orgId,
          currentCredits: orgCredits.ai_credits_balance,
        })
        throw new BadRequestError('Insufficient AI credits. Please purchase more credits.', {
          key: 'common:messages.error.ai_credits_balance_not_enough',
        })
      }
    }

    // Scrape page content
    log.info({ url, orgId, method: 'generateSlug' }, 'Starting page scraping')
    const pageMarkdown = await firecrawlerService.getPageMarkdown(url)

    if (!pageMarkdown || !pageMarkdown.success || !pageMarkdown.data) {
      log.warn({ url, orgId, method: 'generateSlug' }, 'Failed to scrape page, using fallback')
      const slug = new URLStructureGenerator().generateSlugFromUrl(url)
      return {
        slug,
        provider_used: 'fallback',
        error: 'Failed to scrape page content',
      }
    }

    // Try AI generation
    try {
      const { provider, api_key } = await this.getAvailableProvider(excludedProviders)
      const prompt = this.getPromptFromScrapeResponse(pageMarkdown, locale)

      log.info(
        { provider, orgId, url, attempt: attemptCount + 1, method: 'generateSlug' },
        'Attempting AI slug generation'
      )

      const result = await liteLLMService.completions(prompt, provider, api_key, {
        onInvalidKey: async () => {
          log.warn({ provider, api_key, method: 'generateSlug' }, 'API key is invalid')
          await this.repo.updateStatusByApiKey(api_key, AIProviderStatus.INACTIVE)
        },
        onRateLimit: async () => {
          log.warn({ provider, api_key, method: 'generateSlug' }, 'Rate limit exceeded')
          await this.repo.updateStatusByApiKey(api_key, AIProviderStatus.EXHAUSTED)
        },
      })

      // Success - deduct credit and return
      if (result.success && result.data) {
        const { error: creditError } = isCloud
          ? await orgCreditService.reduceOrgCredit(orgId, 1)
          : { error: null }
        if (creditError) {
          log.error(
            { error: creditError, orgId, method: 'generateSlug' },
            'Failed to deduct credit'
          )
          throw new AppError('Failed to process credit deduction')
        }

        const duration = Date.now() - startTime
        log.info(
          {
            provider,
            orgId,
            url,
            slug: result.data.slug,
            duration,
            method: 'generateSlug',
          },
          'Successfully generated slug with AI'
        )

        return {
          slug: result.data.slug,
          provider_used: result.data.provider_used,
          alternatives: result.data.alternatives,
          confidence_score: result.data.confidence_score,
        }
      }

      // Failed - retry with different provider if available
      if (attemptCount < MAX_RETRY_ATTEMPTS) {
        log.warn(
          {
            provider,
            orgId,
            url,
            attempt: attemptCount + 1,
            error: result.error,
            method: 'generateSlug',
          },
          'AI generation failed, retrying with different provider'
        )

        return this.generateSlug(orgId, url, locale, attemptCount + 1, [
          ...excludedProviders,
          provider,
        ])
      }

      // All attempts exhausted - use fallback
      log.warn(
        { orgId, url, attempts: attemptCount + 1, method: 'generateSlug' },
        'All AI generation attempts failed, using fallback'
      )

      return this.generateFallbackSlug(pageMarkdown, url)
    } catch (error) {
      // Handle unexpected errors
      if (error instanceof BadRequestError || error instanceof AppError) {
        throw error
      }

      log.error(
        { error, orgId, url, method: 'generateSlug' },
        'Unexpected error during slug generation'
      )

      // Try retry if attempts remaining
      if (attemptCount < MAX_RETRY_ATTEMPTS) {
        return this.generateSlug(orgId, url, locale, attemptCount + 1, excludedProviders)
      }

      // Final fallback
      return this.generateFallbackSlug(pageMarkdown, url)
    }
  }

  /**
   * Generate a fallback slug when AI generation fails
   */
  private generateFallbackSlug(pageMarkdown: ScrapeResponse, url: string): SlugGenerationResult {
    const title =
      pageMarkdown.data?.metadata?.title ??
      pageMarkdown.data?.metadata?.ogTitle ??
      pageMarkdown.data?.metadata?.og_title

    const generator = new URLStructureGenerator()
    const slug = title ? generator.generateSlugFromTitle(title) : generator.generateSlugFromUrl(url)

    return {
      slug,
      provider_used: 'fallback',
      error: 'AI generation unavailable, used fallback method',
    }
  }

  /**
   * Build an optimized prompt from scraped page data
   * @param scrapeResponse - Response from firecrawler
   * @param locale - User's locale
   * @returns Formatted prompt for AI
   */
  getPromptFromScrapeResponse({ data }: ScrapeResponse, locale: string): string {
    const lang = locale.split('-')[0] === 'vi' ? 'Vietnamese' : 'English'
    const title = data?.metadata?.title ?? data?.metadata?.ogTitle ?? data?.metadata?.og_title
    const description =
      data?.metadata?.description ?? data?.metadata?.ogDescription ?? data?.metadata?.og_description

    // Clean and truncate content to avoid token limits
    let contentSummary = ''
    if (data?.markdown) {
      contentSummary = cleanMarkdown(data.markdown)
      if (contentSummary.length > MAX_CONTENT_LENGTH) {
        contentSummary = contentSummary.substring(0, MAX_CONTENT_LENGTH) + '...'
        log.info(
          { originalLength: data.markdown.length, truncatedLength: contentSummary.length },
          'Content truncated to fit token limits'
        )
      }
    }

    // Build prompt with available metadata
    const parts = ['Based on this web page content, generate a short, memorable URL slug:']

    if (title) {
      parts.push(`\nTitle: ${title}`)
    }

    if (description) {
      parts.push(`\nDescription: ${description}`)
    }

    if (contentSummary) {
      parts.push(`\nMain content preview: ${contentSummary}`)
    }

    parts.push(`
Requirements:
- 2-6 words maximum
- Use hyphens between words
- Include relevant keywords
- Be memorable and SEO-friendly
- Reflect the main topic accurately
- Target slug language: ${lang}

Return ONLY the slug generation result in the specified JSON format with translated.`)

    return parts.join('')
  }
}

export const aiProviderService =
  process.env.NODE_ENV !== 'production'
    ? new AIProviderService(aiProviderRepo)
    : globalThis._aiProviderService ??
      (globalThis._aiProviderService = new AIProviderService(aiProviderRepo))
