import axios, { AxiosError, AxiosRequestConfig, isAxiosError } from 'axios'
import { useTimeZoneStore } from '../stores/time-zone.store'
import { queryClient } from './react-query'
import { useOrganizationStore } from '../stores/organization-store'
import { validate } from 'uuid'

/** Detect PlanError 403s — reusable across interceptors, query retry, and components */
export function isPlanGateError(error: unknown): boolean {
  if (!isAxiosError(error)) return false
  const key = (error.response?.data as any)?.i18nMessage?.key as string | undefined
  return error.response?.status === 403 && !!key?.startsWith('common:messages.error.plan_error')
}

export const axiosApiInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor to replace org_slug with org_id in URLs and add x-org-slug header
axiosApiInstance.interceptors.request.use((config) => {
  const { organization } = useOrganizationStore.getState()

  // Replace org_slug with org_id if URL contains slug (convert slug back to ID for API)
  if (organization?.org_slug && organization?.id && config.url) {
    // Extract the org identifier from the URL (handles /api/organizations/ or /organizations/)
    const orgMatch = config.url.match(/\/organizations\/([^/?]+)/)
    if (orgMatch && orgMatch[1]) {
      const orgIdentifier = orgMatch[1]
      // Only replace if it's a slug (not a UUID)
      if (!validate(orgIdentifier) && orgIdentifier === organization.org_slug) {
        // Replace all occurrences of the slug with the ID
        config.url = config.url.replace(
          new RegExp(`/organizations/${organization.org_slug}(/|\\?|$)`, 'g'),
          `/organizations/${organization.id}$1`
        )
      }
    }
  }

  return config
})

axiosApiInstance.interceptors.request.use((config) => {
  const timezone = useTimeZoneStore.getState()
  if (timezone.timezone) {
    config.headers['x-timezone'] = timezone.timezone
  }
  return config
})

let refreshTokenPromise: Promise<any> | null = null

axiosApiInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (!error.response) return Promise.reject(error)

    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean
    }
    const status = error.response.status

    if (
      ![401, 403].includes(status) ||
      isPlanGateError(error) ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      // Reuse the same promise if refresh is already in progress
      if (!refreshTokenPromise) {
        refreshTokenPromise = queryClient
          .fetchQuery({
            queryKey: ['refreshToken'],
            queryFn: async () => {
              const response = await axiosApiInstance.post('/auth/refresh')
              return response.data
            },
            staleTime: 0,
          })
          .finally(() => {
            refreshTokenPromise = null
          })
      }

      await refreshTokenPromise
      return axiosApiInstance(originalRequest)
    } catch (refreshError) {
      window.location.href = '/auth/login'
      return Promise.reject(refreshError)
    }
  }
)

export const axiosShlinkApiInstance = axios.create({
  baseURL: process.env.SHLINK_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const axiosMapboxApiInstance = axios.create({
  baseURL: 'https://api.mapbox.com',
  headers: {
    'Content-Type': 'application/json',
  },
})

axiosMapboxApiInstance.interceptors.request.use((config) => {
  config.params = {
    ...config.params,
    access_token: process.env.NEXT_PUBLIC_MAPBOX_API_KEY,
  }
  return config
})
