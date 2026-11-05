'use client'

import { Filter, Monitor, Smartphone, Tablet, Globe, X, MapPin } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/shared/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Separator } from '@/shared/components/ui/separator'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'

interface SessionRecordingsFilterMenuProps {
  filters: Record<string, any>
  setFilter: (key: string, value: any) => void
}

const DEVICE_OPTIONS = [
  { label: 'desktop', value: 'desktop', icon: <Monitor className="w-3.5 h-3.5" /> },
  { label: 'mobile', value: 'mobile', icon: <Smartphone className="w-3.5 h-3.5" /> },
  { label: 'tablet', value: 'tablet', icon: <Tablet className="w-3.5 h-3.5" /> },
]

const BROWSER_OPTIONS = [
  { label: 'Chrome', value: 'Chrome', iconSrc: '/assets/icons/chrome.svg' },
  { label: 'Firefox', value: 'Firefox', iconSrc: '/assets/icons/firefox.svg' },
  { label: 'Safari', value: 'Safari', iconSrc: '/assets/icons/safari.svg' },
  { label: 'Edge', value: 'Edge', iconSrc: '/assets/icons/ms-edge.svg' },
  { label: 'Opera', value: 'Opera', iconSrc: '/assets/icons/opera.svg' },
]

const OS_OPTIONS = [
  { label: 'Windows', value: 'Windows', iconSrc: '/assets/icons/windows.svg' },
  { label: 'macOS', value: 'macOS', iconSrc: '/assets/icons/apple.svg' },
  { label: 'iOS', value: 'iOS', iconSrc: '/assets/icons/apple.svg' },
  { label: 'Android', value: 'Android', iconSrc: '/assets/icons/android.svg' },
  { label: 'Linux', value: 'Linux', iconSrc: '/assets/icons/linux.svg' },
]

function ImgIcon({ src, alt }: { src: string; alt: string }) {
  return <Image src={src} alt={alt} width={13} height={13} className="opacity-70 shrink-0" />
}

function CheckItem({
  label,
  checked,
  onChange,
  icon,
}: {
  label: React.ReactNode
  checked: boolean
  onChange: () => void
  icon?: React.ReactNode
}) {
  return (
    <label className="flex items-center gap-1.5 px-1.5 py-[3px] rounded cursor-pointer hover:bg-slate-50 text-xs text-slate-700 select-none">
      <Checkbox
        checked={checked}
        onCheckedChange={onChange}
        className="w-3.5 h-3.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
      {icon && <span className="text-slate-400">{icon}</span>}
      <span className="flex-1 leading-none">{label}</span>
    </label>
  )
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <p className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
      {icon}
      {label}
    </p>
  )
}

export function SessionRecordingsFilterMenu({
  filters,
  setFilter,
}: SessionRecordingsFilterMenuProps) {
  const { t } = useTranslation('session_recordings')
  const [countryInput, setCountryInput] = useState((filters?.country as string) || '')

  const getArr = (key: string): string[] =>
    Array.isArray(filters?.[key]) ? (filters[key] as string[]) : []

  const toggleMulti = (key: string, value: string) => {
    const current = getArr(key)
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    setFilter(key, updated.length ? updated : null)
  }

  const isChecked = (key: string, value: string) => getArr(key).includes(value)

  const clearAll = () => {
    setFilter('device_types', null)
    setFilter('browsers', null)
    setFilter('oss', null)
    setFilter('country', null)
    setFilter('bounce_filters', null)
    setCountryInput('')
  }

  const activeCount = [
    getArr('device_types').length > 0,
    getArr('browsers').length > 0,
    getArr('oss').length > 0,
    !!filters?.country,
    getArr('bounce_filters').length > 0,
  ].filter(Boolean).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'relative flex items-center justify-center w-10 h-10 rounded-[6px] border bg-card text-slate-600 transition-colors hover:border-slate-400',
            activeCount > 0 ? 'border-[1.5px] border-primary text-primary' : 'border-slate-300'
          )}
          title={t('filters.title', 'Filters')}
        >
          <Filter className="w-[18px] h-[18px]" />
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold leading-none">
              {activeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[320px] p-4" align="end">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-s font-semibold text-foreground">{t('filters.title', 'Filters')}</p>
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-xs text-destructive hover:opacity-75 transition-opacity"
            >
              <X className="w-3 h-3" />
              {t('filters.clear_all', 'Clear all')}
            </button>
          )}
        </div>

        {/* 2-column grid: Device | Browser */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {/* Device */}
          <div>
            <SectionTitle
              icon={<Monitor className="w-3 h-3" />}
              label={t('filters.device_type', 'Device')}
            />
            {DEVICE_OPTIONS.map((opt) => (
              <CheckItem
                key={opt.value}
                checked={isChecked('device_types', opt.value)}
                onChange={() => toggleMulti('device_types', opt.value)}
                icon={opt.icon}
                label={t(`device.${opt.label}`)}
              />
            ))}
          </div>

          {/* Browser */}
          <div>
            <SectionTitle
              icon={<Globe className="w-3 h-3" />}
              label={t('filters.browser', 'Browser')}
            />
            {BROWSER_OPTIONS.map((opt) => (
              <CheckItem
                key={opt.value}
                checked={isChecked('browsers', opt.value)}
                onChange={() => toggleMulti('browsers', opt.value)}
                icon={<ImgIcon src={opt.iconSrc} alt={opt.label} />}
                label={opt.label}
              />
            ))}
          </div>

          {/* OS */}
          <div>
            <SectionTitle icon={<Monitor className="w-3 h-3" />} label={t('filters.os', 'OS')} />
            {OS_OPTIONS.map((opt) => (
              <CheckItem
                key={opt.value}
                checked={isChecked('oss', opt.value)}
                onChange={() => toggleMulti('oss', opt.value)}
                icon={<ImgIcon src={opt.iconSrc} alt={opt.label} />}
                label={opt.label}
              />
            ))}
          </div>

          {/* Session Type */}
          <div>
            <SectionTitle
              icon={<Filter className="w-3 h-3" />}
              label={t('filters.session_type', 'Session')}
            />
            <CheckItem
              checked={isChecked('bounce_filters', 'false')}
              onChange={() => toggleMulti('bounce_filters', 'false')}
              label={t('filters.engaged', 'Engaged')}
            />
            <CheckItem
              checked={isChecked('bounce_filters', 'true')}
              onChange={() => toggleMulti('bounce_filters', 'true')}
              label={t('filters.bounced', 'Bounced')}
            />
          </div>
        </div>

        {/* Country – full width, comma-separated */}
        <Separator className="my-3" />
        <div>
          <p className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
            <MapPin className="w-3 h-3" />
            {t('filters.country', 'Country')}
          </p>
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-[6px] px-2 py-1.5 bg-card focus-within:border-primary transition-colors">
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              value={countryInput}
              onChange={(e) => {
                setCountryInput(e.target.value)
                setFilter('country', e.target.value.trim() || null)
              }}
              placeholder={t('filters.country_placeholder', 'e.g. VN, US, SG')}
              className="flex-1 bg-transparent text-xs text-slate-700 placeholder:text-slate-400 outline-none"
            />
            {countryInput && (
              <button
                onClick={() => {
                  setCountryInput('')
                  setFilter('country', null)
                }}
              >
                <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {t('filters.country_hint', 'Comma-separated ISO codes')}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
