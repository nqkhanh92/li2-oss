'use client'

import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowRight, Globe2, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { getCountryNameFromIso } from '@/shared/utils/geocode'

type CountryFieldValue = {
  id: string
  values: string[]
  destination: string
}

type CountryRuleRowProps = {
  field: CountryFieldValue
  /** All country codes from rows with a lower index, used to compute first-match-wins warning. */
  previousValues: string[]
  onEdit: () => void
  onDelete: () => void
}

export const CountryRuleRow = ({
  field,
  previousValues,
  onEdit,
  onDelete,
}: CountryRuleRowProps) => {
  const { t } = useTranslation('touchpoint')

  const overlap = field.values.filter((v) => previousValues.includes(v))
  const visible = field.values.slice(0, 3)
  const remaining = field.values.length - visible.length

  return (
    <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
      <div className="flex flex-1 flex-col gap-2 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Globe2 className="h-4 w-4 text-slate-600" />
          {visible.length === 0 ? (
            <span className="text-sm text-slate-500">
              {t('smart_targeting.countries.no_countries_selected')}
            </span>
          ) : (
            visible.map((iso2) => (
              <span
                key={iso2}
                className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-foreground"
              >
                {getCountryNameFromIso(iso2)}
              </span>
            ))
          )}
          {remaining > 0 && (
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-foreground">
              +{remaining}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-sm text-slate-700 min-w-0">
          <ArrowRight className="h-4 w-4 shrink-0" />
          <p className="truncate">
            {field.destination || t('smart_targeting.countries.no_destination_set')}
          </p>
        </div>

        {overlap.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 self-start">
            <AlertTriangle className="h-3 w-3" />
            {t('smart_targeting.countries.duplicate_warning', {
              countries: overlap.map(getCountryNameFromIso).join(', '),
            })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={t('smart_targeting.countries.edit_rule')}
          onClick={onEdit}
          iconLeft={<Pencil className="h-4 w-4" />}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={t('smart_targeting.countries.delete_rule')}
          onClick={onDelete}
          iconLeft={<Trash2 className="h-4 w-4" />}
        />
      </div>
    </div>
  )
}
