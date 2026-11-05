import { CustomColorPicker } from '@/shared/components/customize/custom-color-picker'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { useDebounceFn } from '@/shared/hooks/use-debounce'
import { cn, makeCircleImage } from '@/shared/lib/utils'
import { useQrContext } from '@/shared/providers/qr-customize-provider'
import { touchPointFormSchema } from '@/shared/schemas/touch-points'
import { BanIcon, Pipette, UploadIcon } from 'lucide-react'
import { useFormContext } from 'react-hook-form'
import { z } from 'zod'
import { DotsSelection } from './qr-customize/dots-selection'
import { CornersSquareSelection } from './qr-customize/corners-square-selection'
import { useCallback, useRef } from 'react'
import { QR_CUSTOMIZE_DEFAULT_OPTIONS } from '@/features/touch-points/constants'
import { useTranslation } from 'react-i18next'
import { defaultQrLogo } from '../../constants/default-qr-logo'

// Preset colors matching Figma
const SAMPLE_COLORS = ['#000d27', '#437ef7', '#4125b9', '#f36600']

export const QrCustomizeFormElements = () => {
  const { setValue } = useFormContext<z.infer<typeof touchPointFormSchema>>()
  const sampleLogo = ['', QR_CUSTOMIZE_DEFAULT_OPTIONS.image, defaultQrLogo[0].image]
  const { qrOptions, setQrOptions } = useQrContext()
  const { t } = useTranslation()
  const fileUploadRef = useRef<HTMLInputElement>(null)

  const handleColorChange = useDebounceFn((color: string) => {
    setQrOptions((pre) => {
      if (pre?.dotsOptions?.color !== color) {
        return { ...pre, dotsOptions: { ...pre.dotsOptions, color } }
      }
      return pre
    })
  }, 50)

  const handleLogoChange = useDebounceFn(async (logo: string | File | undefined) => {
    let logoUrl: string | undefined = logo instanceof File ? undefined : logo

    if (logo instanceof File) {
      const { file, url } = await makeCircleImage(logo, 12)
      setValue('qr_logo_image', file)
      logoUrl = url
    } else {
      setValue('qr_logo_image', logoUrl)
    }

    setQrOptions((pre) => {
      if (pre?.image !== logoUrl) {
        return { ...pre, image: logoUrl }
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

  return (
    <div className="flex flex-col gap-2">
      <div className="grid lg:grid-cols-2 grid-cols-1 gap-x-4 gap-y-2">
        {/* ── Color ── */}
        <FormField
          name="qr_customize_options.color"
          render={() => (
            <FormItem>
              <FormLabel className="text-sm font-normal text-slate-700">
                {t('form.fields.color')}
              </FormLabel>
              <FormControl>
                <div className="flex items-center gap-3">
                  {SAMPLE_COLORS.map((color) => {
                    const isSelected = qrOptions?.dotsOptions?.color === color
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleColorChange(color)}
                        className={cn(
                          'rounded-[6px] border shrink-0 transition-colors',
                          isSelected ? 'border-slate-900' : 'border-slate-300'
                        )}
                        style={isSelected ? { borderColor: color === '#000d27' ? '#000d27' : color } : {}}
                      >
                        <div
                          className="size-9 rounded-[10px] border-4 border-white"
                          style={{ backgroundColor: color }}
                        />
                      </button>
                    )
                  })}

                  {/* Eyedropper / custom color */}
                  <CustomColorPicker
                    renderPicker={({ setOpen }) => (
                      <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="size-9 flex items-center justify-center bg-white border border-slate-200 rounded-[6px] hover:border-slate-400 transition-colors"
                      >
                        <Pipette className="size-5 text-slate-600" />
                      </button>
                    )}
                    value={qrOptions?.dotsOptions?.color ?? SAMPLE_COLORS[0]}
                    onChange={handleColorChange}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Logo ── */}
        <FormField
          name="qr_customize_options.image"
          render={() => (
            <FormItem>
              <FormLabel className="text-sm font-normal text-slate-700">Logo</FormLabel>
              <FormControl>
                <div className="flex items-center gap-3">
                  {sampleLogo.map((logo, idx) => {
                    const isSelected = qrOptions?.image === logo
                    return (
                      <button
                        key={`logo-${idx}`}
                        type="button"
                        onClick={() => handleLogoChange(logo)}
                        className={cn(
                          'size-9 flex items-center justify-center shrink-0 overflow-hidden transition-colors',
                          logo
                            ? 'rounded-[8px] border p-1'
                            : 'rounded-[6px] border',
                          isSelected
                            ? 'border-primary'
                            : 'border-slate-300 hover:border-slate-400'
                        )}
                      >
                        {logo ? (
                          <div
                            className="size-full"
                            style={{
                              backgroundImage: `url(${logo})`,
                              backgroundPosition: 'center',
                              backgroundRepeat: 'no-repeat',
                              backgroundSize: 'contain',
                            }}
                          />
                        ) : (
                          <BanIcon className="size-8 text-slate-500" strokeWidth={1.5} />
                        )}
                      </button>
                    )
                  })}

                  {/* Upload */}
                  <button
                    type="button"
                    onClick={() => fileUploadRef.current?.click()}
                    className="size-9 flex items-center justify-center bg-white border border-slate-200 rounded-[8px] hover:border-slate-400 transition-colors"
                  >
                    <UploadIcon className="size-5 text-slate-600" strokeWidth={1.5} />
                    <input
                      type="file"
                      ref={fileUploadRef}
                      accept=".png,.jpg,.jpeg,.svg"
                      className="hidden"
                      onChange={(e) => handleUploadLogo(e.target.files?.[0] ?? null)}
                    />
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Corner dot style ── */}
        <FormField
          name="qr_customize_options.dotsOptions"
          render={() => (
            <FormItem>
              <FormLabel className="text-sm font-normal text-slate-700">
                {t('form.fields.dots_style')}
              </FormLabel>
              <FormControl>
                <DotsSelection />
              </FormControl>
            </FormItem>
          )}
        />

        {/* ── Corner square style ── */}
        <FormField
          name="qr_customize_options.cornersOptions"
          render={() => (
            <FormItem>
              <FormLabel className="text-sm font-normal text-slate-700">
                {t('form.fields.corners_style')}
              </FormLabel>
              <FormControl>
                <CornersSquareSelection />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
