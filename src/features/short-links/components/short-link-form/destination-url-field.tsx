import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link2, CheckIcon, XIcon, InfoIcon, Loader2, Link } from 'lucide-react'
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
import { HelperTooltip } from '@/shared/components/customize/helper-tooltip'
import { ShortLinkToggleE2EE, ShortLinkE2EEDescription } from './sections/e2ee-toggle'
import type { ShortLinkFormValues } from '@/features/short-links/schemas/short-link-form.schema'
import { useE2EEStore } from '@/shared/stores/e2ee-encryption-store'

interface DestinationUrlFieldProps {
  control: Control<ShortLinkFormValues>
  urlVerification: boolean | null
  isVerifying: boolean
  name?: FieldPath<ShortLinkFormValues>
  required?: boolean
  isEditMode?: boolean
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

export const DestinationUrlField = ({
  control,
  urlVerification,
  isVerifying,
  name = 'content_value',
  required = false,
  isEditMode = false,
}: DestinationUrlFieldProps) => {
  const { t } = useTranslation(['common', 'touchpoint'])
  const form = useFormContext<ShortLinkFormValues>()
  const { reset: resetE2EE } = useE2EEStore()

  const e2eEncryption = form.watch('privacy_security.e2e_encryption')

  useEffect(() => {
    if (isEditMode) return
    return () => {
      resetE2EE()
    }
  }, [isEditMode, resetE2EE])

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
            <Link className="w-5 h-5 text-slate-500" aria-hidden="true" />
            <span className="flex gap-1 items-center text-sm font-medium text-slate-700">
              {t('touchpoint:touch_point_create.form.destination_url')}
              {required && (
                <span className="text-red-500" aria-label="required">
                  *
                </span>
              )}
              <HelperTooltip description={t('touchpoint:form.tooltips.destination_url')} />
            </span>
            {!isEditMode && (
              <div className="flex-1 flex justify-end">
                <ShortLinkToggleE2EE />
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
              />
            ) : (
              <Input
                variant="default"
                placeholder={t('touchpoint:touch_point_create.form.placeholder')}
                disabled={isVerifying}
                aria-invalid={urlVerification === false}
                aria-busy={isVerifying}
                {...field}
              />
            )}
          </FormControl>
          <FormMessage />

          <ShortLinkE2EEDescription />
        </FormItem>
      )}
    />
  )
}
