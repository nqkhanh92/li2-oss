import packageJson from '@/../package.json'

export const appVersion = packageJson.version

interface OpenObserveConfig {
  clientToken: string
  applicationId: string
  site: string
  service: string
  env: string
  version: string
  organizationIdentifier: string
  insecureHTTP: boolean
  apiVersion: string
}

export const openObserveConfig: OpenObserveConfig = {
  clientToken: process.env.NEXT_PUBLIC_OPENOBSERVE_CLIENT_TOKEN || '',
  applicationId: process.env.NEXT_PUBLIC_OPENOBSERVE_APPLICATION_ID || 'li2-app',
  site: process.env.NEXT_PUBLIC_OPENOBSERVE_SITE || 'localhost:5080',
  service: process.env.NEXT_PUBLIC_OPENOBSERVE_SERVICE || 'li2-app',
  env: process.env.NEXT_PUBLIC_APP_ENV || 'development',
  version: appVersion,
  organizationIdentifier: 'default',
  insecureHTTP: false,
  apiVersion: 'v1',
}

export const isOpenObserveEnabled = () => {
  return Boolean(!!openObserveConfig.clientToken && !!openObserveConfig.applicationId)
}
