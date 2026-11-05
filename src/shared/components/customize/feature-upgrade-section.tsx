'use client'

import { SparklesIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import { Typography } from '@/shared/components/ui/typography'
import Link from 'next/link'
import { PRICING_URL } from '@/shared/constants'

interface FeatureUpgradeSectionProps {
  title: string
  description: string
}

export const FeatureUpgradeSection = ({ title, description }: FeatureUpgradeSectionProps) => {
  const { t } = useTranslation('common')

  return (
    <div className="flex flex-col items-center justify-center py-6 sm:py-16 gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="p-4 bg-amber-50 rounded-full">
          <SparklesIcon className="w-8 h-8 text-amber-500" />
        </div>
        <Typography
          component="h3"
          size="l"
          weight="semibold"
          className="text-foreground whitespace-nowrap max-sm:whitespace-normal max-sm:text-center"
        >
          {title}
        </Typography>
        <p className="text-sm text-slate-500 max-w-md">{description}</p>
      </div>
      <Link href={PRICING_URL}>
        <Button variant="default" className="gap-2" iconLeft={<SparklesIcon className="w-4 h-4" />}>
          {t('cta.upgrade_plan')}
        </Button>
      </Link>
    </div>
  )
}
