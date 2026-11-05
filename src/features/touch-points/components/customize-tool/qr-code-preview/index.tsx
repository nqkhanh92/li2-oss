'use client'
import { useQrContext } from '@/shared/providers/qr-customize-provider'
import QRCodeStyling, { FileExtension, Options } from 'qr-code-styling'
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import equal from 'fast-deep-equal'
import { createExtensionWithBase64Logo, extension } from '@/features/touch-points/constants/qr'
import { motion, useAnimation } from 'framer-motion'
import { useDebounceFn } from '@/shared/hooks/use-debounce'
import Image from 'next/image'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

function normalizeOptions(opts: any) {
  return {
    data: opts.data,
    image: opts.image,
    dotsOptions: opts.dotsOptions
      ? {
          type: opts.dotsOptions.type,
          color: opts.dotsOptions.color,
        }
      : undefined,
    cornersDotOptions: opts.cornersDotOptions
      ? {
          type: opts.cornersDotOptions.type,
          color: opts.cornersDotOptions.color,
        }
      : undefined,
    cornersSquareOptions: opts.cornersSquareOptions
      ? {
          type: opts.cornersSquareOptions.type,
          color: opts.cornersSquareOptions.color,
        }
      : undefined,
    imageOptions: opts.imageOptions
      ? {
          crossOrigin: opts.imageOptions.crossOrigin,
          hideBackgroundDots:
            opts.imageOptions.hideBackgroundDots === true ||
            opts.imageOptions.hideBackgroundDots === 'true',
          imageSize:
            typeof opts.imageOptions.imageSize === 'string'
              ? parseFloat(opts.imageOptions.imageSize)
              : opts.imageOptions.imageSize,
          margin:
            typeof opts.imageOptions.margin === 'string'
              ? parseInt(opts.imageOptions.margin, 10)
              : opts.imageOptions.margin,
        }
      : undefined,
  }
}

interface ExtendedOptions extends Options {
  rawData?: string
  frame?: string
  footerImage?: string
}

export type QrCodePreviewHandle = {
  download: (
    tp_name: string,
    short_url: string,
    fileType?: FileExtension,
    fileSize?: number
  ) => void
}

export const QrCodePreviewWrapper = forwardRef<QrCodePreviewHandle, QrCodePreviewRef>(
  (props, ref) => {
    const { qrOptions } = useQrContext()
    const qrRef = useRef<QrCodePreviewRef>(null)
    useImperativeHandle(
      ref,
      () => ({
        download: (
          tp_name: string,
          short_url: string,
          fileType?: FileExtension,
          fileSize?: number
        ) => {
          qrRef.current?.download(tp_name, short_url, fileType, fileSize)
        },
      }),
      []
    )

    return <QrCodePreview ref={qrRef} />
  }
)
interface QrCodePreviewProps {
  size?: number
}

export interface QrCodePreviewRef {
  qrCode: QRCodeStyling
  containerRef: HTMLDivElement | null
  download: (
    tp_name: string,
    short_url: string,
    fileType?: FileExtension,
    fileSize?: number
  ) => void
}

export const QrCodePreview = forwardRef<QrCodePreviewRef, QrCodePreviewProps>(
  ({ size = 168 }, ref) => {
    const qrCodeRef = useRef<HTMLDivElement>(null)
    const { qrOptions } = useQrContext()
    const qrCode = useMemo(
      () =>
        new QRCodeStyling({
          ...(qrOptions as Options),
          width: size,
          height: size,
          data: qrOptions.rawData,
          image: qrOptions.image,
          imageOptions: {
            ...qrOptions.imageOptions,
          },
        }),
      []
    )

    useEffect(() => {
      if (!qrCodeRef.current) return
      qrCode.append(qrCodeRef.current)
      qrCode.applyExtension(extension)
    }, [qrCode])

    useImperativeHandle(
      ref,
      () => ({
        qrCode,
        containerRef: qrCodeRef.current,
        download: (
          tp_name: string,
          short_url: string,
          fileType?: FileExtension,
          fileSize?: number
        ) => {
          qrCode.download({
            extension: fileType,
            name: tp_name,
          })
        },
      }),
      [qrCode]
    )
    const controls = useAnimation()
    const debounceUpdate = useDebounceFn(() => {
      // Animate fade out, update QR, then fade in
      const animateUpdate = async () => {
        await controls.start({ opacity: 0, scale: 0.9 })
        const normalizedQrOptions = normalizeOptions(qrOptions)
        const normalizedQrCodeOptions = normalizeOptions(qrCode._options)
        if (!equal(normalizedQrOptions, normalizedQrCodeOptions)) {
          qrCode.update({
            ...normalizedQrOptions,
            width: size,
            height: size,
            data: normalizedQrOptions.data,
            image: normalizedQrOptions.image,
            imageOptions: {
              ...normalizedQrOptions.imageOptions,
            },
          })
          if (isSafari) {
            setTimeout(() => {
              qrCode.update({
                ...normalizedQrOptions,
                width: size,
                height: size,
                data: normalizedQrOptions.data,
                image: normalizedQrOptions.image,
                imageOptions: {
                  ...normalizedQrOptions.imageOptions,
                },
              })
            }, 200)
          }
          setHasUpdated(true)
          setFirstImage('')
        }
        await controls.start({ opacity: 1, scale: 1 })
      }
      animateUpdate()
    }, 300)

    const memoizedQrOptions = useMemo(() => qrOptions, [JSON.stringify(qrOptions)])

    useEffect(() => {
      debounceUpdate()
    }, [qrCode, memoizedQrOptions, controls])

    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

    const [firstImage, setFirstImage] = useState<string>('')
    const [hasUpdated, setHasUpdated] = useState(false)

    useEffect(() => {
      if (!hasUpdated) {
        qrCode.getRawData('png').then((blobOrBuffer) => {
          let url = ''
          if (blobOrBuffer instanceof Blob) {
            url = URL.createObjectURL(blobOrBuffer)
          } else if (blobOrBuffer instanceof ArrayBuffer || Buffer.isBuffer(blobOrBuffer)) {
            const blob = new Blob([new Uint8Array(blobOrBuffer)], { type: 'image/png' })
            url = URL.createObjectURL(blob)
          }
          setFirstImage(url || '')
        })
      }
    }, [hasUpdated])

    const handleDownload = async (
      tp_name: string,
      short_url: string,
      fileType: FileExtension = 'png',
      fileSize: number = 512
    ) => {
      if (!qrOptions || !qrCode) return toast.error('QR code not found')
      const options = {
        ...qrCode._options,
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
      if (isSafari) {
        if (!hasUpdated) {
          qrCode.getRawData('png').then((blobOrBuffer) => {
            let url = ''
            if (blobOrBuffer instanceof Blob) {
              url = URL.createObjectURL(blobOrBuffer)
            } else if (blobOrBuffer instanceof ArrayBuffer || Buffer.isBuffer(blobOrBuffer)) {
              const blob = new Blob([new Uint8Array(blobOrBuffer)], { type: 'image/png' })
              url = URL.createObjectURL(blob)
            }
            if (url) {
              const a = document.createElement('a')
              a.href = url
              a.download = tp_name
              document.body.appendChild(a)
              a.click()
              a.remove()
              URL.revokeObjectURL(url)
            }
          })
        } else {
          setTimeout(() => {
            downloadQr.update(options)
          }, 150)
          downloadQr.update(options)
          triggerDownload()
        }
      } else {
        triggerDownload()
      }
    }

    useImperativeHandle(ref, () => ({
      download: (tp_name: string, short_url: string, fileType?: FileExtension, fileSize?: number) =>
        handleDownload(tp_name, short_url, fileType ?? 'png', fileSize ?? 512),
      qrCode,
      containerRef: qrCodeRef.current,
    }))

    return (
      <div className="w-full flex justify-center items-center">
        <motion.div
          animate={controls}
          initial={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="relative flex justify-center items-center"
        >
          <div ref={qrCodeRef} />
          {!hasUpdated &&
            (firstImage.length > 0 ? (
              <Image
                src={firstImage}
                width={size}
                height={size}
                alt="QR preview"
                className="absolute top-0 left-0"
              />
            ) : (
              <Loader2 className="w-5 h-5 absolute animate-spin" />
            ))}
        </motion.div>
      </div>
    )
  }
)
