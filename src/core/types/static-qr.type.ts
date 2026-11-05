import { Tables, TablesInsert, TablesUpdate } from '@/shared/types/database.types'

export type StaticQr = Tables<'static_qr'>
export type StaticQrInsert = TablesInsert<'static_qr'>
export type StaticQrUpdate = TablesUpdate<'static_qr'>

// Payload types
export type StaticQrType = 'text' | 'url' | 'wifi'

export interface TextPayload {
  type: 'text'
  text: string
}

export interface UrlPayload {
  type: 'url'
  url: string
}

export interface WifiPayload {
  type: 'wifi'
  wifi: {
    ssid: string
    password?: string
    security?: 'WPA' | 'WEP' | 'nopass'
    hidden?: boolean
  }
}

export type StaticQrPayload = TextPayload | UrlPayload | WifiPayload

// Extended type with typed payload
export interface StaticQrWithPayload extends Omit<StaticQr, 'payload'> {
  payload: StaticQrPayload
}
