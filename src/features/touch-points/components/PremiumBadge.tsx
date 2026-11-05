'use client'

import { useState } from 'react'
import { Popover, PopoverTrigger, PopoverContent } from '@/shared/components/ui/popover'
import { CrownIcon, SparklesIcon } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { useTranslation } from 'react-i18next'

type Props = {
  btnText?: string
}
export default function PremiumBadge({ btnText }: Props) {
  const { t } = useTranslation(['common'])
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className="flex items-center gap-3"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <span className="text-muted-foreground">{btnText}</span>
          <Badge
            variant="outline"
            className="group relative flex items-center gap-1.5 border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 via-secondary-yellow/5 to-yellow-500/10 px-3 py-1 text-yellow-600 transition-all duration-300 hover:border-yellow-500/50 hover:from-yellow-500/20 hover:via-secondary-yellow/10 hover:to-yellow-500/20 hover:shadow-md dark:text-yellow-500 cursor-pointer"
          >
            <CrownIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12" />
            <span className="font-semibold text-xs">Pro</span>
            <SparklesIcon className="h-3 w-3 opacity-70 transition-all duration-300 group-hover:opacity-100 group-hover:scale-125" />
          </Badge>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 border-yellow-500/20"
        align="start"
        side="top"
        sideOffset={8}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-500/20 to-secondary-yellow/20">
            <CrownIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="font-semibold text-sm leading-none">
              {t('premiumBadge.popoverContent.title')}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {btnText ? (
                <>
                  {btnText} {t('premiumBadge.popoverContent.body.startPart')}{' '}
                  <span className="font-medium text-yellow-600 dark:text-yellow-500">
                    {t('premiumBadge.popoverContent.body.middlePart')}
                  </span>{' '}
                  {t('premiumBadge.popoverContent.body.endPart')}
                </>
              ) : (
                <>{t('premiumBadge.popoverContent.body.placeholder')}</>
              )}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
