import { z } from 'zod'
import { touchPointFormCreateWithAdvanceSchema } from '@/shared/schemas/touch-points'
import { AllTouchPointVariants } from '@/features/touch-points/types'
import { UseFormReturn } from 'react-hook-form'

type FormValues = z.infer<typeof touchPointFormCreateWithAdvanceSchema>

/**
 * Transform form data before submission
 * Handles QR-specific fields, meta tags, and UTM tags
 */
export const transformFormDataForSubmit = (
  values: FormValues,
  selectedTab: AllTouchPointVariants,
  qrOptions: any,
  form: UseFormReturn<FormValues>
): FormValues => {
  const baseValues = {
    ...values,
    qr_logo_image: undefined,
  }

  // If QR is selected, update qr_customize_options and variants_content
  const qrEnhancements =
    selectedTab === AllTouchPointVariants.QR
      ? {
          qr_logo_image: values.qr_logo_image,
          qr_customize_options: qrOptions,
          variants_content: {
            ...values.variants_content,
            [AllTouchPointVariants.QR]: {
              enabled: true,
              content_value: values.content_value,
            },
          },
        }
      : {}

  // Enable meta_tags if dirty
  const metaTagsEnhancements =
    form.formState.dirtyFields.meta_tags && values.meta_tags
      ? {
          meta_tags: {
            ...values.meta_tags,
            enabled: true,
          },
        }
      : {}

  // Enable utm_tags if dirty
  const utmTagsEnhancements =
    form.formState.dirtyFields.utm_tags && values.utm_tags
      ? {
          utm_tags: {
            ...values.utm_tags,
            enabled: true,
          },
        }
      : {}

  // Include conversion_tracking if dirty
  const conversionTrackingEnhancements =
    form.formState.dirtyFields.conversion_tracking && values.conversion_tracking
      ? {
          conversion_tracking: values.conversion_tracking,
        }
      : {}

  return {
    ...baseValues,
    ...qrEnhancements,
    ...metaTagsEnhancements,
    ...utmTagsEnhancements,
    ...conversionTrackingEnhancements,
  }
}

/**
 * Format tab label for display
 * Capitalizes first letter of tab name
 */
export const formatTabLabel = (tab: string): string => {
  if (tab.length > 3) {
    return tab.toLowerCase().charAt(0).toUpperCase() + tab.toLowerCase().slice(1)
  }
  return tab
}
