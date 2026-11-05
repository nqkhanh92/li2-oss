'use client'

import { useState } from 'react'
import {
  ArrowLeft,
  BarChart3,
  CopyIcon,
  ScanEye,
  UserRoundCheck,
  CircleDollarSign,
  Share2Icon,
  TrashIcon,
  MoreHorizontalIcon,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { useConfirmDialog } from '@/shared/components/customize/confirm-dialog'
import { useDeleteTouchPoint } from '@/features/touch-points/hooks/mutations'
import { usePlanFeatures } from '@/features/touch-points/hooks/use-plan-features'
import { SharingModal } from '@/features/touch-points/components/sharing'
import { ConversionSummary } from '@/core/types/touch-point.type'
import {
  useOrganizationCurrency,
  useExchangeRate,
  formatCurrencyFromCents,
} from '@/shared/lib/currency'

type Props = {
  shortUrl: string
  handleBack: () => void
  handleCopy: () => void
  visits: number
  conversionSummary?: ConversionSummary
  conversionTrackingEnabled?: boolean
}

export const ShortLinkDetailHeader = ({
  shortUrl,
  handleBack,
  handleCopy,
  visits,
  conversionSummary,
  conversionTrackingEnabled = false,
}: Props) => {
  const { org_id, touch_point_id } = useParams<{ org_id: string; touch_point_id: string }>()
  const router = useRouter()
  const { mutateAsync: deleteTp } = useDeleteTouchPoint(org_id)
  const { confirm } = useConfirmDialog()
  // Pro-only; hidden otherwise (the page would upsell anyway).
  const { enableDeepLinkAttribution } = usePlanFeatures()
  const { t } = useTranslation(['common', 'touchpoint'])

  const [isOpenSharing, setIsOpenSharing] = useState(false)

  const defaultCurrency = useOrganizationCurrency()
  const { data: usdToVndRate = 1 } = useExchangeRate('USD', 'VND')

  const usdCents = conversionSummary?.total_revenue_usd ?? 0
  const vndDong = conversionSummary?.total_revenue_vnd ?? 0
  const displayRevenue =
    defaultCurrency === 'USD'
      ? usdCents + (usdToVndRate > 0 ? Math.round((vndDong / usdToVndRate) * 100) : 0)
      : vndDong + Math.round((usdCents / 100) * usdToVndRate)

  const handleDelete = () => {
    confirm({
      title: t('touchpoint:touch_point_edit.button_list.delete_button'),
      description: t('touchpoint:touch_point_edit.button_list.delete_dialog'),
      confirmButtonText: t('buttons.delete'),
      cancelButtonText: t('buttons.cancel'),
      onConfirm: async () => {
        await deleteTp(touch_point_id)
        handleBack()
      },
      onCancel: () => {},
    })
  }

  return (
    <div className="flex items-center gap-3 w-full min-w-0">
      {/* Back */}
      <ArrowLeft className="w-5 h-5 text-slate-500 cursor-pointer shrink-0" onClick={handleBack} />

      {/* Short URL + copy */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-s font-medium text-foreground truncate" title={shortUrl}>
          {shortUrl}
        </span>
        <Button
          onClick={handleCopy}
          // className="flex items-center justify-center p-1.5 rounded-full hover:bg-slate-100 shrink-0"
          variant={'table'}
          className="size-7 text-secondary-purple"
        >
          <CopyIcon className="w-4 h-4" />
        </Button>
      </div>

      {/* Right: stats + menu */}
      <div className="flex items-center gap-3 shrink-0 ml-auto">
        {/* Stats bar */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-[6px] px-3 h-9">
          {/* Visits */}
          <div className="flex items-center gap-1">
            <ScanEye className="w-[18px] h-[18px] text-secondary-blue" />
            <span className="text-s font-medium text-slate-600 whitespace-nowrap">{visits}</span>
          </div>

          {conversionTrackingEnabled && (
            <>
              <span className="text-s font-medium text-slate-300">|</span>

              {/* Leads */}
              <div className="flex items-center gap-1">
                <UserRoundCheck className="w-[18px] h-[18px] text-secondary-dark-cyan" />
                <span className="text-s font-medium text-slate-600 whitespace-nowrap">
                  {conversionSummary?.lead_count ?? 0}
                </span>
              </div>

              <span className="text-s font-medium text-slate-300">|</span>

              {/* Revenue */}
              <div className="flex items-center gap-1">
                <CircleDollarSign className="w-[18px] h-[18px] text-secondary-orange" />
                <span className="text-s font-medium text-slate-600 whitespace-nowrap">
                  {formatCurrencyFromCents(displayRevenue, defaultCurrency)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* 3-dot menu */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="shrink-0">
              <MoreHorizontalIcon className="w-[18px] h-[18px]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setIsOpenSharing(true)}
              className="flex justify-between"
            >
              {t('buttons.share')} <Share2Icon className="w-4 h-4" />
            </DropdownMenuItem>
            {enableDeepLinkAttribution && (
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/org/${org_id}/deep-link-analytics?tp_ids=${touch_point_id}`)
                }
                className="flex justify-between"
              >
                {t('touchpoint:actions.view_deep_link_analytics')} <BarChart3 className="w-4 h-4" />
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleDelete} className="flex justify-between">
              {t('buttons.delete')} <TrashIcon className="w-4 h-4" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SharingModal open={isOpenSharing} onOpenChange={setIsOpenSharing} url={shortUrl} />
    </div>
  )
}
