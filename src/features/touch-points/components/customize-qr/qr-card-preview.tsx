import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { DownloadIcon } from 'lucide-react'
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from '@/shared/components/ui/select'
import { FileIcon, ImageIcon } from 'lucide-react'
import QRCodeStyling, { FileExtension } from 'qr-code-styling'
import { QrCodePreview, QrCodePreviewRef } from '../customize-tool/qr-code-preview'
import { useQrContext } from '@/shared/providers/qr-customize-provider'
import equal from 'fast-deep-equal'
import { useTranslation } from 'react-i18next'

const QRCardPreview = ({
  className = '',
  tp_name = 'qr_code',
}: {
  className?: string
  tp_name?: string
}) => {
  const qrPreviewRef = useRef<QrCodePreviewRef | null>(null)
  const { qrOptions } = useQrContext()
  const fileSizes = [512, 1024, 2048]
  const fileTypes: { type: FileExtension; icon: React.ElementType }[] = [
    {
      type: 'png',
      icon: ImageIcon,
    },
    {
      type: 'svg',
      icon: FileIcon,
    },
  ]
  const [fileType, setFileType] = useState<FileExtension>('png')
  const [fileSize, setFileSize] = useState<number>(512)

  useEffect(() => {
    if (qrOptions) {
      if (!equal(qrPreviewRef.current?.qrCode._options, qrOptions)) {
        qrPreviewRef.current?.qrCode.update(qrOptions)
      }
    }
  }, [qrOptions])

  const handleDownload = async () => {
    if (!qrOptions) return
    const downloadQr = new QRCodeStyling({
      ...qrOptions,
      width: fileSize,
      height: fileSize,
    })
    const tempDiv = document.createElement('div')
    document.body.appendChild(tempDiv)
    downloadQr.append(tempDiv)
    downloadQr.download({
      extension: fileType,
      name: tp_name,
    })
    tempDiv.remove()
  }
  const { t } = useTranslation()

  return (
    <div className={`w-full flex flex-col justify-center items-center gap-4`}>
      <div className={`${className}`}>
        <QrCodePreview ref={qrPreviewRef} />
      </div>
      <div className="flex flex-col justify-center items-center self-stretch gap-6 w-full">
        <div className="grid grid-cols-2 gap-4 w-full">
          <div className="flex flex-col gap-1">
            <div className="text-sm font-medium">Format:</div>
            <Select
              value={fileTypes.find((type) => type.type === fileType)?.type}
              onValueChange={(value) => setFileType(value as FileExtension)}
            >
              <SelectTrigger className="text-base font-normal border-none outline-hidden shadow-none bg-slate-100 text-slate-400 h-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fileTypes.map((type) => (
                  <SelectItem key={`format-${type?.type}`} value={type?.type.toString()}>
                    {type?.type.charAt(0).toUpperCase() + type?.type.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-sm font-medium">Size:</div>
            <Select
              value={fileSize?.toString()}
              onValueChange={(value) => setFileSize(Number(value))}
            >
              <SelectTrigger className="text-base font-normal border-none outline-hidden shadow-none bg-slate-100 text-slate-400 h-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fileSizes.map((size) => (
                  <SelectItem key={`format-size-${size}`} value={size.toString()}>
                    {size}x{size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col justify-center items-center gap-2 w-full">
          <Button
            onClick={handleDownload}
            className="w-full shadow-none border-none rounded-[8px] gap-[6px] justify-center items-center text-white font-normal"
            variant={'default'}
            iconLeft={<DownloadIcon className="w-5 h-5" />}
          >
            {t('common:actions.download')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default QRCardPreview
