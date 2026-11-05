import type { Options } from 'qr-code-styling'

export type StaticQrType = 'text' | 'url' | 'wifi'

export type StaticQrWifiPayload = {
  ssid: string
  password?: string
  security?: 'WPA' | 'WEP' | 'nopass'
  hidden?: boolean
}

export type StaticQrPayload = {
  type: StaticQrType
  text?: string
  url?: string
  wifi?: StaticQrWifiPayload
}

export type StaticQrItem = {
  id: string
  org_id: string
  name: string
  payload: StaticQrPayload
  qr_customize_options?: Options
  created_at: string
  updated_at: string
}
