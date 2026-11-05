import axios, { AxiosInstance } from 'axios'
import { logger } from '@/infrastructure/logging/logger'
import { AppError } from '@/infrastructure/response/errors/domain.errors'

const log = logger.child({
  service: 'dub',
})

/**
 * Configuration for tracking leads
 */
export interface DubTrackLeadPayload {
  clickId: string
  eventName: string
  customerExternalId?: string
  customerName?: string
  customerEmail?: string
  customerAvatar?: string
}

/**
 * Response from Dub API
 */
export interface DubTrackLeadResponse {
  success: boolean
  data?: any
  error?: string
}

/**
 * Dub service for server-side operations
 * Singleton pattern to ensure single instance across the application
 */
export class DubService {
  private static instance: DubService | null = null
  private axiosClient: AxiosInstance
  private readonly apiKey: string
  private readonly baseURL = 'https://api.dub.co'

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    const apiKey = process.env.DUB_API_KEY ?? ''

    if (!apiKey) {
      log.error({ method: 'constructor' }, 'DUB_API_KEY environment variable is not configured')
      // throw new AppError('DUB_API_KEY environment variable is not configured')
    }

    this.apiKey = apiKey
    this.axiosClient = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds timeout
    })

    // Request interceptor for logging
    this.axiosClient.interceptors.request.use(
      (config) => {
        log.info(
          {
            method: config.method,
            url: config.url,
          },
          'Dub API request'
        )
        return config
      },
      (error) => {
        log.error({ error, method: 'request-interceptor' }, 'Dub API request error')
        return Promise.reject(error)
      }
    )

    // Response interceptor for logging
    this.axiosClient.interceptors.response.use(
      (response) => {
        log.info(
          {
            status: response.status,
            url: response.config.url,
          },
          'Dub API response'
        )
        return response
      },
      (error) => {
        log.error(
          {
            error: error.message,
            status: error.response?.status,
            data: error.response?.data,
            method: 'response-interceptor',
          },
          'Dub API response error'
        )
        return Promise.reject(error)
      }
    )
  }

  /**
   * Get the singleton instance of DubService
   * @returns DubService instance
   */
  public static getInstance(): DubService {
    if (!DubService.instance) {
      DubService.instance = new DubService()
    }
    return DubService.instance
  }

  /**
   * Track a lead event in Dub
   * @param payload - Lead tracking data
   * @returns Promise resolving to the API response
   */
  async trackLead(payload: DubTrackLeadPayload): Promise<DubTrackLeadResponse> {
    try {
      log.info(
        {
          clickId: payload.clickId,
          eventName: payload.eventName,
          customerEmail: payload.customerEmail,
          method: 'trackLead',
        },
        'Tracking lead event'
      )

      const response = await this.axiosClient.post<any>('/track/lead', payload)

      log.info(
        {
          clickId: payload.clickId,
          eventName: payload.eventName,
          method: 'trackLead',
          path: response.config.url,
        },
        'Lead tracked successfully'
      )

      return {
        success: true,
        data: response.data,
      }
    } catch (error) {
      log.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          payload,
          method: 'trackLead',
        },
        'Failed to track lead'
      )

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Reset the singleton instance (mainly for testing purposes)
   */
  public static resetInstance(): void {
    DubService.instance = null
  }
}

/**
 * Export a singleton instance for convenience
 */
export const dubService = DubService.getInstance()
