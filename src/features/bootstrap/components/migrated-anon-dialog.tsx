import { TouchPoint } from '@/core/types/touch-point.type'
import { Button } from '@/shared/components/ui/button'
import QrCustomizeProvider from '@/shared/providers/qr-customize-provider'
import { touchPointFormSchema } from '@/shared/schemas/touch-points'
import { AllTouchPointVariants } from '@/features/touch-points/types'
import { CheckCircle, CopyIcon, DownloadIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useRef } from 'react'
import { z } from 'zod'
import { QrRender, QrRenderRef, QrRenderWithRef } from './qr-render'
import { Options } from 'qr-code-styling'
import { Input } from '@/shared/components/ui/input'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'

type MigratedAnonDialogProps = {
  orgId: string
  migratedCount: number
  migratedAnonTp: TouchPoint[]
  migratedUnsavedTp: TouchPoint[]
}
export const MigratedAnonDialog = ({
  orgId,
  migratedCount,
  migratedAnonTp,
  migratedUnsavedTp,
}: MigratedAnonDialogProps) => {
  const router = useRouter()
  const tp: {
    type: keyof typeof AllTouchPointVariants
    data: TouchPoint
  } = useMemo(() => {
    let tp = null
    if (migratedUnsavedTp.length > 0) {
      tp = migratedUnsavedTp[0]
    } else {
      tp = migratedAnonTp[0]
    }

    if (tp.variants_content?.QR?.enabled) return { type: AllTouchPointVariants.QR, data: tp }
    if (tp.variants_content?.NFC?.enabled) return { type: AllTouchPointVariants.NFC, data: tp }
    if (tp.variants_content?.WIFI?.enabled) return { type: AllTouchPointVariants.WIFI, data: tp }
    return { type: AllTouchPointVariants.LINK, data: tp }
  }, [migratedAnonTp, migratedUnsavedTp])

  const ref = useRef<QrRenderRef>(null)
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard', {
      id: 'copy',
    })
  }

  const { t } = useTranslation()

  return (
    <CustomDialogV2
      size="xs"
      title={
        <div className="flex items-center space-x-3 justify-center">
          <div className="shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-green-600">
            {t('common:label.synchronization_complete')}
          </h3>
        </div>
      }
      initialOpen={true}
    >
      {({ setOpen }) => (
        <div>
          <div className="flex flex-col mt-6 gap-6">
            {tp.type === AllTouchPointVariants.QR && (
              <div className="flex flex-col gap-2">
                <QrRenderWithRef
                  size={151}
                  qrOptions={tp.data.qr_customize_options as Options}
                  ref={ref}
                  border={false}
                  className="p-[14.4px]"
                />
                <div className="flex justify-center">
                  <Button
                    size="default"
                    variant="secondary"
                    onClick={() => {
                      ref.current?.handleDownloadQr()
                    }}
                  >
                    <DownloadIcon /> {t('common:actions.download')}
                  </Button>
                </div>
              </div>
            )}
            {tp.type === AllTouchPointVariants.LINK && (
              <div className="bg-slate-100 rounded-[8px] p-4 gap-3 flex flex-col">
                <a
                  className="text-center w-full text-lg font-semibold leading-[20px] text-primary"
                  href={tp.data.short_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tp.data.short_url}
                </a>
                <div className="flex justify-center">
                  <Button
                    className="px-4 py-2 gap-[6px]"
                    type="button"
                    size="default"
                    variant="secondary"
                    onClick={() => handleCopy(tp.data.short_url)}
                  >
                    <CopyIcon className="w-5! h-5!" />
                    {t('touchpoint:buttons.copy_field', { field: t('common:label.link') })}
                  </Button>
                </div>
              </div>
            )}
            <p className="text-center text-gray-600 text-sm">
              {t('common:messages.success.migrated_count', { migratedCount })}
            </p>
          </div>
          <div className="flex items-center justify-center gap-4 mt-4">
            <Button size="default" variant="secondary" onClick={() => setOpen(false)}>
              {t('common:actions.stay_here')}
            </Button>
            <Button
              size="default"
              onClick={() => {
                router.push(`/org/${orgId}/short-links`)
                setOpen(false)
              }}
            >
              {t('common:actions.go_to_field_list', {
                field:
                  tp.type === AllTouchPointVariants.QR
                    ? t('common:label.qr_code')
                    : t('common:label.short_link'),
              })}
            </Button>
          </div>
        </div>
      )}
    </CustomDialogV2>
  )
}
