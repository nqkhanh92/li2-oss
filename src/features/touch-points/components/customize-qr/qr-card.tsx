import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import QRCodeStyling, { FileExtension } from 'qr-code-styling'
import { ExtendedOptions } from '@/features/touch-points/components/customize-tool/qr-tool'
import {
  QrCodePreview,
  QrCodePreviewRef,
} from '@/features/touch-points/components/customize-tool/qr-code-preview'
import { useQrContext } from '@/shared/providers/qr-customize-provider'
import { createExtensionWithBase64Logo } from '@/shared/constants/utils'
import { toast } from 'sonner'
export type QRCardHandle = {
  download: (
    tp_name: string,
    fileType?: FileExtension,
    fileSize?: number
  ) => void
}

const QRCard = forwardRef<
  QRCardHandle,
  {
    qrCustomizeOptions?: ExtendedOptions
    className?: string
    tp_name?: string
    size?: number
  }
>(({ qrCustomizeOptions, className = '', tp_name = 'qr_code', size = 300 }, ref) => {
  const qrPreviewRef = useRef<QrCodePreviewRef | null>(null)
  const { qrOptions } = useQrContext()

  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

  const handleDownload = async (
    tp_name: string,
    fileType: FileExtension = 'png',
    fileSize: number = 512
  ) => {
    if (!qrOptions || !qrPreviewRef.current?.qrCode) return toast.error('QR code not found')
    const options = {
      ...qrPreviewRef.current.qrCode._options,
      width: fileSize,
      height: fileSize,
    }

    const downloadQr = new QRCodeStyling(options)
    const tempDiv = document.createElement('div')
    document.body.appendChild(tempDiv)
    downloadQr.append(tempDiv)
    downloadQr.applyExtension(await createExtensionWithBase64Logo())

    const triggerDownload = () => {
      downloadQr.download({
        extension: fileType,
        name: tp_name,
      })
      tempDiv.remove()
    }
    triggerDownload()
  }

  useImperativeHandle(ref, () => ({
    download: (tp_name: string, fileType?: FileExtension, fileSize?: number) =>
      handleDownload(tp_name, fileType ?? 'png', fileSize ?? 512),
  }))

  return (
    <div className={`w-full flex flex-col justify-center items-center gap-4`}>
      <div className={`${className}`}>
        <QrCodePreview ref={qrPreviewRef} />
      </div>
    </div>
  )
})

export default QRCard
