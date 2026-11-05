import { IntegrationType } from '@/features/integrations/constants'
import { BaseIntegrationService } from './base'
import { createIntegrationSchema } from '@/shared/schemas/integrations'
import { z } from 'zod'
import axios, { AxiosInstance } from 'axios'

export type JourneyDropdown = {
  id: string
  name: string
}
export type EntranceDropdown = {
  id: string
  name: string
}
export class ParcelvoyIntegrationService extends BaseIntegrationService<IntegrationType.PARCELVOY> {
  protected axiosInstance: AxiosInstance

  constructor(
    config: Extract<
      z.infer<typeof createIntegrationSchema>,
      { type: IntegrationType.PARCELVOY }
    >['config']
  ) {
    super(IntegrationType.PARCELVOY, config)
    this.axiosInstance = axios.create({
      baseURL: config.base_url,
      headers: {
        Authorization: `Bearer ${config.api_key}`,
      },
    })
  }

  async validateConfig(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/keys')
      const contentType = response.headers['content-type']
      const isJson = contentType && contentType.includes('application/json')

      if (response.status !== 200 || !isJson) {
        return Promise.resolve(false)
      }
    } catch (error) {
      return Promise.resolve(false)
    }
    return Promise.resolve(true)
  }

  async getAllJourneys(): Promise<JourneyDropdown[]> {
    const response = await this.axiosInstance.get('/journeys?limit=1000')
    const contentType = response.headers['content-type']
    const isJson = contentType && contentType.includes('application/json')

    if (response.status !== 200 || !isJson || !response.data?.results) {
      console.log({ response })
      throw new Error('Failed to fetch journeys')
    }
    return response.data?.results
  }
  async getAllEntrances(journeyId: string): Promise<EntranceDropdown[]> {
    const response = await this.axiosInstance.get(`/journeys/${journeyId}/steps`)
    const contentType = response.headers['content-type']
    const isJson = contentType && contentType.includes('application/json')

    if (response.status !== 200 || !isJson) {
      console.log({ response })
      throw new Error('Failed to fetch entrances')
    }
    const results = Object.values(response.data)
      .filter((entrance: any) => entrance.type === 'entrance')
      .map((entrance: any) => ({
        id: entrance.id,
        name: entrance.name,
      }))

    return results
  }
}
