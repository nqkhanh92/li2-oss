'use client'

import { useState } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { CountryRuleRow } from './country-rule-row'
import { CountryRuleDialog } from './country-rule-dialog'
import { safeRandomId } from './legacy-targets'
import type { ShortLinkFormValues } from '@/features/short-links/schemas/short-link-form.schema'

export const CountriesSection = () => {
  const { t } = useTranslation('touchpoint')
  const { control } = useFormContext<ShortLinkFormValues>()
  const { fields, append, update, remove } = useFieldArray({
    control,
    name: 'smart_targeting.countries',
  })

  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {t('smart_targeting.countries.heading')}
        </h3>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setAdding(true)}
          iconLeft={<Plus className="h-4 w-4" />}
        >
          {t('smart_targeting.countries.add_rule')}
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-xs text-slate-500">{t('smart_targeting.countries.empty')}</p>
      ) : (
        <div className="space-y-2">
          {(() => {
            // Single pass: pass each row a snapshot of all earlier rows' values
            // so the duplicate-warning chip (D4 / S5) is O(N) total instead of
            // O(N²) per render.
            const seen: string[] = []
            return fields.map((field, idx) => {
              const previousValues = seen.slice()
              seen.push(...field.values)
              return (
                <CountryRuleRow
                  key={field.id}
                  field={field}
                  previousValues={previousValues}
                  onEdit={() => setEditingIndex(idx)}
                  onDelete={() => remove(idx)}
                />
              )
            })
          })()}
        </div>
      )}

      {adding && (
        <CountryRuleDialog
          onSubmit={(data) => {
            append({ id: safeRandomId(), values: data.values, destination: data.destination })
            setAdding(false)
          }}
          onClose={() => setAdding(false)}
        />
      )}

      {editingIndex !== null && fields[editingIndex] && (
        <CountryRuleDialog
          initialData={{
            values: fields[editingIndex].values,
            destination: fields[editingIndex].destination,
          }}
          onSubmit={(data) => {
            update(editingIndex, {
              id: fields[editingIndex].id,
              values: data.values,
              destination: data.destination,
            })
            setEditingIndex(null)
          }}
          onClose={() => setEditingIndex(null)}
          onDelete={() => {
            remove(editingIndex)
            setEditingIndex(null)
          }}
        />
      )}
    </section>
  )
}
