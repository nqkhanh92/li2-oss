import crypto from 'crypto'
import { logger } from '@/infrastructure/logging/logger'

const log = logger.child({
  module: 'facebook/tracking',
})

interface FacebookUserData {
  em?: string[] // hashed email
  ph?: string[] // hashed phone
  client_ip_address?: string
  client_user_agent?: string
  fbp?: string // Facebook browser cookie
  fbc?: string // Facebook click cookie
}

interface FacebookCustomData {
  currency?: string
  value?: string
}

interface FacebookEvent {
  event_name: string
  event_time: number
  action_source: 'website'
  user_data?: FacebookUserData
  custom_data?: FacebookCustomData
}

interface FacebookPayload {
  data: FacebookEvent[]
}

export class FacebookTrackingService {
  private accessToken: string
  private pixelId: string

  constructor() {
    this.accessToken = process.env.FACEBOOK_ACCESS_TOKEN || ''
    this.pixelId = process.env.FACEBOOK_PIXEL_ID || ''

    if (!this.accessToken || !this.pixelId) {
      log.warn('Facebook tracking credentials not configured')
    }
  }

  /**
   * Hash email using SHA-256 (Facebook requirement)
   */
  private hashEmail(email: string): string {
    return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
  }

  /**
   * Hash phone using SHA-256 (Facebook requirement)
   */
  private hashPhone(phone: string): string {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '')
    return crypto.createHash('sha256').update(cleanPhone).digest('hex')
  }

  /**
   * Extract Facebook cookies from request headers
   */
  private extractFacebookCookies(request: Request): { fbp?: string; fbc?: string } {
    const cookieHeader = request.headers.get('cookie') || ''
    const cookies: Record<string, string> = {}

    cookieHeader.split(';').forEach((cookie) => {
      const [name, value] = cookie.trim().split('=')
      if (name && value) {
        cookies[name] = value
      }
    })

    return {
      fbp: cookies['_fbp'],
      fbc: cookies['_fbc'],
    }
  }

  /**
   * Get client IP address from request
   */
  private getClientIP(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const rawIp = forwarded?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'Unknown'

    return rawIp?.startsWith('::ffff:') ? rawIp.replace('::ffff:', '') : rawIp
  }

  /**
   * Send sign-up event to Facebook Conversions API
   */
  async trackSignUp(email: string, phone?: string, request?: Request): Promise<void> {
    if (!this.accessToken || !this.pixelId) {
      log.warn('Facebook tracking not configured, skipping sign-up tracking')
      return
    }

    try {
      const { fbp, fbc } = this.extractFacebookCookies(request || new Request(''))
      const clientIP = request ? this.getClientIP(request) : 'Unknown'
      const userAgent = request?.headers.get('user-agent') || 'Unknown'

      const userData: FacebookUserData = {
        em: [this.hashEmail(email)],
        client_ip_address: clientIP,
        client_user_agent: userAgent,
      }

      if (phone) {
        userData.ph = [this.hashPhone(phone)]
      }

      if (fbp) {
        userData.fbp = fbp
      }

      if (fbc) {
        userData.fbc = fbc
      }

      const payload: FacebookPayload = {
        data: [
          {
            event_name: 'CompleteRegistration',
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'website',
            user_data: userData,
            custom_data: {
              currency: 'USD',
              value: '0.00',
            },
          },
        ],
      }

      const response = await fetch(
        `https://graph.facebook.com/v24.0/${this.pixelId}/events?access_token=${this.accessToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        log.error({
          error: 'Facebook API error',
          status: response.status,
          response: errorText,
          payload,
        })
        throw new Error(`Facebook API error: ${response.status}`)
      }

      const result = await response.json()
      log.info({
        message: 'Facebook sign-up event tracked successfully',
        eventId: result?.data?.[0]?.event_id,
        email: email.substring(0, 3) + '***', // Partial email for logging
      })
    } catch (error) {
      log.error({
        error: 'Failed to track Facebook sign-up event',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        email: email.substring(0, 3) + '***',
      })
      // Don't throw error to avoid breaking the auth flow
    }
  }

  /**
   * Send custom event to Facebook Conversions API
   */
  async trackCustomEvent(
    eventName: string,
    email?: string,
    phone?: string,
    customData?: FacebookCustomData,
    request?: Request
  ): Promise<void> {
    if (!this.accessToken || !this.pixelId) {
      log.warn('Facebook tracking not configured, skipping custom event tracking')
      return
    }

    try {
      const { fbp, fbc } = this.extractFacebookCookies(request || new Request(''))
      const clientIP = request ? this.getClientIP(request) : 'Unknown'
      const userAgent = request?.headers.get('user-agent') || 'Unknown'

      const userData: FacebookUserData = {
        client_ip_address: clientIP,
        client_user_agent: userAgent,
      }

      if (email) {
        userData.em = [this.hashEmail(email)]
      }

      if (phone) {
        userData.ph = [this.hashPhone(phone)]
      }

      if (fbp) {
        userData.fbp = fbp
      }

      if (fbc) {
        userData.fbc = fbc
      }

      const payload: FacebookPayload = {
        data: [
          {
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'website',
            user_data: userData,
            custom_data: customData || {
              currency: 'USD',
              value: '0.00',
            },
          },
        ],
      }

      const response = await fetch(
        `https://graph.facebook.com/v24.0/${this.pixelId}/events?access_token=${this.accessToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        log.error({
          error: 'Facebook API error',
          status: response.status,
          response: errorText,
          payload,
        })
        throw new Error(`Facebook API error: ${response.status}`)
      }

      const result = await response.json()
      log.info({
        message: 'Facebook custom event tracked successfully',
        eventName,
        eventId: result?.data?.[0]?.event_id,
      })
    } catch (error) {
      log.error({
        error: 'Failed to track Facebook custom event',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        eventName,
      })
      // Don't throw error to avoid breaking the application flow
    }
  }
}

export const facebookTrackingService = new FacebookTrackingService()
