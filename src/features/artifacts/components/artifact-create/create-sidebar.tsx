'use client'

import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/utils'

import {
  ARTIFACT_CREATE_SECTIONS,
  ARTIFACT_SECTION_ICONS,
  ARTIFACT_SECTION_LABELS,
  SHORT_LINK_ONLY_ITEMS,
  shortLinkOnlyView,
  type ArtifactCreateSection,
} from './create-sections'

interface ArtifactCreateSidebarProps {
  selected: ArtifactCreateSection
  onSelect: (section: ArtifactCreateSection) => void
}

/**
 * Cột trái của trang tạo artifact — cùng khung, cùng khoảng cách với `ShortLinkSidebar`, để hai
 * nhánh của cùng một trang không trông như hai sản phẩm.
 *
 * Bốn mục cuối là của Short link và `disabled` thật (không phải `opacity` suông): bấm vào một mục
 * mờ mà không có gì xảy ra còn tệ hơn là không bấm được.
 */
export const ArtifactCreateSidebar = ({ selected, onSelect }: ArtifactCreateSidebarProps) => {
  const { t } = useTranslation(['artifact', 'touchpoint'])

  return (
    <div className="bg-card rounded-xl border border-border p-2">
      <div className="flex flex-col gap-0.5">
        {ARTIFACT_CREATE_SECTIONS.map((section) => {
          const Icon = ARTIFACT_SECTION_ICONS[section]
          const isActive = selected === section
          return (
            <button
              key={section}
              type="button"
              data-testid={`artifact-section-${section}`}
              aria-current={isActive ? 'true' : undefined}
              onClick={() => onSelect(section)}
              className={cn(
                'flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm text-left transition-colors w-full',
                isActive
                  ? 'text-primary bg-primary/5 font-medium'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'w-[18px] h-[18px] shrink-0',
                  isActive ? 'text-primary' : 'text-slate-400'
                )}
              />
              <span className="truncate">{t(ARTIFACT_SECTION_LABELS[section])}</span>
              {section === 'access' && (
                <span
                  className={cn(
                    'ml-auto rounded-full px-2 py-0.5 text-xs font-normal leading-4',
                    isActive ? 'bg-primary text-primary-foreground' : 'bg-green-100 text-green-700'
                  )}
                >
                  {t('artifact:create.sections.access_badge')}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mx-4 my-2 border-t border-border" />
      <p className="px-4 pb-1 text-xs font-medium text-slate-400 uppercase tracking-wide">
        {t('artifact:create.sections.short_link_only')}
      </p>
      <div className="flex flex-col gap-0.5">
        {SHORT_LINK_ONLY_ITEMS.map((key) => {
          const { Icon, labelKey } = shortLinkOnlyView(key)
          return (
            <button
              key={key}
              type="button"
              disabled
              data-testid={`artifact-section-locked-${key}`}
              title={t('artifact:create.sections.short_link_only_hint')}
              className="flex w-full cursor-not-allowed items-center gap-2.5 rounded-lg px-4 py-2 text-left text-sm text-slate-400 opacity-50"
            >
              <Icon className="w-[18px] h-[18px] shrink-0 text-slate-300" />
              <span className="truncate">{t(labelKey)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
