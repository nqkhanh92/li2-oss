'use client'
import { Filter, Tags as TagIcon, Globe, Shapes, CircleDot, X, Search } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/shared/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Separator } from '@/shared/components/ui/separator'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { useTranslation } from 'react-i18next'

import { MERGED_STATUSES, NO_CUSTOM_DOMAIN } from '@/core/helpers/merged-status'

interface FilterOption {
  label: string
  value: string
  color?: string
}

interface ShortLinkFilterMenuProps {
  filters: Record<string, any>
  setFilter: (key: string, value: any) => void
  tags: FilterOption[]
  domains: FilterOption[]
}

/**
 * Năm nhóm, **cộng dồn**: Tag · Domain · Loại · Trạng thái.
 *
 * `Spaces` đã bỏ khỏi đây (chủ sản phẩm 2026-10-27) — route và dữ liệu `collections` giữ nguyên,
 * hộp thoại "Chuyển vào space" vẫn dùng chúng; chỉ mục *lọc* theo space biến mất.
 *
 * Cộng dồn nghĩa là mọi nhóm cùng AND với nhau ở server. Không nhóm nào huỷ nhóm nào, nên chọn
 * "Shortlink" + "Đã gỡ" ra rỗng là **đúng**, không phải lỗi: không link nào có trạng thái đó.
 */
export const ShortLinkFilterMenu = ({
  filters,
  setFilter,
  tags,
  domains,
}: ShortLinkFilterMenuProps) => {
  const { t } = useTranslation(['common', 'touchpoint'])
  const [tagSearch, setTagSearch] = useState('')

  const filteredTags = tagSearch
    ? tags.filter((item) => item.label.toLowerCase().includes(tagSearch.toLowerCase()))
    : tags

  const activeCount = [
    Array.isArray(filters?.tag_ids) && filters.tag_ids.length > 0,
    !!filters?.domain_id,
    !!filters?.row_type,
    !!filters?.status,
  ].filter(Boolean).length

  const toggleTag = (id: string) => {
    const current: string[] = Array.isArray(filters?.tag_ids) ? filters.tag_ids : []
    const updated = current.includes(id) ? current.filter((v) => v !== id) : [...current, id]
    setFilter('tag_ids', updated.length ? updated : null)
  }

  /** Bấm lại lựa chọn đang chọn thì bỏ chọn — người ta không tìm thấy nút "bỏ" cho từng nhóm. */
  const toggleSingle = (key: string, value: string) =>
    setFilter(key, filters?.[key] === value ? null : value)

  const clearAll = () => {
    setFilter('tag_ids', null)
    setFilter('domain_id', null)
    setFilter('row_type', null)
    setFilter('status', null)
  }

  const Chip = ({
    selected,
    onClick,
    children,
  }: {
    selected: boolean
    onClick: () => void
    children: React.ReactNode
  }) => (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs transition-colors',
        selected
          ? 'border-primary bg-primary/5 font-medium text-primary'
          : 'border-slate-200 text-slate-600 hover:border-slate-400'
      )}
    >
      {children}
    </button>
  )

  const Group = ({
    icon: Icon,
    label,
    children,
  }: {
    icon: React.ElementType
    label: string
    children: React.ReactNode
  }) => (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      {children}
    </div>
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* Nút có CHỮ, không phải phễu trơn — chủ sản phẩm 2026-10-27. Một biểu tượng phễu không
            nói cho người chưa từng dùng biết bấm vào thì được gì. */}
        <button
          data-testid="filter-menu-trigger"
          className={cn(
            'flex h-10 items-center gap-2 rounded-[6px] border bg-card px-3 text-s text-slate-600 transition-colors hover:border-slate-400',
            activeCount > 0 ? 'border-[1.5px] border-primary text-primary' : 'border-slate-300'
          )}
        >
          <Filter className="h-[18px] w-[18px]" />
          {t('touchpoint:merged_list.filters.button')}
          {activeCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-xs text-white">{activeCount}</span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[300px] p-4" align="end">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-s font-semibold text-foreground">
              {t('touchpoint:merged_list.filters.button')}
            </p>
            {activeCount > 0 && (
              <button
                onClick={clearAll}
                data-testid="filter-clear-all"
                className="flex items-center gap-1 text-xs text-destructive transition-opacity hover:opacity-75"
              >
                <X className="h-3 w-3" />
                {t('common:filter.clear_all', 'Clear all')}
              </button>
            )}
          </div>

          {/* Loại */}
          <Separator />
          <Group icon={Shapes} label={t('touchpoint:merged_list.filters.type')}>
            <div className="flex flex-wrap gap-1.5">
              {(['artifact', 'link'] as const).map((value) => (
                <Chip
                  key={value}
                  selected={filters?.row_type === value}
                  onClick={() => toggleSingle('row_type', value)}
                >
                  {t(`touchpoint:merged_list.filters.type_${value}`)}
                </Chip>
              ))}
            </div>
          </Group>

          {/* Trạng thái — một danh sách cho cả hai loại. Xem `getMergedStatus`. */}
          <Separator />
          <Group icon={CircleDot} label={t('touchpoint:merged_list.filters.status')}>
            <div className="flex flex-wrap gap-1.5">
              {MERGED_STATUSES.map((value) => (
                <Chip
                  key={value}
                  selected={filters?.status === value}
                  onClick={() => toggleSingle('status', value)}
                >
                  {t(`touchpoint:merged_list.filters.status_${value}`)}
                </Chip>
              ))}
            </div>
          </Group>

          {/* Domain */}
          <Separator />
          <Group icon={Globe} label={t('touchpoint:merged_list.filters.domain')}>
            {domains.length === 0 ? (
              <p className="text-xs text-slate-400">{t('common:form.no_result', 'No results')}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {[
                  ...domains,
                  {
                    value: NO_CUSTOM_DOMAIN,
                    label: t('touchpoint:merged_list.filters.domain_none'),
                  },
                ].map((item) => (
                  <Chip
                    key={item.value}
                    selected={filters?.domain_id === item.value}
                    onClick={() => toggleSingle('domain_id', item.value)}
                  >
                    {item.label}
                  </Chip>
                ))}
              </div>
            )}
          </Group>

          {/* Tag */}
          <Separator />
          <Group icon={TagIcon} label={t('common:filter.search_by_tag', 'Tags')}>
            <div className="flex items-center gap-1.5 rounded-[6px] border border-slate-200 bg-card px-2 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder={t('common:form.search', 'Search...')}
                className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
              />
              {tagSearch && (
                <button onClick={() => setTagSearch('')}>
                  <X className="h-3 w-3 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>
            <div className="flex max-h-32 flex-col gap-0.5 overflow-y-auto">
              {filteredTags.length === 0 ? (
                <p className="py-2 text-center text-xs text-slate-400">
                  {t('common:form.no_result', 'No results')}
                </p>
              ) : (
                filteredTags.map((tag) => (
                  <label
                    key={tag.value}
                    className="text-s flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-slate-700 hover:bg-slate-50"
                  >
                    <Checkbox
                      checked={
                        Array.isArray(filters?.tag_ids) && filters.tag_ids.includes(tag.value)
                      }
                      onCheckedChange={() => toggleTag(tag.value)}
                      className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                    />
                    {tag.color && (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: tag.color }}
                      />
                    )}
                    <span className="flex-1 truncate">{tag.label}</span>
                  </label>
                ))
              )}
            </div>
          </Group>
        </div>
      </PopoverContent>
    </Popover>
  )
}
