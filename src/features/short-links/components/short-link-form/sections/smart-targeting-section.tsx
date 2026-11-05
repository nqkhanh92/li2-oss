'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import { DefaultDestinationField } from '@/features/short-links/components/smart-targeting/default-destination-field'
import { DevicesSection } from '@/features/short-links/components/smart-targeting/devices-section'
import { CountriesSection } from '@/features/short-links/components/smart-targeting/countries-section'
import {
  parseTargetingToForm,
  type LegacyDrop,
} from '@/features/short-links/components/smart-targeting/legacy-targets'
import type { ShortLinkFormValues } from '@/features/short-links/schemas/short-link-form.schema'

type LegacyDecision = 'pending' | 'kept' | 'cleared'

export const ShortLinkSmartTargetingSection = () => {
  const { t } = useTranslation('touchpoint')
  const { setValue, getValues } = useFormContext<ShortLinkFormValues>()
  const normalizedRef = useRef(false)

  const [legacyDropped, setLegacyDropped] = useState<LegacyDrop[]>([])
  const [legacyDecision, setLegacyDecision] = useState<LegacyDecision>('cleared')

  // On mount, normalize the wire shape into the new form shape.
  // - Lossless decomposition (D5 cases 3-5) is applied immediately and marks
  //   the form dirty so the user has unsaved-changes affordance.
  // - Lossy drops (D5 cases 6-9) wait for an explicit user decision via the
  //   cross-surface banner (D10): "Keep legacy rules" preserves the original
  //   wire shape on save (smart_targeting stays empty, prepareSubmitValues
  //   falls through to the existing targeting). "Clear them" applies the
  //   parsed form and marks dirty.
  useEffect(() => {
    if (normalizedRef.current) return
    normalizedRef.current = true

    const wire = getValues('targeting')
    const { form, dropped, decomposed } = parseTargetingToForm(wire ?? null)

    if (dropped.length > 0) {
      setLegacyDropped(dropped)
      setLegacyDecision('pending')

      // Soft tier: toast describes each dropped rule. Hard tier (banner below)
      // forces a decision before the cross-surface destruction can happen.
      const lines = dropped.map((d) => `• ${d.description}`).join('\n')
      toast.info(
        t('smart_targeting.legacy_dropped_toast', {
          count: dropped.length,
          details: lines,
        }),
        { duration: 10_000 }
      )
      return
    }

    const shouldDirty = decomposed > 0
    setValue('smart_targeting.devices', form.devices, { shouldDirty })
    setValue('smart_targeting.countries', form.countries, { shouldDirty })
  }, [getValues, setValue, t])

  const handleKeepLegacy = () => {
    setLegacyDecision('kept')
  }

  const handleClearLegacy = () => {
    const wire = getValues('targeting')
    const { form } = parseTargetingToForm(wire ?? null)
    setValue('smart_targeting.devices', form.devices, { shouldDirty: true })
    setValue('smart_targeting.countries', form.countries, { shouldDirty: true })
    setLegacyDecision('cleared')
  }

  return (
    <div className="space-y-6">
      {/* <header className="space-y-1">
        <h2 className="text-base font-semibold text-slate-900">
          {t('advancedOptionMenu.items.smart_targeting.title')}
        </h2>
        <p className="text-sm text-slate-500">{t('smart_targeting.description')}</p>
      </header> */}

      <DefaultDestinationField />

      <p className="rounded bg-blue-50 px-3 py-2 text-xs text-blue-700">
        {t('smart_targeting.resolution_order')}
      </p>

      {legacyDecision === 'pending' && legacyDropped.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 p-4 space-y-3">
          <p className="text-sm font-medium text-amber-900">
            {t('smart_targeting.legacy_banner.heading', { count: legacyDropped.length })}
          </p>
          <ul className="text-xs text-amber-800 space-y-1">
            {legacyDropped.map((d, i) => (
              <li key={i}>• {d.description}</li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={handleKeepLegacy}>
              {t('smart_targeting.legacy_banner.keep')}
            </Button>
            <Button type="button" variant="default" size="sm" onClick={handleClearLegacy}>
              {t('smart_targeting.legacy_banner.clear')}
            </Button>
          </div>
        </div>
      )}

      {legacyDecision === 'kept' && (
        <div className="rounded border border-slate-300 bg-slate-50 p-3 text-xs text-slate-700">
          {t('smart_targeting.legacy_banner.kept_notice')}
        </div>
      )}

      <DevicesSection />
      <CountriesSection />
    </div>
  )
}
