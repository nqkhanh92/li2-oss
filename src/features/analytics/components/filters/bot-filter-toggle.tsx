'use client'

import React from 'react'
import { Switch } from '@/shared/components/ui/switch'
import { Label } from '@/shared/components/ui/label'
import { useTranslation } from 'react-i18next'
import { ResponsivePopover } from '@/shared/components/ui/responsive-popover'
import { InfoIcon } from 'lucide-react'

export interface BotFilterToggleProps {
  /**
   * Current state of bot filter
   * true = exclude bot traffic
   * false = include all traffic
   */
  value: boolean
  /**
   * Callback when toggle state changes
   * @param value - New state (true = exclude, false = include)
   */
  onChange: (value: boolean) => void
  /**
   * Optional: disable the toggle
   */
  disabled?: boolean
}

/**
 * Bot Filter Toggle Component
 *
 * Allows users to toggle between viewing all traffic or excluding bot/crawler traffic
 * from analytics dashboards. Uses a ResponsivePopover to display the description,
 * keeping the component compact and aligned with other filters.
 *
 * @example
 * ```tsx
 * <BotFilterToggle
 *   value={excludeBot}
 *   onChange={(value) => setExcludeBot(value)}
 * />
 * ```
 */
export const BotFilterToggle: React.FC<BotFilterToggleProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const { t } = useTranslation('analytic')

  const handleToggle = (checked: boolean) => {
    onChange(checked)
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg bg-white hover:bg-accent hover:text-accent-foreground transition-colors">
      <Label
        className="text-s font-normal cursor-pointer text-nowrap truncate text-slate-600"
        onClick={() => !disabled && handleToggle(!value)}
      >
        {t('exclude_bot_traffic')}
      </Label>
      <ResponsivePopover
        side="top"
        align="start"
        content={
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t('exclude_bot_traffic_description')}</p>
          </div>
        }
      >
        <InfoIcon className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
      </ResponsivePopover>
      <Switch
        checked={value}
        onCheckedChange={handleToggle}
        disabled={disabled}
        aria-label={t('exclude_bot_traffic')}
      />
    </div>
  )
}

export default BotFilterToggle
