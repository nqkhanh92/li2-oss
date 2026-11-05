import { useMemo } from 'react'
import { z } from 'zod'
import { staticQrFormSchema } from '@/shared/schemas/static-qr'
import { StaticQrType } from '../components/static-qr/static-qr.types'

type FormValues = z.infer<typeof staticQrFormSchema>

export const buildPayload = (values: FormValues) => {
  const type = values.type as StaticQrType
  if (type === 'wifi') {
    return {
      type,
      wifi: {
        ssid: values.wifi_ssid ?? '',
        password: values.wifi_password ?? '',
        security: values.wifi_security ?? (values.wifi_password ? 'WPA' : 'nopass'),
        hidden: Boolean(values.wifi_hidden),
      },
    } as const
  }

  if (type === 'url') {
    return { type, url: values.url ?? '' } as const
  }

  return { type, text: values.text ?? '' } as const
}

export const payloadToQrData = (payload: ReturnType<typeof buildPayload>) => {
  if (payload.type === 'wifi') {
    const ssid = payload.wifi?.ssid ?? ''
    const password = payload.wifi?.password ?? ''
    const security = payload.wifi?.security ?? (password ? 'WPA' : 'nopass')
    const hidden = payload.wifi?.hidden ? 'true' : 'false'
    return `WIFI:T:${security};S:${ssid};P:${password};H:${hidden};;`
  }
  if (payload.type === 'url') {
    return payload.url ?? ''
  }
  return payload.text ?? ''
}

export const getDefaultQrData = (type: StaticQrType, t: any) => {
  if (type === 'text') {
    return t('common:text.li2_description', {
      defaultValue: 'Li2 - AI-powered short link platform',
    })
  }
  if (type === 'url') {
    return 'https://li2.ai'
  }
  if (type === 'wifi') {
    return 'WIFI:T:WPA;S:Li2-Guest;P:;H:false;;'
  }
  return 'https://li2.ai'
}

export const useStaticQrData = (qrRelevantFields: any[], t: any) => {
  return useMemo(() => {
    const payload = buildPayload({
      type: qrRelevantFields[0],
      text: qrRelevantFields[1],
      url: qrRelevantFields[2],
      wifi_ssid: qrRelevantFields[3],
      wifi_password: qrRelevantFields[4],
      wifi_security: qrRelevantFields[5],
      wifi_hidden: qrRelevantFields[6],
    } as FormValues)
    let data = payloadToQrData(payload)

    if (!data || data.trim().length === 0) {
      data = getDefaultQrData(qrRelevantFields[0] as StaticQrType, t)
    }

    return data
  }, [qrRelevantFields, t])
}
