import { logger } from '@/infrastructure/logging/logger'
const log = logger.child({ module: 'facebook-graph-service' })

/**
 * Service for interacting with Facebook Graph API
 * Handles Open Graph tag invalidation and other Facebook API operations
 */
export class FacebookGraphService {
  private readonly graphApiUrl = 'https://graph.facebook.com'
  private readonly appId: string
  private readonly appSecret: string

  constructor() {
    this.appId = process.env.FACEBOOK_APP_ID || ''
    this.appSecret = process.env.FACEBOOK_APP_SECRET || ''

    if (!this.appId || !this.appSecret) {
      log.warn(
        'Facebook App ID or App Secret not configured. Facebook OG tag scraping will be disabled.'
      )
    }
  }

  /**
   * Check if Facebook Graph API is configured
   */
  isConfigured(): boolean {
    return Boolean(this.appId && this.appSecret)
  }

  /**
   * Invalidate Facebook's cached Open Graph tags for a URL
   * This forces Facebook to re-scrape the URL and update its cached meta tags
   *
   * @param url - The URL to invalidate (should be the short URL)
   * @returns Promise<boolean> - True if successful, false otherwise
   */
  async scrapeUrl(url: string): Promise<boolean> {
    if (!this.isConfigured()) {
      log.debug({ url }, 'Facebook Graph API not configured, skipping OG tag invalidation')
      return false
    }

    try {
      const encodedUrl = encodeURIComponent(url)
      const accessToken = `${this.appId}|${this.appSecret}`
      const scrapeEndpoint = `${this.graphApiUrl}/?id=${encodedUrl}&scrape=true&access_token=${accessToken}`

      log.info({ url, encodedUrl }, 'Invalidating Facebook OG tags')

      const response = await fetch(scrapeEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        log.error(
          {
            url,
            status: response.status,
            statusText: response.statusText,
            error: errorText,
          },
          'Failed to invalidate Facebook OG tags'
        )
        return false
      }

      const result = await response.json()
      log.info({ url, result }, 'Successfully invalidated Facebook OG tags')

      return true
    } catch (error) {
      log.error(
        { url, error: error instanceof Error ? error.message : String(error) },
        'Error invalidating Facebook OG tags'
      )
      return false
    }
  }

  /**
   * Batch invalidate multiple URLs
   * Useful when updating multiple touch points at once
   *
   * @param urls - Array of URLs to invalidate
   * @returns Promise<{ success: number; failed: number }> - Count of successful and failed operations
   */
  async scrapeUrls(urls: string[]): Promise<{ success: number; failed: number }> {
    if (!this.isConfigured()) {
      log.debug(
        { count: urls.length },
        'Facebook Graph API not configured, skipping batch OG tag invalidation'
      )
      return { success: 0, failed: urls.length }
    }

    log.info({ count: urls.length }, 'Starting batch Facebook OG tag invalidation')

    const results = await Promise.allSettled(urls.map((url) => this.scrapeUrl(url)))

    const success = results.filter((r) => r.status === 'fulfilled' && r.value === true).length
    const failed = results.length - success

    log.info(
      { total: urls.length, success, failed },
      'Completed batch Facebook OG tag invalidation'
    )

    return { success, failed }
  }
}

export const facebookGraphService = new FacebookGraphService()
