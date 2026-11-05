import { FormControl, FormField, FormItem, FormLabel } from '@/shared/components/ui/form'
import { Switch } from '@/shared/components/ui/switch'
import { Button } from '@/shared/components/ui/button'
import {
  DownloadQrPopover,
  QrRenderRef,
  QrRenderWithRef,
} from '@/features/bootstrap/components/qr-render'
import { QrCustomizeFormElementsDialog } from '../simple-form/qr-customize-form-elements-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { useFormContext, useWatch } from 'react-hook-form'
import { DownloadIcon, PaletteIcon } from 'lucide-react'
import { z } from 'zod'
import { touchPointUpdateSchema } from '@/shared/schemas/touch-points'
import { useShowTouchPoint } from '../../hooks/queries'
import { useEffect, useMemo, useRef } from 'react'
import { parse } from 'tldts'
import { useTranslation } from 'react-i18next'
import { getQrDefaultOptions, QR_CUSTOMIZE_DEFAULT_OPTIONS } from '../../constants'
import { Options } from 'qr-code-styling'
import { useDebounce } from '@/shared/hooks/use-debounce'

type TouchPointDetailQrSectionProps = {
  touchPoint: ReturnType<typeof useShowTouchPoint>['data']
}
export const TouchPointDetailQrSection = ({ touchPoint }: TouchPointDetailQrSectionProps) => {
  const { t } = useTranslation(['touchpoint'])
  const form = useFormContext<z.infer<typeof touchPointUpdateSchema>>()
  const watchQr = useWatch({ control: form.control, name: 'variants_content.QR.enabled' })
  const watchQrOptions = useWatch({ control: form.control, name: 'qr_customize_options' })
  const watchSlug = useWatch({ control: form.control, name: 'slug' })

  const debounceSlug = useDebounce(watchSlug, 200)
  useEffect(() => {
    const hostname = parse(touchPoint?.short_url).hostname
    const qrUrl = `https://${hostname}/${watchSlug || touchPoint.short_code}?t=1`
    const defaultOptions = getQrDefaultOptions(qrUrl)
    if (
      watchQrOptions?.data !== qrUrl ||
      watchQrOptions?.qrOptions?.typeNumber !== defaultOptions?.qrOptions?.typeNumber
    ) {
      form.setValue('qr_customize_options', {
        ...watchQrOptions,
        data: qrUrl,
        qrOptions: {
          ...watchQrOptions?.qrOptions,
          errorCorrectionLevel: defaultOptions?.qrOptions?.errorCorrectionLevel,
          typeNumber: defaultOptions?.qrOptions?.typeNumber,
        },
      })
    }
  }, [debounceSlug, watchQrOptions])

  const qrRef = useRef<QrRenderRef>(null)

  return (
    <div className="flex flex-col py-6 gap-4 border-b border-slate-300 w-full">
      <div className="px-6">
        <FormField
          control={form.control}
          name="variants_content.QR.enabled"
          render={({ field }) => (
            <FormItem className="flex items-center flex-row justify-between w-full">
              <FormLabel className="text-sm font-medium text-foreground">
                {t('touchpoint:touch_point_type.qr')}
              </FormLabel>
              <FormControl>
                <Switch onCheckedChange={field.onChange} checked={field.value} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      <AnimatePresence initial={false}>
        {watchQr && (
          <motion.div
            initial={{ height: 0, overflow: 'hidden' }}
            animate={{ height: 'auto', overflow: 'hidden' }}
            exit={{ height: 0, overflow: 'hidden', marginTop: -16 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div className="relative flex justify-center items-center my-4">
              <QrRenderWithRef ref={qrRef} qrOptions={watchQrOptions} border={false} size={152} />
              <div className="flex flex-col gap-3 absolute top-0 right-5 mt-1">
                <QrCustomizeFormElementsDialog
                  initQrOptions={watchQrOptions}
                  onUpdate={(values) => {
                    form.setValue('qr_customize_options', values.qr_customize_options)
                    form.setValue('qr_logo_image', values.qr_logo_image)
                  }}
                  button={
                    <Button type="button" variant="secondary" size="icon">
                      <PaletteIcon size={18} />
                    </Button>
                  }
                />
                {watchQrOptions && (
                  <DownloadQrPopover
                    button={
                      <Button type="button" variant="secondary" size="icon">
                        <DownloadIcon size={18} />
                      </Button>
                    }
                    qrOptions={watchQrOptions}
                    popoverAlign="end"
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
