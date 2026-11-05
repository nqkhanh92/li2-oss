import { Link2, QrCode, SmartphoneNfc, CrownIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { AllTouchPointVariants } from '@/features/touch-points/types'
import { cn } from '@/shared/lib/utils'
import CountUp from '@/shared/components/animation/count-up'
import { useTranslation } from 'react-i18next'
import React from 'react'

interface ChannelItemProps {
  icon: React.ComponentType<{ className?: string }>
  iconClassName?: string
  label: string | React.ReactNode
  value: number
  className?: string
}

const ChannelItem = ({ icon: Icon, iconClassName, label, value, className }: ChannelItemProps) => {
  return (
    <div className={cn('flex flex-1 gap-4 items-center pr-4 last:pr-0', className)}>
      <div className="bg-slate-50 rounded-lg flex items-center justify-center shrink-0 size-10">
        <Icon className={`size-7 ${iconClassName ?? 'text-slate-500'}`} />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-base text-slate-500 leading-6">{label}</span>
        <CountUp
          from={0}
          to={value}
          separator=","
          direction="up"
          duration={0.5}
          className="text-xl font-medium text-slate-700 leading-7"
        />
      </div>
    </div>
  )
}

type DashboardInteractionChannelsProps = {
  [key in AllTouchPointVariants]: number
}

export const DashboardInteractionChannels = ({ ...data }: DashboardInteractionChannelsProps) => {
  const { t } = useTranslation('dashboard')
  return (
    <Card className="w-full bg-card border border-slate-300 rounded-2xl flex flex-col">
      <CardHeader className="px-6 pt-6 pb-4">
        <CardTitle className="text-base font-medium text-slate-700">
          {t('interaction_channels.label')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0 flex-1 flex items-center">
        <div className="flex w-full">
          <ChannelItem
            icon={Link2}
            iconClassName="text-secondary-dark-cyan"
            label={t('interaction_channels.short_link')}
            value={data.LINK}
          />
          <ChannelItem
            icon={QrCode}
            iconClassName="text-secondary-purple"
            label={t('interaction_channels.scan')}
            value={data.QR}
          />
          <ChannelItem
            icon={SmartphoneNfc}
            iconClassName="text-pink-600"
            label={
              <div className="flex gap-1 items-center">
                {t('interaction_channels.tap')}
                <CrownIcon className="size-4 text-yellow-500" />
              </div>
            }
            value={data.NFC}
          />
        </div>
      </CardContent>
    </Card>
  )
}
