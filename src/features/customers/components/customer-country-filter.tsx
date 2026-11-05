'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'next/navigation'
import { Globe, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { cn } from '@/shared/lib/utils'
import { useGetCustomerCountries } from '../hooks/queries'
import { countryCodeToFlag, getCountryName } from '@/shared/lib/location'

interface CustomerCountryFilterProps {
  selectedCountries: string[]
  onSelectionChange: (countries: string[]) => void
}

export function CustomerCountryFilter({
  selectedCountries,
  onSelectionChange,
}: CustomerCountryFilterProps) {
  const { t } = useTranslation('customers')
  const { org_id } = useParams<{ org_id: string }>()
  const [open, setOpen] = useState(false)

  const { data: countries, isLoading } = useGetCustomerCountries(org_id)

  const toggle = (country: string) => {
    if (selectedCountries.includes(country)) {
      onSelectionChange(selectedCountries.filter((c) => c !== country))
    } else {
      onSelectionChange([...selectedCountries, country])
    }
  }

  const displayText =
    selectedCountries.length === 0
      ? t('filters.all_countries', 'All countries')
      : selectedCountries.length === 1
        ? `${countryCodeToFlag(selectedCountries[0])} ${getCountryName(selectedCountries[0])}`
        : `${t('filters.country', 'Country')} (${selectedCountries.length})`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 bg-white border rounded-[6px] px-4 py-[9px] text-sm hover:bg-slate-50 transition-colors',
            selectedCountries.length > 0
              ? 'border-primary text-foreground'
              : 'border-slate-300 text-slate-600'
          )}
        >
          <Globe className="h-[18px] w-[18px] shrink-0" />
          <span>{displayText}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[220px] p-2 rounded-[4px] border-slate-100 shadow-[0px_4px_8px_rgba(5,27,68,0.08)]"
        align="start"
      >
        {/* Clear filters row */}
        <button
          className="flex items-center gap-2 w-full px-4 py-1.5 rounded-[4px] hover:bg-slate-50 transition-colors"
          onClick={() => onSelectionChange([])}
        >
          <span className="flex-1 text-left text-sm text-slate-700">
            {t('filters.clear_filters', 'Clear filters')}
          </span>
          <X className="h-4 w-4 text-slate-400 shrink-0" />
        </button>

        <div className="h-px bg-slate-300 my-2" />

        {/* Section label */}
        <p className="px-4 pb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {t('filters.country', 'Countries')}
        </p>

        {/* Country list */}
        <div className="flex flex-col gap-1">
          {isLoading ? (
            <p className="px-4 py-2 text-sm text-slate-400">Loading...</p>
          ) : countries?.length === 0 ? (
            <p className="px-4 py-2 text-sm text-slate-400">No countries found</p>
          ) : (
            countries?.map((item) => {
              const checked = selectedCountries.includes(item.country)
              return (
                <button
                  key={item.country}
                  className={cn(
                    'flex items-center gap-2 w-full px-4 py-1.5 rounded-[4px] text-left transition-colors',
                    checked ? 'bg-slate-50' : 'hover:bg-slate-50'
                  )}
                  onClick={() => toggle(item.country)}
                >
                  {/* Square checkbox */}
                  <span
                    className={cn(
                      'flex items-center justify-center h-4 w-4 shrink-0 rounded-[3px] border',
                      checked ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-300'
                    )}
                  >
                    {checked && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span
                    className={cn(
                      'flex-1 text-sm',
                      checked ? 'font-medium text-foreground' : 'font-normal text-slate-700'
                    )}
                  >
                    {getCountryName(item.country)}
                  </span>
                  {checked && (
                    <span className="text-[11px] font-medium text-foreground">{item.count}</span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
