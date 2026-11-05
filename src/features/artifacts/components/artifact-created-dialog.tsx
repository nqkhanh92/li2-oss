'use client'

import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Copy, Download } from 'lucide-react'
import { toast } from 'sonner'
import type { Options } from 'qr-code-styling'

import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import {
  DownloadQrPopover,
  QrRenderWithRef,
  type QrRenderRef,
} from '@/features/bootstrap/components/qr-render'
import { getQrDefaultOptions } from '@/features/touch-points/constants'
import type { ArtifactAccessMode } from '@/core/types/artifact.type'

import { getArtifactAccessView } from '../utils/artifact-access'
import { ArtifactPasswordReveal } from './artifact-password-reveal'

interface ArtifactCreatedDialogProps {
  shortUrl: string
  /** Chế độ xem vừa chọn (M2.1). Mật khẩu kèm giá trị — LẦN DUY NHẤT nó hiện ra. */
  accessMode?: ArtifactAccessMode
  password?: string
  onClose: () => void
}

export const ArtifactCreatedDialog = ({
  shortUrl,
  accessMode = 'public',
  password,
  onClose,
}: ArtifactCreatedDialogProps) => {
  const { t } = useTranslation(['artifact', 'common'])
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<QrRenderRef>(null)

  const qrOptions = useMemo<Options>(() => getQrDefaultOptions(`${shortUrl}?t=1`), [shortUrl])

  const handleCopyUrl = () => {
    try {
      navigator.clipboard.writeText(shortUrl)
      setCopied(true)
      toast.success(t('common:toast.title_copy'), {
        description: t('common:toast.description_copy', { field: 'URL' }),
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('artifact:errors.generic'))
    }
  }

  return (
    <CustomDialogV2
      initialOpen
      size="xs"
      title={t('artifact:created_dialog.title')}
      description={t('artifact:created_dialog.description')}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <div className="flex flex-col gap-5 py-3">
        <div className="space-y-1.5">
          <p className="text-s font-medium text-slate-600">{t('artifact:created_dialog.link')}</p>
          <Input
            value={shortUrl}
            readOnly
            className="font-mono text-s"
            endAdornment={
              copied ? (
                <CheckCircle2 className="h-4 w-4 text-semantic-success shrink-0" />
              ) : (
                <Copy
                  onClick={handleCopyUrl}
                  className="h-4 w-4 cursor-pointer shrink-0 text-slate-400 hover:text-slate-700 transition-colors"
                />
              )
            }
          />
        </div>

        {accessMode !== 'public' && (
          <p className="text-xs text-slate-600" data-testid="created-access-mode">
            {t('artifact:access.created_mode', {
              mode: t(getArtifactAccessView(accessMode).labelKey),
            })}
          </p>
        )}
        {accessMode === 'password' && password && <ArtifactPasswordReveal password={password} />}

        <div className="flex flex-col items-center gap-3">
          <QrRenderWithRef ref={qrRef} qrOptions={qrOptions} size={160} border />
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
              qrOptions={qrOptions}
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
          {t('artifact:created_dialog.continue')}
        </Button>
      </div>
    </CustomDialogV2>
  )
}
