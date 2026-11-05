'use client'

import { useTranslation } from 'react-i18next'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { EmptySection } from '@/shared/components/customize/empty-section'
import type { OverviewLinksData } from '../types'

interface OverviewTopLinksCardProps {
  data: OverviewLinksData
}

export function OverviewTopLinksCard({ data }: OverviewTopLinksCardProps) {
  const { t } = useTranslation('overview')
  const { org_id } = useParams<{ org_id: string }>()

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          {t('columns.links.topLinks')}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1">
        {data.topLinks.length === 0 ? (
          <EmptySection
            size="sm"
            title={t('columns.links.empty.title')}
            description={t('columns.links.empty.description')}
          />
        ) : (
          <div className="space-y-1.5">
            {data.topLinks.slice(0, 3).map((link, i) => (
              <Link
                key={link.slug ?? `link-${i}`}
                href={
                  link.slug
                    ? `/org/${org_id}/analytics?slug=${link.slug}`
                    : `/org/${org_id}/analytics`
                }
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 transition-colors"
              >
                <span className="truncate text-slate-700 max-w-[70%]">{link.name}</span>
                <span className="font-medium text-foreground">{link.count.toLocaleString()}</span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
