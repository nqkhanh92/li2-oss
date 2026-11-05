import { Options, TypeNumber } from 'qr-code-styling'

/**
 * When true, QR variant is always enabled for every new touch point.
 * Change this flag to toggle the behavior app-wide.
 */
export const FORCE_QR_ENABLED = true

export const QR_CUSTOMIZE_DEFAULT_OPTIONS: Options = {
  width: 192,
  height: 192,
  data: 'https://li2.ai',
  image: 'https://supa.li2.ai/storage/v1/object/public/casdoor-logo/ftc/qr-logo-li2.png',
  type: 'svg',
  dotsOptions: {
    color: '#100D08',
    type: 'square',
  },
  qrOptions: {
    typeNumber: 5,
    errorCorrectionLevel: 'Q',
  },
  cornersSquareOptions: {
    type: 'square',
  },
  cornersDotOptions: {
    type: 'square',
  },
  imageOptions: {
    crossOrigin: 'anonymous',
    hideBackgroundDots: false,
    margin: 0,
    imageSize: 0.4,
  },
}
const optimizeType = {
  '11': 1,
  '20': 2,
  '32': 3,
  '46': 4,
  '60': 5,
  '74': 6,
  '86': 7,
  '108': 8,
  '130': 9,
  '151': 10,
  '177': 11,
  '203': 12,
  '241': 13,
  '258': 14,
  '292': 15,
  '322': 16,
  '364': 17,
  '394': 18,
  '442': 19,
  '482': 20,
  '509': 21,
}
export const getQrDefaultOptions = (qrUrl: string) => {
  let typeNumber = QR_CUSTOMIZE_DEFAULT_OPTIONS?.qrOptions?.typeNumber

  if (qrUrl.length > 60) {
    const thresholds = Object.keys(optimizeType)
      .map(Number)
      .sort((a, b) => a - b)

    for (let i = 0; i < thresholds.length; i++) {
      const currentThreshold = thresholds[i]
      const nextThreshold = thresholds[i + 1]

      if (qrUrl.length <= currentThreshold) {
        typeNumber = optimizeType[`${currentThreshold}` as keyof typeof optimizeType] as TypeNumber
        break
      } else if (!nextThreshold) {
        // If length exceeds all thresholds, use the last one
        typeNumber = optimizeType[`${currentThreshold}` as keyof typeof optimizeType] as TypeNumber
      }
    }
  }
  return {
    ...QR_CUSTOMIZE_DEFAULT_OPTIONS,
    data: qrUrl,
    qrOptions: { ...QR_CUSTOMIZE_DEFAULT_OPTIONS?.qrOptions, typeNumber },
  }
}
const size = {
  '1': 210,
  '2': 200,
  '3': 232,
  '4': 231,
  '5': 222,
  '6': 246,
  '7': 225,
  '8': 245,
  '9': 212,
  '10': 228,
  '11': 244,
  '12': 195,
  '13': 207,
  '14': 219,
  '15': 231,
  '16': 243,
  '17': 170,
  '18': 178,
  '19': 186,
  '20': 194,
  '21': 202,
}
export const getOptimizeSize = (typeNumber: number | string | undefined) => {
  if (!typeNumber) return size['21']
  const optimizeSize = size?.[`${typeNumber}` as keyof typeof size]

  return optimizeSize ?? size['21']
}
