import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ExternalLink,
  Share2,
  RectangleEllipsis,
  CrownIcon,
  CircleHelp,
  GoalIcon,
  LockIcon,
  HelpCircleIcon,
} from 'lucide-react'
import { FormLabel, FormControl, FormField, FormItem } from '@/shared/components/ui/form'
import { Button } from '@/shared/components/ui/button'
import { Switch } from '@/shared/components/ui/switch'
import { Popover, PopoverTrigger, PopoverContent } from '@/shared/components/ui/popover'
import { ResponsivePopover } from '@/shared/components/ui/responsive-popover'
import { useIsTablet } from '@/shared/hooks/use-mobile'
import { Control } from 'react-hook-form'
import { touchPointFormCreateWithAdvanceSchema } from '@/shared/schemas/touch-points'
import { z } from 'zod'
import { HelperTooltip } from '@/shared/components/customize/helper-tooltip'
import { CustomSwitch } from '@/shared/components/customize/custom-switch'

interface AdvancedSettingsSectionProps {
  isUtmDirty: boolean
  isMetaTagsDirty: boolean
  isPasswordDirty: boolean
  onUtmClick: () => void
  onMetaTagsClick: () => void
  onPasswordClick: () => void
  control?: Control<z.infer<typeof touchPointFormCreateWithAdvanceSchema>>
  hasConversionTrackingAccess?: boolean
}

/**
 * Advanced settings section with UTM, Meta tags, Password buttons and Conversion Tracking toggle
 */
export const AdvancedSettingsSection = ({
  isUtmDirty,
  isMetaTagsDirty,
  isPasswordDirty,
  onUtmClick,
  onMetaTagsClick,
  onPasswordClick,
  control,
  hasConversionTrackingAccess = false,
}: AdvancedSettingsSectionProps) => {
  const isTablet = useIsTablet()
  const { t } = useTranslation(['common', 'touchpoint'])
  const [popoverOpen, setPopoverOpen] = useState(false)
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    if (!hasConversionTrackingAccess) {
      setPopoverOpen(true)
    }
  }

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setPopoverOpen(false)
    }, 150)
  }

  const activeClass = 'text-primary-light border-primary-light'
  const inactiveClass = 'border-slate-200 text-slate-700'

  return (
    <div className="flex flex-col gap-3 w-full">
      <FormLabel className="leading-5.5 font-medium flex gap-1 items-center">
        {t('common:module.advanced_settings')}{' '}
        <HelperTooltip description={t('touchpoint:form.tooltips.advanced_settings')} />
      </FormLabel>
      <div className="flex flex-row flex-wrap items-center gap-4">
        <Button
          size="sm"
          type="button"
          variant="secondary"
          onClick={onUtmClick}
          className={`${isUtmDirty ? activeClass : inactiveClass} gap-1`}
        >
          <span className="flex items-center gap-1 text-slate-700">
            <GoalIcon size={18} />
            {t('touchpoint:advancedSettings.buttons.showUtmModal')}
          </span>
        </Button>
        {isTablet && (
          <Button
            size="sm"
            type="button"
            onClick={onMetaTagsClick}
            variant="secondary"
            className={`${isMetaTagsDirty ? activeClass : inactiveClass} gap-1`}
          >
            <Share2 />
            {t('touchpoint:advancedSettings.buttons.showLinkPreviewModal')}
          </Button>
        )}
        <Button
          size="sm"
          type="button"
          onClick={onPasswordClick}
          variant="secondary"
          className={`${isPasswordDirty ? activeClass : inactiveClass} gap-1`}
        >
          <LockIcon />
          {t('touchpoint:advancedSettings.buttons.showPasswordModal')}
        </Button>
      </div>
      {/* Conversion Tracking Inline Toggle */}
      {control && (
        <FormField
          control={control}
          name="conversion_tracking.enabled"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <div className="inline-flex items-center gap-2 h-9 text-s text-slate-500">
                <FormControl>
                  <Popover open={!hasConversionTrackingAccess && popoverOpen}>
                    <PopoverTrigger asChild>
                      <div
                        className="flex items-center"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                      >
                        <CustomSwitch
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                          disabled={!hasConversionTrackingAccess}
                          className="w-10"
                          checkedLabel=""
                          uncheckedLabel=""
                          thumbIcon={
                            <div className="flex items-center justify-center h-full w-full">
                              <CrownIcon className="h-3 w-3 text-yellow-600 dark:text-yellow-500" />
                            </div>
                          }
                        />
                      </div>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-80 border-yellow-500/20"
                      align="end"
                      side="top"
                      sideOffset={4}
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-500/20 to-secondary-yellow/20">
                          <CrownIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <h4 className="font-semibold text-sm leading-none">
                            {t('common:premiumBadge.popoverContent.title')}
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {t('common:premiumBadge.popoverContent.body.placeholder')}
                          </p>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </FormControl>
                <span
                  className="cursor-pointer select-none"
                  onClick={() => hasConversionTrackingAccess && field.onChange(!field.value)}
                >
                  {t('touchpoint:basicSettings.tracking.conversion_tracking.label', {
                    defaultValue: 'Conversion Tracking',
                  })}
                </span>
                <ResponsivePopover
                  content={
                    <div className="space-y-3 max-w-sm">
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {t('touchpoint:basicSettings.tracking.conversion_tracking.description', {
                          defaultValue:
                            'Track conversions when visitors click through this link. This helps measure the effectiveness of your campaigns and understand user behavior.',
                        })}
                      </p>
                      <a
                        href="https://docs.li2.ai/vi/conversion-tracking/overview"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-500 dark:hover:text-blue-400 transition-colors group font-medium"
                      >
                        <span>{t('common:actions.learnMore')}</span>
                        <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </a>
                    </div>
                  }
                  align="start"
                  side="top"
                >
                  <button type="button" className="text-slate-500 hover:text-slate-700">
                    <HelpCircleIcon className="w-4 h-4 text-secondary-blue" />
                  </button>
                </ResponsivePopover>
              </div>
            </FormItem>
          )}
        />
      )}
    </div>
  )
}
