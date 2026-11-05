import QRCodeStyling, { FileExtension } from 'qr-code-styling'
import {
  ReactNode,
  Suspense,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AnimatePresence, motion, useAnimation } from 'framer-motion'
import { Options } from 'qr-code-styling'
import { toast } from 'sonner'
import { useDebounceFn } from '@/shared/hooks/use-debounce'
import { cn, downloadQrViaApi, isSafari, toBlobPart } from '@/shared/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Button } from '@/shared/components/ui/button'
import { ChevronDownIcon, CopyIcon, DownloadIcon, Loader2Icon } from 'lucide-react'
import { availableQrOptions, extension } from '@/shared/constants/utils'
import { Separator } from '@/shared/components/ui/separator'
import { Badge } from '@/shared/components/ui/badge'
import { useTranslation } from 'react-i18next'
import { CustomToolTip } from '@/shared/components/customize/custom-tooltip'
import { QR_CUSTOMIZE_DEFAULT_OPTIONS } from '@/features/touch-points/constants'

type DownloadQrPopoverProps = {
  button?: React.ReactNode
  qrOptions: Options
  popoverAlign?: 'start' | 'end'
}
export const DownloadQrPopover = ({
  button,
  qrOptions,
  popoverAlign = 'start',
}: DownloadQrPopoverProps) => {
  const { t } = useTranslation()
  const handleDownloadQr = useCallback(
    (fileType?: FileExtension, fileSize?: number) => {
      const options: Options = {
        ...qrOptions,
        type: 'canvas',
        width: fileSize ?? 512,
        height: fileSize ?? 512,
      }
      if (isSafari()) {
        downloadQrViaApi(options, fileType)
      } else {
        new QRCodeStyling(options).download({
          extension: fileType ?? 'png',
          name: 'qr-code-' + new Date().getTime(),
        })
      }
    },
    [qrOptions]
  )
  return (
    <Popover>
      <PopoverTrigger asChild>
        {button ?? (
          <Button
            type="button"
            size="default"
            variant={'default'}
            iconLeft={<DownloadIcon />}
            iconRight={<ChevronDownIcon />}
          >
            {t('common:actions.download')}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="bg-background rounded-[8px] px-4 py-3 border border-slate-200"
        align={popoverAlign}
      >
        <div className="grid grid-cols-1 gap-2">
          {availableQrOptions.map((option) => (
            <div
              key={option.id}
              className="flex flex-col w-full"
              onClick={() => handleDownloadQr(option.fileType, option.fileSize)}
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
  )
}

type QrRenderProps = {
  className?: string
  size?: number
  qrOptions?: Options
  border?: boolean
  showDownloadButton?: boolean
  qrClassName?: string
}

export type QrRenderRef = {
  handleDownloadQr: (fileType?: FileExtension, fileSize?: number) => void
  handleCopyQr: () => Promise<void>
  renderDownload(button?: ReactNode, popoverAlign?: 'start' | 'end'): ReactNode
}

const QrRender = (
  {
    className,
    size,
    qrOptions: _qrOptions,
    border = true,
    showDownloadButton = false,
    qrClassName,
  }: QrRenderProps,
  ref?: React.Ref<QrRenderRef>
) => {
  const { t } = useTranslation()
  const qrOptions = useMemo(() => {
    return {
      ...QR_CUSTOMIZE_DEFAULT_OPTIONS,
      ..._qrOptions,
      width: size ?? QR_CUSTOMIZE_DEFAULT_OPTIONS.width,
      height: size ?? QR_CUSTOMIZE_DEFAULT_OPTIONS.height,
    }
  }, [_qrOptions, size])

  const qr = useMemo(() => new QRCodeStyling(qrOptions), [])
  const qrRef = useRef<HTMLDivElement>(null)
  const hasInitialized = useRef(false)
  useEffect(() => {
    if (!qrRef?.current) return
    qr.append(qrRef?.current)
    qr.applyExtension(extension)
  }, [])

  const controls = useAnimation()

  // Initialize with opacity 0
  useEffect(() => {
    controls.set({ opacity: 0, scale: 0.9 })
  }, [])

  const handleDownloadQr = useCallback(
    (fileType?: FileExtension, fileSize?: number) => {
      const options: Options = {
        ...qrOptions,
        type: 'canvas',
        width: fileSize ?? 512,
        height: fileSize ?? 512,
      }

      if (isSafari()) {
        downloadQrViaApi(options, fileType)
      } else {
        new QRCodeStyling(options).download({
          extension: fileType ?? 'png',
          name: 'qr-code-' + new Date().getTime(),
        })
      }
    },
    [qrOptions]
  )

  const handleCopyQr = useCallback(async () => {
    const options: Options = {
      ...qrOptions,
      type: 'canvas',
      width: 512,
      height: 512,
    }
    const rawData = await new QRCodeStyling(options).getRawData('png')
    if (!rawData) return
    const imageBlob = new Blob([toBlobPart(rawData)], { type: 'image/png' })
    navigator.clipboard.write([new ClipboardItem({ 'image/png': imageBlob })])
    toast.success(t('common:toast.title_copy'), {
      description: t('common:toast.description_copy', {
        field: '$t(label.qr_code)',
      }),
    })
  }, [qrOptions, t])
  const renderDownload = useCallback(
    (button?: ReactNode, popoverAlign?: 'start' | 'end') => {
      return <DownloadQrPopover button={button} qrOptions={qrOptions} popoverAlign={popoverAlign} />
    },
    [qrOptions]
  )

  useImperativeHandle(
    ref,
    () => ({
      handleDownloadQr,
      handleCopyQr,
      renderDownload,
    }),
    [handleDownloadQr, handleCopyQr, renderDownload]
  )

  const debounceUpdate = useDebounceFn((newOptions: Options) => {
    // Animate fade out, update QR, then fade in
    const animateUpdate = async () => {
      if (hasInitialized.current) {
        // setLoading(true)
        await controls.start({ opacity: 0, scale: 0.9 })
      }
      qr.update({
        ...newOptions,
      })
      await controls.start({ opacity: 1, scale: 1 })
      hasInitialized.current = true
      // setLoading(false)
    }
    animateUpdate()
  }, 200)

  // Initial fade-in after 0.3s if no updates occur
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasInitialized.current) {
        controls.start({ opacity: 1, scale: 1 })
        hasInitialized.current = true
        // setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    debounceUpdate(qrOptions)
  }, [qrOptions])

  return (
    <div className={cn('w-full flex flex-col justify-center items-center', className)}>
      <AnimatePresence mode="wait">
        {/* {loading ? (
          <div className="flex items-center justify-center w-[180px] h-[180px]">
            <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : ( */}
        <motion.div animate={controls}>
          <div
            className={cn({ 'border border-slate-200 rounded-[6px] p-1': border }, qrClassName)}
            ref={qrRef}
          />
        </motion.div>
        {/* )} */}
      </AnimatePresence>
      {showDownloadButton && (
        <div className="flex py-4 gap-2">
          {renderDownload()}
          <CustomToolTip
            content={t('common:actions.copy_field', { field: t('common:label.qr_code') })}
          >
            <Button
              variant={'secondary'}
              className="w-10 h-10"
              onClick={handleCopyQr}
              type="button"
              size={'icon'}
            >
              <CopyIcon className="w-5 h-5" />
            </Button>
          </CustomToolTip>
        </div>
      )}
    </div>
  )
}

export const QrRenderWithRef = forwardRef<QrRenderRef, QrRenderProps>(QrRender)
export { QrRender }
