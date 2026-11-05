import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/components/ui/drawer'
import { Button } from '@/shared/components/ui/button'
import { CopyIcon, DownloadIcon, Link2Icon, MoveRightIcon, QrCodeIcon } from 'lucide-react'
import { CapaIcon } from '@/shared/components/icons/capa-icon'
import { AllTouchPointVariants } from '@/features/touch-points/types'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useRef } from 'react'
import { QrRenderRef, QrRenderWithRef } from '@/features/bootstrap/components/qr-render'
import { Options, FileExtension } from 'qr-code-styling'
import { ConfettiCanvas } from '@/shared/components/ui/confetti-canvas'

type GeneratedDrawerProps = {
  open: boolean
  setOpen: (open: boolean) => void
  generatedLink: string
  type: AllTouchPointVariants
  qrOptions?: Options
  onViewDetail?: () => void
  touchPointId?: string
}
export const GeneratedDrawer = ({
  open,
  setOpen,
  generatedLink,
  type,
  qrOptions,
  onViewDetail,
  touchPointId,
}: GeneratedDrawerProps) => {
  const { t } = useTranslation()
  const ref = useRef<QrRenderRef>(null)

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink)
    toast.success(t('common:toast.title_copy'), {
      description: t('common:toast.description_copy', {
        field: '$t(common:label.link)',
      }),
      id: 'copy-link',
    })
  }

  const handleDownload = () => {
    ref?.current?.handleDownloadQr('png' as FileExtension, 151)
  }

  const handleCopyQr = () => {
    ref?.current?.handleCopyQr()
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent>
        {touchPointId && <ConfettiCanvas key={touchPointId} />}
        <DrawerHeader>
          <DrawerTitle>
            <div className="flex justify-center items-center gap-2 border-b border-slate-300 pb-2">
              <CapaIcon />
              <span className="text-lg font-semibold text-foreground">
                {t('common:messages.success.created_successfully')}
              </span>
            </div>
          </DrawerTitle>
          <DrawerDescription asChild>
            <div className="flex flex-col gap-4 mt-4 mb-6">
              {type === AllTouchPointVariants.LINK && (
                <>
                  <p className="text-sm font-medium text-green-600 text-center">
                    {t('touchpoint:simple_form.link_created_success', {
                      defaultValue: 'All set! Start sharing your link and QR code',
                    })}
                  </p>
                  <div className="bg-slate-50 flex flex-col gap-4 items-center py-6 rounded-[8px] w-full">
                    <a
                      href={generatedLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-medium text-semantic-info truncate max-w-[280px] block"
                    >
                      {generatedLink}
                    </a>
                    <Button
                      type="button"
                      variant="default"
                      iconLeft={<CopyIcon />}
                      onClick={handleCopyLink}
                    >
                      {t('common:buttons.copy', { defaultValue: 'Copy' })}
                    </Button>
                  </div>
                </>
              )}

              {type === AllTouchPointVariants.QR && (
                <>
                  <p className="text-[15px] font-medium leading-[22px] text-green-600 text-center">
                    {t('touchpoint:simple_form.qr_created_success', {
                      defaultValue: 'All set! Start sharing your QR code',
                    })}
                  </p>
                  <div className="flex flex-col gap-4 items-center py-2">
                    {generatedLink && (
                      <div className="bg-slate-100 flex gap-2 items-center px-6 py-3 h-10 rounded-[6px]">
                        <Link2Icon className="size-[18px] shrink-0 text-slate-500" />
                        <a
                          href={generatedLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base font-medium text-[#437ef7] truncate max-w-[200px]"
                        >
                          {generatedLink}
                        </a>
                        <button type="button" onClick={handleCopyLink} className="shrink-0">
                          <CopyIcon className="size-[18px] text-slate-500" />
                        </button>
                      </div>
                    )}
                    <div
                      className="bg-white rounded-[15px] shadow-[0px_1.6px_3.2px_0px_rgba(5,27,68,0.08)] flex items-center justify-center overflow-hidden"
                      style={{ padding: 12 }}
                    >
                      <QrRenderWithRef
                        qrClassName="rounded-[8px]"
                        size={151}
                        qrOptions={qrOptions}
                        ref={ref}
                        border={false}
                      />
                    </div>
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
                </>
              )}

              {onViewDetail && (
                <div className="border-t border-slate-300 pt-4 flex flex-col gap-1 items-center">
                  <p className="text-s text-slate-500 text-center">
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
          </DrawerDescription>
        </DrawerHeader>
      </DrawerContent>
    </Drawer>
  )
}
