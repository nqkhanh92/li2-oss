'use client'

import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Copy, Download } from 'lucide-react'
import { toast } from 'sonner'
import type { Options } from 'qr-code-styling'

import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { DownloadQrPopover, QrRenderWithRef, type QrRenderRef } from '@/features/bootstrap/components/qr-render'
import { getQrDefaultOptions } from '@/features/touch-points/constants'

interface ShortLinkCreatedDialogProps {
  shortUrl: string
  qrOptions?: Options | null
  onClose: () => void
}

export const ShortLinkCreatedDialog = ({
  shortUrl,
  qrOptions,
  onClose,
}: ShortLinkCreatedDialogProps) => {
  const { t } = useTranslation(['touchpoint', 'common'])
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<QrRenderRef>(null)

  const mergedQrOptions = useMemo<Options>(() => {
    const defaultOptions = getQrDefaultOptions(`${shortUrl}?t=1`)
    if (!qrOptions || Object.keys(qrOptions).length === 0) return defaultOptions
    return {
      ...defaultOptions,
      ...qrOptions,
      data: defaultOptions.data,
      qrOptions: {
        ...defaultOptions.qrOptions,
        ...(qrOptions.qrOptions ?? {}),
        typeNumber: defaultOptions.qrOptions?.typeNumber,
        errorCorrectionLevel: defaultOptions.qrOptions?.errorCorrectionLevel,
      },
    }
  }, [shortUrl, qrOptions])

  const handleCopyUrl = () => {
    try {
      navigator.clipboard.writeText(shortUrl)
      setCopied(true)
      toast.success(t('common:toast.title_copy'), {
        description: t('common:toast.description_copy', { field: 'URL' }),
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('common:messages.error.some_error'))
    }
  }

  return (
    <CustomDialogV2
      initialOpen
      size="xs"
      title={t('touchpoint:create_success_dialog.title')}
      description={t('touchpoint:create_success_dialog.description')}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <div className="flex flex-col gap-5 py-3">
        <div className="space-y-1.5">
          <p className="text-s font-medium text-slate-600">{t('common:label.short_link')}</p>
          <Input
            value={shortUrl}
            readOnly
            className="font-mono text-s"
            endAdornment={
              copied ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              ) : (
                <Copy
                  onClick={handleCopyUrl}
                  className="h-4 w-4 cursor-pointer shrink-0 text-slate-400 hover:text-slate-700 transition-colors"
                />
              )
            }
          />
        </div>

        <div className="flex flex-col items-center gap-3">
          <QrRenderWithRef ref={qrRef} qrOptions={mergedQrOptions} size={160} border />
          <div className="flex gap-2 w-full">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1"
              iconLeft={<Copy className="w-3.5 h-3.5" />}
              onClick={() => qrRef.current?.handleCopyQr()}
            >
              {t('common:buttons.copy_qr')}
            </Button>
            <DownloadQrPopover
              qrOptions={mergedQrOptions}
              popoverAlign="end"
              button={
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  iconLeft={<Download className="w-3.5 h-3.5" />}
                >
                  {t('common:buttons.download_qr')}
                </Button>
              }
            />
          </div>
        </div>

        <Button type="button" size="sm" className="w-full" onClick={onClose}>
          {t('touchpoint:create_success_dialog.continue')}
        </Button>
      </div>
    </CustomDialogV2>
  )
}
