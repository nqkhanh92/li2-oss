import { cookies } from 'next/headers'
import { logger } from '@/infrastructure/logging/logger'
import { initServer } from '@li2/analytics'

const log = logger.child({
  module: 'li2/tracking',
})
const COOKIE_NAME = 'li_cid'

interface TrackLeadParams {
  clickId?: string
  eventName: string
  customerExternalId: string
  customerName?: string
  customerEmail?: string
  customerAvatar?: string
  metadata?: Record<string, unknown>
}

interface TrackSaleParams {
  customerExternalId: string
  amount: number
  eventName?: string
  paymentProcessor?: string
  invoiceId?: string
  currency?: string
  clickId?: string
  customerName?: string
  customerEmail?: string
  customerAvatar?: string
  metadata?: Record<string, unknown>
}

class Li2TrackingService {
  private li2: ReturnType<typeof initServer> | undefined

  constructor() {
    const apiKey = process.env.LI2_TRACKING_API_KEY
    const apiUrl = process.env.LI2_TRACKING_API_URL || undefined

    if (apiKey) {
      log.info({}, 'Li2TrackingService initialized')
      this.li2 = initServer({
        apiKey,
        apiUrl,
      })
    } else {
      log.error({}, 'Li2TrackingService not initialized - missing API key')
    }
  }

  async trackLead(params: TrackLeadParams): Promise<void> {
    try {
      const clickId = params.clickId || (await cookies()).get(COOKIE_NAME)?.value || ""

      if (!this.li2) {
        return
      }
      log.info({ clickId }, 'Li2TrackingService trackLead clickId')

      const {
        customerExternalId,
        eventName,
        customerName,
        customerEmail,
        customerAvatar,
        metadata,
      } = params

      const response = await this.li2.trackLead({
        clickId,
        customerExternalId,
        eventName,
        customerName,
        customerEmail,
        customerAvatar,
        metadata,
      })
      log.info({ response }, 'Li2TrackingService trackLead response')
    } catch (error) {
      log.error({ error }, 'Li2TrackingService trackLead error')
      // Silent fail
    }
  }

  async trackSale(params: TrackSaleParams): Promise<void> {
    try {
      const clickId = params.clickId || (await cookies()).get(COOKIE_NAME)?.value

      if (!clickId || !this.li2) {
        return
      }

      const {
        amount,
        customerExternalId,
        currency,
        customerAvatar,
        customerEmail,
        customerName,
        eventName,
        invoiceId,
        metadata,
        paymentProcessor,
      } = params
      const response = await this.li2.trackSale({
        amount,
        clickId,
        customerExternalId,
        currency,
        customerAvatar,
        customerEmail,
        customerName,
        eventName,
        invoiceId,
        metadata,
        paymentProcessor,
      })
      log.info({ response }, 'Li2TrackingService trackSale response')
    } catch (error) {
      log.error({ error }, 'Li2TrackingService trackSale error')
      // Silent fail
    }
  }
}

export const li2TrackingService = new Li2TrackingService()
