'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import dayjs from '@/shared/lib/dayjs'
import { Skeleton } from '@/shared/components/ui/skeleton'
import type { ContentView } from '../../types'

interface ContentViewsCardProps {
  views: ContentView[]
  isLoading: boolean
  org_id: string
}

/**
 * "Đã xem những gì" — lý do duy nhất khách này tồn tại trong DB, mà trước đây không chỗ nào hiện.
 *
 * ⚠ `artifact_views` giữ MỘT hàng cho mỗi (nội dung, khách) với `view_count`, không giữ từng lần
 * mở. Nên chỉ nói được "mở N lần, lần đầu … lần gần nhất …" — không có mốc thời gian của N−2 lần
 * ở giữa, và card này không được giả vờ là có.
 */
export function ContentViewsCard({ views, isLoading, org_id }: ContentViewsCardProps) {
  const { t } = useTranslation('customers')

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] overflow-hidden flex flex-col gap-4">
      <div className="flex items-center justify-between pt-6 px-6">
        <h3 className="text-base font-medium text-slate-700 dark:text-slate-300">
          {t('detail.content_views.title', 'Đã xem những gì')}
        </h3>
        {!isLoading && views.length > 0 && (
          <span className="text-xs text-slate-400">
            {t('detail.content_views.count', '{{count}} nội dung', { count: views.length })}
          </span>
        )}
      </div>

      <div className="pb-6 px-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : views.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 py-2 text-center">
            {t('detail.content_views.empty', 'Chưa mở nội dung nào')}
          </p>
        ) : (
          <div className="rounded-md border border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
            {views.map((view) => (
              <div key={view.artifact_id} className="flex items-center gap-3 px-3 py-2.5">
                <FileText className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                <div className="min-w-0 flex-1 flex flex-col">
                  <Link
                    href={`/org/${org_id}/artifacts/${view.artifact_id}`}
                    className="text-s font-medium text-foreground dark:text-slate-200 truncate hover:text-primary transition-colors"
                  >
                    {view.name}
                  </Link>
                  <span className="text-[10px] text-slate-400">
                    {view.first_viewed_at
                      ? t('detail.content_views.first_opened', 'Mở lần đầu {{date}}', {
                          date: dayjs(view.first_viewed_at).format('MMM D, YYYY · h:mm A'),
                        })
                      : '—'}
                  </span>
                </div>
                <div className="shrink-0 flex flex-col items-end">
                  <span className="text-s font-medium text-foreground dark:text-slate-200">
                    {t('detail.content_views.opens', '{{count}} lần mở', {
                      count: view.open_count,
                    })}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {view.last_viewed_at ? dayjs(view.last_viewed_at).fromNow() : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
