'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Trophy, LayoutGrid, Target } from 'lucide-react'
import { TouchpointAttributionCards } from './touchpoint-attribution-cards'
import { TouchpointAttributionTable } from './touchpoint-attribution-table'
import { DateRange } from 'react-day-picker'
import { CustomSwitch } from '@/shared/components/customize/custom-switch'
import { ConversionFilterParams } from '@/core/types/conversions'

interface TouchpointAttributionWrapperProps {
  filters: ConversionFilterParams
}

export function TouchpointAttributionWrapper({ filters }: TouchpointAttributionWrapperProps) {
  const { t } = useTranslation('conversions')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table')

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Target className="h-4 w-4" />
            {t('attribution.title', 'Top Performance')}
          </CardTitle>

          {/* View Toggle */}
          {/* <div className="flex gap-2">
            <CustomSwitch
              checked={viewMode === 'table' ? true : false}
              onCheckedChange={(e: boolean) => setViewMode(e ? 'table' : 'cards')}
              className="h-6! w-16 *:size-5 *:flex *:items-center"
              iconPadding={1}
              uncheckedColor="bg-yellow-500"
              checkedLabel={<LayoutGrid className="size-4" />}
              uncheckedLabel={<Trophy className="size-4" />}
            />
          </div> */}
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        <TouchpointAttributionTable filters={filters} />
      </CardContent>
    </Card>
  )
}
