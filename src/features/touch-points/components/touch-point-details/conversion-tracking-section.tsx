'use client'

import { useState, useRef } from 'react'
import { TrendingUp, CrownIcon, ExternalLink, CircleHelp } from 'lucide-react'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/shared/components/ui/form'
import { Switch } from '@/shared/components/ui/switch'
import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/shared/components/ui/popover'
import { ResponsivePopover } from '@/shared/components/ui/responsive-popover'
import { useTranslation } from 'react-i18next'
import { Control } from 'react-hook-form'
import { touchPointUpdateSchema } from '@/shared/schemas/touch-points'
import { z } from 'zod'

type ConversionTrackingSectionProps = {
  control: Control<z.infer<typeof touchPointUpdateSchema>>
  hasAccess: boolean
}

/**
 * Conversion Tracking Section Component
 * Displays conversion tracking toggle within Basic Settings
 * Shows premium lock with crown icon inside switch when user lacks access
 *
 * @param control - React Hook Form control from parent form
 * @param hasAccess - Whether the user has access to this premium feature
 */
export const ConversionTrackingSection = ({
  control,
  hasAccess,
}: ConversionTrackingSectionProps) => {
  const { t } = useTranslation(['touchpoint', 'common'])
  const [popoverOpen, setPopoverOpen] = useState(false)
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    if (!hasAccess) {
      setPopoverOpen(true)
    }
  }

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setPopoverOpen(false)
    }, 150)
  }

  return (
    <div className="p-6 bg-card rounded-[16px] space-y-3">
      {/* Conversion Tracking Toggle */}
      <FormField
        control={control}
        name="conversion_tracking.enabled"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <FormLabel className="text-[15px] font-medium text-foreground cursor-pointer">
                    {t('touchpoint:basicSettings.tracking.conversion_tracking.label', {
                      defaultValue: 'Conversion Tracking',
                    })}
                  </FormLabel>
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
                    <Button type="button" variant="ghost" size="icon">
                      <CircleHelp size={16} className="text-slate-500" />
                    </Button>
                  </ResponsivePopover>
                </div>
              </div>
              <FormControl>
                <Popover open={!hasAccess && popoverOpen}>
                  <PopoverTrigger asChild>
                    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                      <Switch
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                        disabled={!hasAccess}
                        className="mt-0.5"
                        uncheckedIcon={
                          !hasAccess ? (
                            <div className="flex items-center justify-center h-full w-full">
                              <CrownIcon className="h-3 w-3 text-yellow-600 dark:text-yellow-500" />
                            </div>
                          ) : undefined
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
                    {/* Premium Upgrade Prompt Only */}
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
            </div>
          </FormItem>
        )}
      />
    </div>
  )
}
