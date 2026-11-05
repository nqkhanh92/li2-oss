'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Button } from '@/shared/components/ui/button'
import { useOrganizationCurrency, useExchangeRate } from '@/shared/lib/currency'
import {
  useGetCustomerById,
  useGetCustomerJourney,
  useGetCustomerConversions,
  useGetContentViews,
} from '../../hooks/queries'
import { HeaderCard } from './header-card'
import { StatCardsRow } from './stat-cards'
import { JourneyTimelineCard } from './journey-timeline'
import { ContentViewsCard } from './content-views-card'
import { ConversionHistoryCard } from './conversion-history'
import { CustomerSidebar } from './sidebar'

function CustomerDetailV2Skeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start animate-pulse">
      <div className="flex-1 min-w-0 flex flex-col gap-4 w-full">
        <Skeleton className="h-[120px] w-full rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[88px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[280px] w-full rounded-xl" />
        <Skeleton className="h-[200px] w-full rounded-xl" />
      </div>
      <div className="w-full lg:w-[252px] lg:shrink-0 flex flex-col gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

function CustomerDetailV2NotFound() {
  const { t } = useTranslation('customers')
  const router = useRouter()
  const { org_id } = useParams<{ org_id: string }>()

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
      <div className="p-6 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <AlertCircle className="h-10 w-10 text-red-500" />
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {t('detail.not_found', 'Customer not found')}
        </h2>
        <p className="text-s text-slate-500 dark:text-slate-400">
          {t(
            'detail.not_found_desc',
            'The customer you are looking for does not exist or has been deleted.'
          )}
        </p>
      </div>
      <Button
        variant="outline"
        onClick={() => router.push(`/org/${org_id}/customers`)}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('detail.back_to_list', 'Back to customers')}
      </Button>
    </div>
  )
}

export function CustomerDetailV2() {
  const { org_id, customer_id } = useParams<{ org_id: string; customer_id: string }>()

  const { data: customer, isLoading } = useGetCustomerById(org_id, customer_id)
  const { data: journey, isLoading: journeyLoading } = useGetCustomerJourney(org_id, customer_id)
  const { data: conversions = [], isLoading: conversionsLoading } = useGetCustomerConversions(
    org_id,
    customer_id
  )
  const { data: contentViews = [], isLoading: contentViewsLoading } = useGetContentViews(
    org_id,
    customer_id
  )

  // Chỉ bộ thẻ THƯƠNG MẠI dùng hai giá trị này. Vẫn gọi hook vô điều kiện vì hook không được gọi
  // sau một lần `return` sớm, và cả hai đều rẻ (currency đọc từ context, tỉ giá có cache).
  const defaultCurrency = useOrganizationCurrency()
  const { data: usdToVndRate = 1 } = useExchangeRate('USD', 'VND')

  if (isLoading) return <CustomerDetailV2Skeleton />
  if (!customer) return <CustomerDetailV2NotFound />

  const firstVisit = journey?.firstVisit ?? null

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start animate-in fade-in duration-300">
      {/* Left Column */}
      <div className="flex-1 min-w-0 flex flex-col gap-4 w-full">
        <HeaderCard customer={customer} org_id={org_id} />
        <StatCardsRow
          customer={customer}
          views={contentViews}
          metrics={journey?.metrics ?? null}
          defaultCurrency={defaultCurrency}
          usdToVndRate={usdToVndRate}
        />
        <ContentViewsCard views={contentViews} isLoading={contentViewsLoading} org_id={org_id} />
        <JourneyTimelineCard journey={journey} isLoading={journeyLoading} />
        {/*
          Li2 không bán hàng (chốt 2026-11-01), và trên dữ liệu thật mọi cột thương mại đều rỗng.
          Giữ card lại cho org nào vẫn ghi conversion, nhưng không hiện một bảng trống để quảng
          cáo một tính năng không phải mục đích của sản phẩm.
        */}
        {(conversionsLoading || conversions.length > 0) && (
          <ConversionHistoryCard events={conversions} isLoading={conversionsLoading} />
        )}
      </div>

      {/* Right Sidebar */}
      <CustomerSidebar customer={customer} firstVisit={firstVisit} />
    </div>
  )
}
