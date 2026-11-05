export enum TouchPointVariants {
  // LINK = "LINK",
  QR = 'QR',
  NFC = 'NFC',
  WIFI = 'WIFI',
}
export enum AllTouchPointVariants {
  LINK = 'LINK',
  QR = 'QR',
  NFC = 'NFC',
  WIFI = 'WIFI',
}
export const mappingTouchPointVariantInteractions = {
  [AllTouchPointVariants.LINK]: 'dashboard:interaction_channels.short_link',
  [AllTouchPointVariants.QR]: 'dashboard:interaction_channels.scan',
  [AllTouchPointVariants.NFC]: 'dashboard:interaction_channels.tap',
  [AllTouchPointVariants.WIFI]: 'dashboard:interaction_channels.wifi_access',
}
export const mappingTouchPointVariants = {
  // 0: TouchPointVariants.LINK,
  1: TouchPointVariants.QR,
  // 2: TouchPointVariants.NFC,
  // 3: TouchPointVariants.WIFI,
}

export type TouchPointVariantsContent = {
  [key in TouchPointVariants]: {
    enabled: boolean
    content_value: string
    options?: Record<string, any>
  }
}

export enum TouchPointContentType {
  URL = 'URL',
  ARTIFACT = 'ARTIFACT',
}
