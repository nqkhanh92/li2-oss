import { axiosShlinkApiInstance } from '@/shared/lib/axios'
import { cookies } from 'next/headers'
import { AxiosRequestConfig } from 'axios'

export interface AnalyticsSettings {
  id: string
  organization_id: string
  publishable_key: string
  publishable_key_created_at: string
  allowed_hostnames: string[]
  created_at: string
  updated_at: string
}

export interface RegenerateKeyResponse {
  publishable_key: string
  publishable_key_created_at: string
}

export class AnalyticsSettingsService {
  private axiosClient = axiosShlinkApiInstance
  private headers: AxiosRequestConfig['headers']

  constructor() {
    const access_token = cookies().get('casdoor_access_token')?.value
    if (!access_token) {
      throw Error('Unauthorized')
    }
    this.headers = {
      Authorization: `Bearer ${access_token}`,
      'X-Api-Key': process.env.SHLINK_API_KEY,
    }
  }

  async getSettings(orgId: string): Promise<AnalyticsSettings> {
    const { data } = await this.axiosClient.get<{ data: AnalyticsSettings }>(
      `/admin/org/${orgId}/analytics-settings`,
      { headers: this.headers }
    )
    return data.data
  }

  async addHostname(orgId: string, hostname: string): Promise<void> {
    await this.axiosClient.post(
      `/admin/org/${orgId}/analytics-settings/hostnames`,
      { hostname },
      { headers: this.headers }
    )
  }

  async removeHostname(orgId: string, hostname: string): Promise<void> {
    await this.axiosClient.delete(
      `/admin/org/${orgId}/analytics-settings/hostnames/${encodeURIComponent(hostname)}`,
      { headers: this.headers }
    )
  }

  async regenerateKey(orgId: string): Promise<RegenerateKeyResponse> {
    const { data } = await this.axiosClient.post<{ data: RegenerateKeyResponse }>(
      `/admin/org/${orgId}/analytics-settings/regenerate-key`,
      {},
      { headers: this.headers }
    )
    return data.data
  }
}
