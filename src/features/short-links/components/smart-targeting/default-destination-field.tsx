'use client'

import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Pencil } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useShortLinkFormNavigation } from '@/features/short-links/components/short-link-form/form-navigation-context'
import type { ShortLinkFormValues } from '@/features/short-links/schemas/short-link-form.schema'

/**
 * Read-only summary of the Basic Settings → URL field.
 *
 * The Default Destination is a single source of truth: it lives on
 * `content_value` and is owned by the Basic Settings tab. Smart Targeting
 * shows it for context only — clicking the pencil takes the user to Basic
 * Settings with the destination input focused. This avoids the "two inputs
 * editing the same value" confusion the original implementation had.
 */
export const DefaultDestinationField = () => {
  const { t } = useTranslation('touchpoint')
  const { control } = useFormContext<ShortLinkFormValues>()
  const { goToTab } = useShortLinkFormNavigation()

  const value = useWatch({ control, name: 'content_value' })

  const handleEdit = () => {
    goToTab('basic_editing', { focusField: 'content_value' })
  }

  return (
    <div className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {t('smart_targeting.default_destination.label')}
          </p>
          <p
            className={
              value ? 'mt-1 text-sm text-slate-700 break-all' : 'mt-1 text-sm italic text-slate-400'
            }
          >
            {value || t('smart_targeting.default_destination.empty')}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {t('smart_targeting.default_destination.hint')}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={t('smart_targeting.default_destination.edit_in_basic')}
          onClick={handleEdit}
          iconLeft={<Pencil className="h-4 w-4" />}
        />
      </div>
    </div>
  )
}
