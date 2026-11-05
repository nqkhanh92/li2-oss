import { useParams } from 'next/navigation'
import { useGetTouchPointSlugs } from '../../hooks/queries'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/shared/components/ui/badge'
import { parse } from 'tldts'
import { Skeleton } from '@/shared/components/ui/skeleton'

export const BackHalfHistory = () => {
  const { org_id, touch_point_id } = useParams<{
    org_id: string
    touch_point_id: string
  }>()
  const { t } = useTranslation(['touchpoint', 'common'])
  const { data: tp, isLoading } = useGetTouchPointSlugs(org_id, touch_point_id)

  const { orgPlan } = useOrganizationStoreProvider()
  const maxSlugs = orgPlan?.max_slugs_per_tp ?? 5

  const domain = useMemo(() => {
    return parse(tp?.short_url || '').hostname
  }, [tp])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-[2px]">
        <h2 className="text-slate-700 text-[15px] font-semibold leading-[22px]">
          {t('touchpoint:touch_point_edit.slugs.back_half_history', {
            maxSlugs: maxSlugs,
          })}
        </h2>
        <p className="text-slate-500 text-[14px] leading-[20px]">
          {t('touchpoint:touch_point_edit.slugs.back_half_history_description')}
        </p>
      </div>
      <div className="flex flex-col gap-1 w-full">
        {isLoading && (
          <>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </>
        )}
        {tp?.slugs?.map((slug) => (
          <div key={slug.id} className="bg-background flex gap-2 items-center w-full">
            <div className="flex gap-1 items-center py-1">
              <p className="text-slate-600 text-[14px] font-medium leading-[20px]">
                https://{domain}/{slug.slug}
              </p>
            </div>
            {(slug.slug === tp?.slug || tp.slugs.length === 1) && (
              <div className="flex flex-1 items-start">
                <Badge variant="success" size="xs" className="italic">
                  {t('common:text.latest')}
                </Badge>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
