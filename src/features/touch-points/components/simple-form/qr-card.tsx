import { QrRenderRef, QrRenderWithRef } from '@/features/bootstrap/components/qr-render'
import { useRef } from 'react'
import { FileExtension, Options } from 'qr-code-styling'
import { Button } from '@/shared/components/ui/button'
import { CopyIcon, DownloadIcon, Link2Icon, MoveRightIcon, QrCodeIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

export const QRCard = ({
  size = 120,
  qrOptions,
  link,
  onViewDetail,
}: {
  size?: number
  qrOptions: Options
  link?: string
  onViewDetail?: () => void
}) => {
  const ref = useRef<QrRenderRef>(null)
  const { t } = useTranslation()

  const handleDownload = () => {
    ref?.current?.handleDownloadQr('png' as FileExtension, size)
  }

  const handleCopyQr = () => {
    ref?.current?.handleCopyQr()
  }

  const handleCopyLink = () => {
    if (!link) return
    navigator.clipboard.writeText(link)
    toast.success(t('common:toast.title_copy'), {
      description: t('common:toast.description_copy', {
        field: '$t(common:label.link)',
      }),
      id: 'copy-link',
    })
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Success message */}
      <p className="text-[15px] font-medium leading-[22px] text-green-600 text-center">
        {t('touchpoint:simple_form.qr_created_success', {
          defaultValue: 'All set! Start sharing your QR code',
        })}
      </p>

      {/* Body */}
      <div className="flex flex-col gap-4 items-center py-6">
        {/* Link field */}
        {link && (
          <div className="bg-slate-100 flex gap-2 items-center px-6 py-3 h-10 rounded-[6px]">
            <Link2Icon className="size-[18px] shrink-0 text-slate-500" />
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-medium text-[#437ef7] truncate max-w-[200px]"
            >
              {link}
            </a>
            <button type="button" onClick={handleCopyLink} className="shrink-0">
              <CopyIcon className="size-[18px] text-slate-500" />
            </button>
          </div>
        )}

        {/* QR code */}
        <div
          className="bg-white rounded-[15px] shadow-[0px_1.6px_3.2px_0px_rgba(5,27,68,0.08)] flex items-center justify-center overflow-hidden"
          style={{ padding: 12 }}
        >
          <QrRenderWithRef
            qrClassName="rounded-[8px]"
            size={size}
            qrOptions={qrOptions}
            ref={ref}
            border={false}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 w-full px-4">
          <Button
            type="button"
            variant="secondary"
            iconLeft={<QrCodeIcon />}
            onClick={handleCopyQr}
            className="flex-1"
          >
            {t('common:buttons.copy_qr', { defaultValue: 'Copy QR' })}
          </Button>
          <Button
            type="button"
            variant="default"
            iconLeft={<DownloadIcon />}
            onClick={handleDownload}
            className="flex-1"
          >
            {t('common:buttons.download_qr', { defaultValue: 'Download QR' })}
          </Button>
        </div>
      </div>

      {/* View detail */}
      {onViewDetail && (
        <div className="border-t border-slate-300 pt-4 flex flex-col gap-1 items-center">
          <p className="text-sm text-slate-500 text-center">
            {t('touchpoint:simple_form.view_detail_hint', {
              defaultValue: 'Want to customize or track performance?',
            })}
          </p>
          <Button
            type="button"
            variant="tertiary"
            iconRight={<MoveRightIcon />}
            onClick={onViewDetail}
            className="text-s! py-0! h-5"
          >
            {t('common:buttons.view_detail', { defaultValue: 'View detail' })}
          </Button>
        </div>
      )}
    </div>
  )
}
