import { TouchPointContentType } from '@/features/touch-points/types'
import { Tables } from '@/shared/types/database.types'
import { TouchPointVariantsContent } from '@/features/touch-points/types'

export type AnonTouchPoint = Tables<'anon_touch_points'> & {
  variants_content: TouchPointVariantsContent
  content_type: TouchPointContentType
  qr_customize_options: any
}
