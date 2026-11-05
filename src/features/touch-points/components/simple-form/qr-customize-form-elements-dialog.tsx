import { CustomColorPicker } from '@/shared/components/customize/custom-color-picker'
import { Button } from '@/shared/components/ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { useDebounceFn } from '@/shared/hooks/use-debounce'
import { cn, makeCircleImage } from '@/shared/lib/utils'
import QrCustomizeProvider, { useQrContext } from '@/shared/providers/qr-customize-provider'
import { touchPointFormSchema } from '@/shared/schemas/touch-points'
import { BanIcon, PaletteIcon, Pipette, UploadIcon } from 'lucide-react'
import { z } from 'zod'
import { DotsSelection } from './qr-customize/dots-selection'
import { CornersSquareSelection } from './qr-customize/corners-square-selection'
import { Suspense, useCallback, useRef, useState } from 'react'
import { QR_CUSTOMIZE_DEFAULT_OPTIONS } from '@/features/touch-points/constants'
import { QrRenderWithRef } from '@/features/bootstrap/components/qr-render'
import { useTranslation } from 'react-i18next'
import { CustomDialog } from '@/shared/components/customize/custom-dialog'
import { motion } from 'framer-motion'
import { Separator } from '@/shared/components/ui/separator'
import { QrOptions } from '../../constants/qr'
import { defaultQrLogo } from '../../constants/default-qr-logo'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'

type QrCustomizeFormElementsDialogProps = {
  button?: React.ReactNode
  onUpdate?: (values: z.infer<typeof schema>) => void
  initQrOptions?: QrOptions
}

const schema = touchPointFormSchema.pick({
  qr_customize_options: true,
  qr_logo_image: true,
})
const sampleColors = ['#100D08', '#0891B2', '#4125B9']
const sampleLogo = ['', QR_CUSTOMIZE_DEFAULT_OPTIONS.image, defaultQrLogo[0].image]

export const QrCustomizeFormElementsDialog = ({
  button,
  onUpdate,
  initQrOptions,
}: QrCustomizeFormElementsDialogProps) => {
  return (
    <QrCustomizeProvider initialValues={initQrOptions}>
      <Suspense fallback>
        <QrCustomizeFormElementsDialogContent
          initQrOptions={initQrOptions}
          button={button}
          onUpdate={onUpdate}
        />
      </Suspense>
    </QrCustomizeProvider>
  )
}
type QrCustomizeFormElementsDialogContentProps = {
  initQrOptions?: QrOptions
  button?: React.ReactNode
  onUpdate?: (values: z.infer<typeof schema>) => void
}
const QrCustomizeFormElementsDialogContent = ({
  initQrOptions,
  button,
  onUpdate,
}: QrCustomizeFormElementsDialogContentProps) => {
  const { qrOptions, setQrOptions } = useQrContext()
  const [qrLogo, setQrLogo] = useState<string | File | undefined>(qrOptions?.image)
  const handleReset = () => {
    if (initQrOptions) {
      setQrOptions(initQrOptions)
      setQrLogo(initQrOptions?.image)
    }
  }

  const handleColorChange = useDebounceFn((color: string) => {
    setQrOptions((pre) => {
      if (pre?.dotsOptions?.color !== color) {
        return {
          ...pre,
          dotsOptions: {
            ...pre.dotsOptions,
            color,
          },
        }
      }
      return pre
    })
  }, 50)

  const handleLogoChange = useDebounceFn(async (logo: string | File | undefined) => {
    let logoUrl: string | undefined = logo instanceof File ? undefined : logo

    if (logo instanceof File) {
      const { file, url } = await makeCircleImage(logo, 12)
      setQrLogo(file)
      logoUrl = url
    } else {
      setQrLogo(logoUrl)
    }

    setQrOptions((pre) => {
      if (pre?.image !== logoUrl) {
        return {
          ...pre,
          image: logoUrl,
        }
      }
      return pre
    })
  }, 50)

  const handleUploadLogo = useCallback((file: File | null) => {
    const logo =
      file ??
      QR_CUSTOMIZE_DEFAULT_OPTIONS.image ??
      'https://supa.li2.ai/storage/v1/object/public/casdoor-logo/ftc/qr-logo-li2.png'
    handleLogoChange(logo)
  }, [])

  const fileUploadRef = useRef<HTMLInputElement>(null)
  const { t } = useTranslation(['common', 'touchpoint'])
  const handleUpdate = useCallback(() => {
    onUpdate?.({
      qr_customize_options: qrOptions,
      qr_logo_image: qrLogo,
    })
  }, [onUpdate, qrOptions, qrLogo])

  return (
    <CustomDialog
      size="sm"
      title={t('common:buttons.customize_field', { field: '$t(label.qr_code)' })}
      noFooter
      button={
        button ?? (
          <Button
            variant="secondary"
            type="button"
            className="flex items-center gap-1 rounded-[8px] border-slate-300 outline-hidden font-normal md:w-fit w-full"
          >
            <PaletteIcon className="w-5! h-5! justify-center items-center rounded-[4px]" />
            <span className="flex justify-start text-sm">{t('common:buttons.customize')}</span>
          </Button>
        )
      }
      className="md:w-fit md:min-w-fit md:p-6 rounded-3xl"
    >
      {({ close }) => {
        return (
          <div className="flex flex-col gap-4 items-center w-full">
            <Separator />
            <div className="w-full items-center md:items-start justify-center flex flex-col gap-6 md:gap-0 md:flex-row md:overflow-y-visible overflow-y-hidden max-w-fit">
              <div className="flex flex-col gap-4">
                <FormField
                  name="qr_customize_options.image"
                  render={({ field }) => {
                    return (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Logo</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-4 w-fit md:w-full md:flex gap-4">
                            {sampleLogo.map((logo) => {
                              return (
                                <Button
                                  variant="secondary"
                                  size={'icon'}
                                  type="button"
                                  className={cn(
                                    'h-12 w-12 rounded-[8px] border-slate-300 border-[1.5px] overflow-hidden bg-background hover:border-black!',
                                    {
                                      'border-black!': qrLogo === logo,
                                    }
                                  )}
                                  onClick={() => handleLogoChange(logo)}
                                >
                                  {logo ? (
                                    <div
                                      className="w-10 h-10"
                                      style={{
                                        backgroundImage: `url(${logo})`,
                                        backgroundPosition: 'center',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundSize: 'contain',
                                      }}
                                    ></div>
                                  ) : (
                                    <BanIcon strokeWidth={2} className="w-7! h-7! text-slate-600" />
                                  )}
                                </Button>
                              )
                            })}
                            <Button
                              type="button"
                              onClick={() => fileUploadRef.current?.click()}
                              variant="secondary"
                              size={'icon'}
                              className="h-12 w-12 bg-slate-200! opacity-50 hover:opacity-100!"
                            >
                              <UploadIcon strokeWidth={2} className="w-6! h-6! text-slate-600!" />
                              <input
                                type="file"
                                ref={fileUploadRef}
                                accept=".png,.jpg,.jpeg,.svg"
                                className="hidden"
                                onChange={(e) => handleUploadLogo(e.target.files?.[0] ?? null)}
                              />
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />
                <FormField
                  // control={control}
                  name="qr_customize_options.color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">
                        {t('form.fields.color')}
                      </FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-4 w-fit md:w-full md:flex gap-4">
                          {sampleColors.map((color) => {
                            return (
                              <Button
                                variant="secondary"
                                size={'icon'}
                                type="button"
                                className={cn(
                                  'h-12 w-12 rounded-[8px] border-slate-300 border bg-background hover:border-black!',
                                  {
                                    'border-black!': qrOptions?.dotsOptions?.color === color,
                                  }
                                )}
                                onClick={() => handleColorChange(color)}
                              >
                                <div
                                  className="p-4 rounded-[4px]"
                                  style={{ backgroundColor: color }}
                                ></div>
                              </Button>
                            )
                          })}
                          <CustomColorPicker
                            renderPicker={({ open, setOpen }) => {
                              return (
                                <Button
                                  variant="secondary"
                                  size={'icon'}
                                  className="h-12 w-12 bg-slate-200! opacity-50 hover:opacity-100!"
                                  onClick={() => setOpen(true)}
                                >
                                  <Pipette strokeWidth={2} className="w-6! h-6! text-slate-600!" />
                                </Button>
                              )
                            }}
                            value={qrOptions?.dotsOptions?.color ?? sampleColors[0]}
                            onChange={handleColorChange}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="qr_customize_options.dotsOptions"
                  render={({ field }) => {
                    return (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-base font-semibold">
                          {t('form.fields.dots_style')}
                        </FormLabel>
                        <FormControl>
                          <DotsSelection isInCreate={true} />
                        </FormControl>
                      </FormItem>
                    )
                  }}
                />
                <FormField
                  name="qr_customize_options.cornersOptions"
                  render={({ field }) => {
                    return (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-base font-semibold">
                          {t('form.fields.corners_style')}
                        </FormLabel>
                        <FormControl>
                          <CornersSquareSelection isInCreate={true} />
                        </FormControl>
                      </FormItem>
                    )
                  }}
                />
              </div>
              <div className="md:ml-9 md:border-l md:border-slate-200 md:pl-6 flex flex-col gap-6 items-center max-w-[280px]">
                <motion.div className="flex flex-col gap-6 items-center" initial={{ opacity: 1 }}>
                  <div className="flex flex-col gap-[2px]">
                    <label className="text-lg font-semibold text-foreground text-center">
                      {t('common:text.preview')}
                    </label>
                  </div>
                  <div className="flex justify-center items-center rounded-xl p-5 bg-background w-fit">
                    <QrRenderWithRef qrOptions={qrOptions} size={151} border={false} />
                  </div>
                </motion.div>
              </div>
            </div>
            <div className="w-full flex gap-6 items-end justify-end mb-6 md:mb-0">
              <Button
                type="button"
                onClick={() => {
                  handleReset()
                  close()
                }}
                variant="secondary"
                className={`gap-[6px] text-base flex-1 max-w-fit`}
              >
                {t('common:buttons.cancel')}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  close()
                  handleUpdate()
                }}
                className="px-4 py-[8px] rounded-[8px] text-base flex-1 w-full md:w-fit md:max-w-fit"
              >
                {t('touchpoint:touch_point_edit.button_list.update_button')}
              </Button>
            </div>
          </div>
        )
      }}
    </CustomDialog>
  )
}
