import { Suspense, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link2, CheckIcon, XIcon, InfoIcon, Loader2 } from 'lucide-react'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { CustomToolTip } from '@/shared/components/customize/custom-tooltip'
import { Control, FieldPath, useFormContext } from 'react-hook-form'
import { TouchPointFormValues } from '@/features/touch-points/hooks/use-touch-point-form'
import { E2EEDescription, ToggleE2EE } from '../create-new/toggle-e2ee'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'
import { AllTouchPointVariants } from '@/features/touch-points/types'
import { usePlanFeatures } from '@/features/touch-points/hooks'
import { HelperTooltip } from '@/shared/components/customize/helper-tooltip'

interface DestinationUrlFieldProps {
  control: Control<TouchPointFormValues>
  urlVerification: boolean | null
  isVerifying: boolean
  name?: FieldPath<TouchPointFormValues>
  required?: boolean
  currentTab: AllTouchPointVariants
}

type VerificationStatus = 'verifying' | 'valid' | 'invalid' | 'idle'

const TOOLTIP_CLASS = 'bg-background border-neutral-700 text-slate-900'

const VERIFICATION_CONFIG = {
  verifying: {
    icon: Loader2,
    className: 'mr-2 h-4 w-4 animate-spin',
    tooltipKey: null,
    ariaLabel: 'Verifying URL',
  },
  valid: {
    icon: CheckIcon,
    className: 'mr-2 h-5 w-5 text-green-500',
    tooltipKey: 'touchpoint:touch_point_create.tool_tip.valid_url',
    ariaLabel: 'Valid URL',
  },
  invalid: {
    icon: XIcon,
    className: 'mr-2 h-5 w-5 text-red-500',
    tooltipKey: 'touchpoint:touch_point_create.tool_tip.invalid_url',
    ariaLabel: 'Invalid URL',
  },
  idle: {
    icon: InfoIcon,
    className: 'mr-2 h-5 w-5 text-yellow-500',
    tooltipKey: 'touchpoint:touch_point_create.tool_tip.notification_url',
    ariaLabel: 'URL information',
  },
} as const

/**
 * Destination URL input field with real-time verification status
 *
 * Features:
 * - Real-time URL validation with visual feedback
 * - Accessible verification status indicators
 * - Internationalized labels and tooltips
 * - Configurable field name for reusability
 */
export const DestinationUrlField = ({
  control,
  urlVerification,
  isVerifying,
  name = 'content_value',
  required = false,
  currentTab,
}: DestinationUrlFieldProps) => {
  const { t } = useTranslation(['common', 'touchpoint'])
  const form = useFormContext<TouchPointFormValues>()

  const e2eEncryption = form.watch('privacy_security.e2e_encryption')

  const verificationStatus: VerificationStatus = useMemo(() => {
    if (isVerifying) return 'verifying'
    if (urlVerification === true) return 'valid'
    if (urlVerification === false) return 'invalid'
    return 'idle'
  }, [isVerifying, urlVerification])

  const verificationIcon = useMemo(() => {
    const config = VERIFICATION_CONFIG[verificationStatus]
    const Icon = config.icon
    const icon = <Icon className={config.className} aria-label={config.ariaLabel} />

    if (!config.tooltipKey) {
      return icon
    }

    return (
      <CustomToolTip content={t(config.tooltipKey)} contentClassName={TOOLTIP_CLASS}>
        {icon}
      </CustomToolTip>
    )
  }, [verificationStatus, t])

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="gap-1">
          <FormLabel className="flex flex-row gap-2 items-center">
            <Link2 className="w-6 h-6 text-slate-500" aria-hidden="true" />
            <span className="flex gap-1 items-center text-lg font-semibold text-slate-700 leading-6.5">
              {t('touchpoint:touch_point_create.form.destination_url')}
              {required && (
                <span className="text-red-500" aria-label="required">
                  *
                </span>
              )}
              <HelperTooltip description={t('touchpoint:form.tooltips.destination_url')} />
            </span>
            {currentTab !== AllTouchPointVariants.QR && (
              <div className="flex-1 flex justify-end">
                <ToggleE2EE />
              </div>
            )}
          </FormLabel>
          <FormControl className="py-0">
            {e2eEncryption ? (
              <Input
                variant="default"
                className="bg-neutral-500"
                disabled
                placeholder={t('touchpoint:touch_point_create.form.placeholder')}
                value={`li2-e2ee://${e2eEncryption.cipher}`}
                endAdornment={<span className="flex">{verificationIcon}</span>}
              />
            ) : (
              <Input
                variant="default"
                placeholder={t('touchpoint:touch_point_create.form.placeholder')}
                disabled={isVerifying}
                aria-invalid={urlVerification === false}
                aria-busy={isVerifying}
                {...field}
                // endAdornment={<span className="flex">{verificationIcon}</span>}
              />
            )}
          </FormControl>
          <FormMessage />

          <E2EEDescription />
        </FormItem>
      )}
    />
  )
}
