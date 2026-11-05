'use client'
import { QrPatternCustomize } from './qr-pattern-customize'
import { useEffect, forwardRef } from 'react'
import { useQrContext } from '@/shared/providers/qr-customize-provider'
import { QrColorCustomize } from './qr-color-customize'
import { FileExtension, Options } from 'qr-code-styling'
import { RefreshCcw } from 'lucide-react'
import { updateQrCustomizeOptionsSchema } from '@/shared/schemas/touch-points'
import { useFormContext } from 'react-hook-form'
import { z } from 'zod'
import { QR_CUSTOMIZE_DEFAULT_OPTIONS } from '@/features/touch-points/constants'

interface QrCodePreviewRef {
  download: (
    tp_name: string,
    short_url: string,
    fileType?: FileExtension,
    fileSize?: number
  ) => void
}

export interface ExtendedOptions extends Options {
  rawData?: string
  frame?: string
}
interface CustomizeQrCardToolProps {
  size?: number
  close: () => void
}

export const CustomizeQrCardTool = forwardRef<QrCodePreviewRef, CustomizeQrCardToolProps>((ref) => {
  const { setValue } = useFormContext<z.infer<typeof updateQrCustomizeOptionsSchema>>()
  const { qrOptions, setQrOptions } = useQrContext()
  return (
    <div className="flex flex-col gap-6">
      <div className="w-full flex flex-col gap-4">
        <QrPatternCustomize />
        <QrColorCustomize pattern="all" color={qrOptions.dotsOptions?.color || '#000000'} />
      </div>
      <div
        className="flex items-center gap-1 text-primary text-sm font-normal cursor-pointer hover:text-secondary"
        onClick={() => {
          setQrOptions({
            ...QR_CUSTOMIZE_DEFAULT_OPTIONS,
            ...{ data: qrOptions.data },
          })
          setValue(
            'qr_customize_options',
            {
              ...QR_CUSTOMIZE_DEFAULT_OPTIONS,
              ...{ data: qrOptions.data },
            },
            {
              shouldDirty: true,
            }
          )
        }}
      >
        <RefreshCcw className="w-5 h-5" /> Reset to Default Style
      </div>
    </div>
  )
})
