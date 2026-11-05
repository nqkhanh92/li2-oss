import { AnalyticByTagDataType } from '@/app/api/organizations/[org_id]/analytics/by-tags/route'
import {
  AllTouchPointVariants,
  mappingTouchPointVariantInteractions,
} from '@/features/touch-points/types'
import { cn } from '@/shared/lib/utils'
import { LockableSection } from '@/shared/components/customize/lockable-section'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { useTranslation } from 'react-i18next'
import { CrownIcon, Link2, ScanQrCode, SmartphoneNfc } from 'lucide-react'

type Props = {
  data: AnalyticByTagDataType['types']
  showComingSoon?: boolean
  selectedInteractionTypes?: string[]
}

export const InteractionChannels = ({
  data,
  showComingSoon = false,
  selectedInteractionTypes = [],
}: Props) => {
  const { orgPlan } = useOrganizationStoreProvider()
  const { t } = useTranslation(['analytic', 'dashboard'])

  // Map touch point variants to icons and colors
  const channelConfig = {
    [AllTouchPointVariants.LINK]: {
      icon: Link2,
      color: 'text-secondary-dark-cyan',
      label: t(mappingTouchPointVariantInteractions[AllTouchPointVariants.LINK]),
    },
    [AllTouchPointVariants.QR]: {
      icon: ScanQrCode,
      color: 'text-secondary-purple',
      label: t(mappingTouchPointVariantInteractions[AllTouchPointVariants.QR]),
    },
    [AllTouchPointVariants.NFC]: {
      icon: SmartphoneNfc,
      color: 'text-pink-600',
      label: (
        <div
          className="flex items-center gap-1"
          title={t('common:premiumBadge.popoverContent.title')}
        >
          {t(mappingTouchPointVariantInteractions[AllTouchPointVariants.NFC])}{' '}
          <CrownIcon className="w-3 h-3 text-yellow-500" />
        </div>
      ),
    },
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <p className="font-medium text-base text-slate-700">
          {t('dashboard:interaction_channels.label', 'Interaction channels')}
        </p>
      </div>
      <div className="flex flex-col md:flex-row lg:flex-nowrap flex-wrap gap-4 items-start md:items-center w-full">
        {Object.entries(AllTouchPointVariants)?.map(([key, value]) => {
          const count = data.find((d) => d.name === value)?.count || 0
          const config = channelConfig[value as keyof typeof channelConfig]

          if (!config) {
            return null
          }

          const Icon = config.icon

          // Check if this interaction type should be shown
          const hasFilter = selectedInteractionTypes.length > 0
          const isSelected = selectedInteractionTypes.includes(value)
          const shouldShow = !hasFilter || isSelected

          // If filtered out, hide the channel
          if (!shouldShow) {
            return null
          }

          return (
            <div key={key} className="flex flex-1 gap-4 h-12 items-center pr-4">
              <div className="bg-slate-50 flex gap-1 items-center justify-center rounded-lg shrink-0 size-10.5">
                <Icon className={cn('size-7 stroke-2', config.color)} />
              </div>
              <div className="flex flex-1 flex-col gap-1 min-w-0">
                <p className="font-normal text-base leading-6 text-slate-500">{config.label}</p>
                <div className="flex gap-1 items-end w-full">
                  <p className="font-semibold text-xl leading-none text-slate-700">
                    {count.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
