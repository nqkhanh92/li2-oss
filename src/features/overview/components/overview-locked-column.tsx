'use client'

import { useTranslation } from 'react-i18next'
import { Lock, Globe, ShoppingCart } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { PRICING_URL } from '@/shared/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'

interface OverviewLockedColumnProps {
  domain: 'website' | 'conversions'
}

const DOMAIN_CONFIG = {
  website: {
    icon: Globe,
    fakeMetric: '2,841',
    fakeSecondary: '1,203 visitors · 4.2 pg/session',
    fakeTopItems: ['/home', '/pricing', '/features'],
  },
  conversions: {
    icon: ShoppingCart,
    fakeMetric: '147',
    fakeSecondary: '89 leads · 58 sales',
    fakeTopItems: ['Click → Lead: 3.1%', 'Lead → Sale: 65.2%'],
  },
}

export function OverviewLockedColumn({ domain }: OverviewLockedColumnProps) {
  const { t } = useTranslation('overview')
  const config = DOMAIN_CONFIG[domain]
  const Icon = config.icon

  return (
    <Card className="relative overflow-hidden flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Icon className="w-4 h-4 text-muted-foreground" />
          {t(`columns.${domain}.title`)}
        </CardTitle>
      </CardHeader>

      <CardContent className="relative flex-1">
        {/* Blurred placeholder content */}
        <div className="pointer-events-none select-none opacity-40 blur-sm space-y-4">
          <div>
            <p className="text-3xl font-bold text-foreground">{config.fakeMetric}</p>
            <p className="text-sm text-slate-500 mt-1">{config.fakeSecondary}</p>
          </div>
          <div className="space-y-2">
            {config.fakeTopItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{item}</span>
                <span className="text-sm text-slate-500">{80 - i * 18}%</span>
              </div>
            ))}
          </div>
          <div className="h-16 rounded-lg bg-slate-100" />
        </div>

        {/* Upgrade overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{t(`locked.${domain}.title`)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t(`locked.${domain}.description`)}
            </p>
          </div>
          <a href={PRICING_URL} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="default">
              {t('locked.upgradeCta')}
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
