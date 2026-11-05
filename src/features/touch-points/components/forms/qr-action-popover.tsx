import React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Button } from '@/shared/components/ui/button'
import { Separator } from '@/shared/components/ui/separator'
import { Badge } from '@/shared/components/ui/badge'
import { DownloadIcon, PaletteIcon } from 'lucide-react'
import CustomizeQrCardContainer from '../customize-qr/qr-card-customize'
import { ExtendedOptions } from '../customize-tool/qr-tool'
import { FileExtension } from 'qr-code-styling'
import { QrDownloadOption } from '@/features/touch-points/constants/qr'
import { useTranslation } from 'react-i18next'
import { useQrContext } from '@/shared/providers/qr-customize-provider'
import { QrCodePreviewRef } from '../customize-tool/qr-code-preview'

interface QrActionsPopoverProps {
  qrRef: React.RefObject<QrCodePreviewRef>
  shortUrl: string
  tp_name: string
  availableQrOptions: QrDownloadOption[]
  handleDownloadQrCode: (
    qrOptions: ExtendedOptions,
    tp_name: string,
    short_url: string,
    options: { fileType: FileExtension; fileSize: number }
  ) => void
  close: () => void
}

/**
 * A component that displays a popover with options to customize and download a QR code.
 *
 * @param qrRef - a reference to the QR card component
 * @param qrOptions - the current QR code options
 * @param shortUrl - the short URL being encoded in the QR code
 * @param tp_name - the name of the touchpoint being customized
 * @param availableQrOptions - the available download options for the QR code
 * @param handleDownloadQrCode - a function to handle downloading the QR code
 * @param close - a function to close the popover
 */
export const QrActionsPopover: React.FC<QrActionsPopoverProps> = ({
  qrRef,
  shortUrl,
  tp_name,
  availableQrOptions,
  handleDownloadQrCode,
  close,
}) => {
  const { t } = useTranslation()
  const { qrOptions } = useQrContext()
  return (
    <div className="flex gap-4 w-full">
      {/* Customize QR Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            type="button"
            className="flex items-center gap-1 font-normal md:w-fit w-full"
          >
            <PaletteIcon className="w-5! h-5! justify-center items-center rounded-[4px]" />
            <span className="flex justify-start text-sm">{t('common:buttons.customize')}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="bg-background rounded-[8px] px-4 py-3 border border-slate-200"
          align="start"
        >
          <CustomizeQrCardContainer tp_name={tp_name} close={close} size={168} ref={qrRef} />
        </PopoverContent>
      </Popover>

      {/* Download QR Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            type="button"
            className="flex items-center gap-1 font-normal md:w-fit w-full"
          >
            <DownloadIcon className="w-5! h-5!" />
            <span className="flex justify-start text-sm">{t('common:buttons.download')}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="bg-background rounded-[8px] px-4 py-3 border border-slate-200"
          align="start"
        >
          <div className="grid grid-cols-1 gap-2">
            {availableQrOptions.map((option) => (
              <div
                key={option.id}
                className="flex flex-col w-full"
                onClick={() =>
                  handleDownloadQrCode(qrOptions, tp_name, shortUrl, {
                    fileType: option.fileType,
                    fileSize: option.fileSize,
                  })
                }
              >
                {option.spacer && <Separator className="mb-2" />}
                <div className="flex gap-2 px-2 py-1 items-center cursor-pointer hover:bg-slate-100 hover:rounded-[8px]">
                  <div className="text-sm font-medium text-slate-700 uppercase">
                    {option.fileType}
                  </div>
                  {option.fileSize && option.fileType !== 'svg' && (
                    <div className="text-sm text-slate-500">
                      {option.fileSize} x {option.fileSize}
                    </div>
                  )}
                  {option.note && (
                    <Badge
                      variant="outline"
                      className="text-[10px] italic font-medium leading-[16px] text-blue-600 py-[2px] px-2 gap-[10px] flex items-center justify-center rounded-full bg-blue-50 border-none outline-hidden shadow-none"
                    >
                      {t(option.note)}
                    </Badge>
                  )}
                  {option.sizeInText && (
                    <div className="text-sm text-slate-500">{option.sizeInText}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
