'use client'

import { notFound, useParams } from 'next/navigation'
import { StaticQrForm } from '@/features/touch-points/components/static-qr/static-qr-form'
import { useGetStaticQr } from '@/features/touch-points/hooks/static-qr/queries'
import QrCustomizeProvider from '@/shared/providers/qr-customize-provider'
import { QR_CUSTOMIZE_DEFAULT_OPTIONS } from '@/features/touch-points/constants'
import { Loader2Icon } from 'lucide-react'

export const StaticQrEditView = () => {
  const { org_id, static_qr_id } = useParams<{ org_id: string; static_qr_id: string }>()
  const { data: item, isLoading } = useGetStaticQr(org_id, static_qr_id)

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2Icon className="animate-spin" />
      </div>
    )
  }

  if (!item) {
    notFound()
  }

  return (
    <QrCustomizeProvider
      initialValues={(item.qr_customize_options as any) ?? QR_CUSTOMIZE_DEFAULT_OPTIONS}
    >
      <StaticQrForm mode="edit" item={item} />
    </QrCustomizeProvider>
  )
}
