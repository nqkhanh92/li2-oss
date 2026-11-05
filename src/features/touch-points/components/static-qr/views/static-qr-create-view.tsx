'use client'

import { StaticQrForm } from '@/features/touch-points/components/static-qr/static-qr-form'
import QrCustomizeProvider from '@/shared/providers/qr-customize-provider'
import { QR_CUSTOMIZE_DEFAULT_OPTIONS } from '@/features/touch-points/constants'

export const StaticQrCreateView = () => {
  return (
    <QrCustomizeProvider initialValues={QR_CUSTOMIZE_DEFAULT_OPTIONS}>
      <StaticQrForm mode="create" />
    </QrCustomizeProvider>
  )
}
