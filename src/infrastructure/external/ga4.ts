import { cookies } from 'next/headers'
import { logger } from '@/infrastructure/logging/logger'

const log = logger.child({
  module: 'ga4/tracking',
})

const GA_COOKIE_NAME = '_ga'

interface GA4EventParams {
  method?: string // signup method: 'email' | 'google'
  engagement_time_msec?: string
  session_id?: string
  user_id?: string
  [key: string]: string | number | undefined
}

interface GA4Event {
  name: string
  params?: GA4EventParams
}

interface GA4Payload {
  client_id: string
  user_id?: string
  events: GA4Event[]
}

export class GA4TrackingService {
  private measurementId: string
  private apiSecret: string

  constructor() {
    this.measurementId = process.env.GA4_MEASUREMENT_ID || process.env.NEXT_PUBLIC_APP_GA_ID || ''
    this.apiSecret = process.env.GA4_API_SECRET || ''

    if (!this.measurementId || !this.apiSecret) {
      log.warn('GA4 Measurement Protocol credentials not configured')
    }
  }

  /**
   * Extract GA4 client_id from _ga cookie
   * Cookie format: GA1.1.123456789.1234567890
   * Client ID is the last two parts: 123456789.1234567890
   */
  private async extractClientId(): Promise<string | null> {
    try {
      const cookieStore = cookies()
      const gaCookie = cookieStore.get(GA_COOKIE_NAME)?.value

      if (!gaCookie) {
        log.warn('GA4 _ga cookie not found')
        return null
      }

      // GA cookie format: GA1.1.123456789.1234567890
      // or GA1.2.123456789.1234567890 (cross-domain)
      const parts = gaCookie.split('.')
      if (parts.length >= 4) {
        // Client ID is the last two parts
        return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`
      }

      log.warn({ gaCookie }, 'Invalid GA4 cookie format')
      return null
    } catch (error) {
      log.error({ error }, 'Failed to extract GA4 client_id')
      return null
    }
  }

  /**
   * Extract session_id from _ga_<container_id> cookie
   */
  private async extractSessionId(): Promise<string | null> {
    try {
      const cookieStore = cookies()
      // GA4 session cookie format: _ga_<MEASUREMENT_ID without G->
      // e.g., _ga_DHCPTTRDF6 for G-DHCPTTRDF6
      const measurementIdSuffix = this.measurementId.replace('G-', '')
      const sessionCookie = cookieStore.get(`_ga_${measurementIdSuffix}`)?.value

      if (!sessionCookie) {
        return null
      }

      // Session cookie format: GS1.1.1234567890.1.1.1234567890.0.0.0
      // Session ID is typically the 3rd part
      const parts = sessionCookie.split('.')
      if (parts.length >= 3) {
        return parts[2]
      }

      return null
    } catch (error) {
      log.error({ error }, 'Failed to extract GA4 session_id')
      return null
    }
  }

  /**
   * Send sign_up_success event to GA4 via Measurement Protocol
   */
  async trackSignUp(params: {
    userId?: string
    email?: string
    method?: 'email' | 'google'
  }): Promise<void> {
    if (!this.measurementId || !this.apiSecret) {
      log.warn('GA4 Measurement Protocol not configured, skipping sign_up_success tracking')
      return
    }

    try {
      const clientId = await this.extractClientId()

      if (!clientId) {
        log.warn('Cannot track GA4 sign_up_success - no client_id available')
        return
      }

      const sessionId = await this.extractSessionId()

      const payload: GA4Payload = {
        client_id: clientId,
        user_id: params.userId,
        events: [
          {
            name: 'sign_up_success',
            params: {
              method: params.method || 'email',
              engagement_time_msec: '100',
              ...(sessionId && { session_id: sessionId }),
            },
          },
        ],
      }

      const url = `https://www.google-analytics.com/mp/collect?measurement_id=${this.measurementId}&api_secret=${this.apiSecret}`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      // GA4 Measurement Protocol returns 2xx even for invalid data
      // It doesn't return response body on success
      if (!response.ok) {
        log.error({
          error: 'GA4 Measurement Protocol error',
          status: response.status,
        })
        return
      }

      log.info({
        message: 'GA4 sign_up_success event tracked successfully',
        clientId: clientId.substring(0, 5) + '***',
        userId: params.userId?.substring(0, 8) + '***',
        method: params.method,
      })
    } catch (error) {
      log.error({
        error: 'Failed to track GA4 sign_up_success event',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })
      // Don't throw error to avoid breaking the auth flow
    }
  }

  /**
   * Send custom event to GA4 via Measurement Protocol
   */
  async trackEvent(
    eventName: string,
    eventParams?: GA4EventParams,
    userId?: string
  ): Promise<void> {
    if (!this.measurementId || !this.apiSecret) {
      log.warn('GA4 Measurement Protocol not configured, skipping event tracking')
      return
    }

    try {
      const clientId = await this.extractClientId()

      if (!clientId) {
        log.warn({ eventName }, 'Cannot track GA4 event - no client_id available')
        return
      }

      const sessionId = await this.extractSessionId()

      const payload: GA4Payload = {
        client_id: clientId,
        user_id: userId,
        events: [
          {
            name: eventName,
            params: {
              engagement_time_msec: '100',
              ...(sessionId && { session_id: sessionId }),
              ...eventParams,
            },
          },
        ],
      }

      const url = `https://www.google-analytics.com/mp/collect?measurement_id=${this.measurementId}&api_secret=${this.apiSecret}`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        log.error({
          error: 'GA4 Measurement Protocol error',
          status: response.status,
          eventName,
        })
        return
      }

      log.info({
        message: 'GA4 event tracked successfully',
        eventName,
        clientId: clientId.substring(0, 5) + '***',
      })
    } catch (error) {
      log.error({
        error: 'Failed to track GA4 event',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        eventName,
      })
      // Don't throw error to avoid breaking the application flow
    }
  }
}

export const ga4TrackingService = new GA4TrackingService()
