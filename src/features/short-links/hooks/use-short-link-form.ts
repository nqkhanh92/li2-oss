import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useEffect } from 'react'
import { useFormWarningProvider } from '@/shared/providers/form-warning-provider'
import { defaultMetaTags, defaultUTM } from '@/shared/constants'
import { TouchPointContentType } from '@/features/touch-points/types'
import { FORCE_QR_ENABLED, QR_CUSTOMIZE_DEFAULT_OPTIONS } from '@/features/touch-points/constants'
import { shortLinkFormSchema, type ShortLinkFormValues } from '../schemas/short-link-form.schema'

const getDefaultValues = (): ShortLinkFormValues => ({
  name: '',
  enabled: true,
  content_type: TouchPointContentType.URL,
  is_campaign_based: false,
  content_value: '',
  tags: [],
  variants_content: {
    QR: { enabled: FORCE_QR_ENABLED },
    NFC: { enabled: false },
    WIFI: { enabled: false },
  },
  qr_customize_options: {},
  qr_logo_image: QR_CUSTOMIZE_DEFAULT_OPTIONS.image,
  meta_tags: defaultMetaTags,
  utm_tags: defaultUTM,
  conversion_tracking: { enabled: false },
  tracking: {
    facebook: undefined,
    google: undefined,
    tiktok: undefined,
  },
  smart_targeting: {
    devices: { android: '', ios: '' },
    countries: [],
  },
})

export const useShortLinkForm = () => {
  const defaultValues = useMemo(() => getDefaultValues(), [])

  const form = useForm<ShortLinkFormValues>({
    resolver: zodResolver(shortLinkFormSchema),
    defaultValues,
  })

  const { setEnabled } = useFormWarningProvider()

  const dirtyFields = Object.keys(form.formState.dirtyFields).length

  useEffect(() => {
    setEnabled(dirtyFields > 0 && !form.formState.isSubmitSuccessful)
  }, [dirtyFields, form.formState.isSubmitSuccessful, setEnabled])

  const isFormDirty = useMemo(
    () => Object.keys(form.formState.dirtyFields).length > 0,
    [form.formState.dirtyFields]
  )

  return { form, isFormDirty }
}
