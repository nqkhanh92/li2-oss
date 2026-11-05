import { AllTouchPointVariants, TouchPointContentType } from '@/features/touch-points/types'
import { touchPointFormCreateWithAdvanceSchema } from '@/shared/schemas/touch-points'
import { z } from 'zod'
import { defaultMetaTags, defaultUTM } from '@/shared/constants'
import { QR_CUSTOMIZE_DEFAULT_OPTIONS, FORCE_QR_ENABLED } from '@/features/touch-points/constants'

import { Link2Icon, ScanQrCode } from 'lucide-react'
import { AnimatedTab } from '@/shared/components/animation/animated-tabs'

/**
 * QR code preview size in pixels
 */
export const QR_PREVIEW_SIZE = 168

/**
 * Default form values for touch point creation
 */
export const getDefaultFormValues = (): z.infer<typeof touchPointFormCreateWithAdvanceSchema> => ({
  name: '',
  enabled: true,
  content_type: TouchPointContentType.URL,
  is_campaign_based: false,
  content_value: '',
  tags: [],
  variants_content: {
    QR: {
      enabled: FORCE_QR_ENABLED,
    },
    NFC: {
      enabled: false,
    },
    WIFI: {
      enabled: false,
    },
  },
  qr_customize_options: {},
  qr_logo_image: QR_CUSTOMIZE_DEFAULT_OPTIONS.image,
  meta_tags: defaultMetaTags,
  utm_tags: defaultUTM,
  conversion_tracking: {
    enabled: false,
  },
})

/**
 * Configuration for animated tabs (touch point types)
 */
export const getAnimatedTabsConfig = (t: (key: string) => string): AnimatedTab[] => [
  {
    id: AllTouchPointVariants.LINK,
    label: (
      <div className="flex gap-1 items-center">
        <div className="w-7 h-7 rounded-[6px] flex items-center justify-center group-data-[state=inactive]:opacity-50 bg-secondary-cyan">
          <Link2Icon className="w-5 h-5 text-white" />
        </div>
        <span className="font-semibold text-lg line-clamp-[24px] text-nowrap">
          {t('touchpoint:touch_point_type.link')}
        </span>
      </div>
    ),
  },
  {
    id: AllTouchPointVariants.QR,
    label: (
      <div className="flex gap-1 items-center">
        <div className="w-7 h-7 rounded-[6px] flex items-center justify-center group-data-[state=inactive]:opacity-50 bg-secondary">
          <ScanQrCode className="w-5 h-5 text-white" />
        </div>
        <span className="font-semibold text-lg line-clamp-[24px] text-nowrap">
          {t('touchpoint:touch_point_type.qr')}
        </span>
      </div>
    ),
  },
]
