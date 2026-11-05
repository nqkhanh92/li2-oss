export const isDev = process.env.NEXT_PUBLIC_APP_ENV === 'development'

export const CONVERSIONS_API_BASE_URL = isDev
  ? 'https://example.com/api/v1'
  : 'https://api.li2.ai/api/v1'
