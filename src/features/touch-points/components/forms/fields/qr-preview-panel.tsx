import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { QRCard } from '../../simple-form/qr-card'
import { QrRenderRef, QrRenderWithRef } from '@/features/bootstrap/components/qr-render'
import { QrCustomizeFormElementsDialog } from '../../simple-form/qr-customize-form-elements-dialog'
import { TouchPoint } from '@/core/types/touch-point.type'

interface QrPreviewPanelProps {
  qrOptions: any
  createdTouchPoint: Pick<TouchPoint, 'id' | 'short_url' | 'qr_customize_options'> | null
  qrSize?: number
  onQrOptionsUpdate?: (qrOptions: any, qrLogo?: string | File) => void
}

/**
 * QR code preview panel with customization dialog
 */
export const QrPreviewPanel = ({
  qrOptions,
  createdTouchPoint,
  qrSize = 186,
  onQrOptionsUpdate,
}: QrPreviewPanelProps) => {
  const { t } = useTranslation(['common'])
  const qrRef = useRef<QrRenderRef>(null)

  return (
    <div className="flex flex-col gap-6 items-center">
      {createdTouchPoint && createdTouchPoint.short_url ? (
        <QRCard size={qrSize} qrOptions={createdTouchPoint?.qr_customize_options as any} />
      ) : (
        <motion.div className="flex flex-col gap-6 items-center" initial={{ opacity: 1 }}>
          <div className="flex flex-col gap-[2px]">
            <label className="text-lg font-semibold text-foreground text-center">
              {t('common:text.preview')}
            </label>
            <span className="text-sm text-slate-500 text-center">
              {t('common:text.preview_desc')}
            </span>
          </div>
          <div className="flex justify-center items-center rounded-xl p-4 bg-white w-fit shadow-[0_2.667px_5.333px_0_rgba(5,27,68,0.08)]">
            <QrRenderWithRef size={qrSize} qrOptions={qrOptions} ref={qrRef} border={false} />
          </div>
        </motion.div>
      )}
      <QrCustomizeFormElementsDialog
        initQrOptions={qrOptions}
        onUpdate={(values) => {
          onQrOptionsUpdate?.(values.qr_customize_options, values.qr_logo_image)
        }}
      />
    </div>
  )
}
