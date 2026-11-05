import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from '@/shared/components/ui/table'
import { useTranslation } from 'react-i18next'
import { AnalyticByTouchPointParams, useGetAnalyticByDestination } from '../../hooks/queries'
import { Badge } from '@/shared/components/ui/badge'
import { useShowTouchPoint } from '@/features/touch-points/hooks/queries'

interface Props {
  org_id: string
  tp_id: string
  params: {
    date_range: { from: Date | string; to: Date | string }
    exclude_bot: boolean
  }
}
export const DestinationTable = ({ org_id, tp_id, params }: Props) => {
  const { data } = useGetAnalyticByDestination(org_id, tp_id, params)
  const { t } = useTranslation('analytic')

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-200">
              <TableHead className="w-[200px] px-2 py-2 text-sm font-medium text-slate-500">
                {t('label.destination')}
              </TableHead>
              <TableHead className="flex-1 px-2 py-2 text-sm font-medium text-slate-500 text-center">
                {t('label.destination_type')}
              </TableHead>
              <TableHead className="flex-1 px-2 py-2 text-sm font-medium text-slate-500 text-center">
                {t('label.status')}
              </TableHead>
              <TableHead className="flex-1 px-2 py-2 text-sm font-medium text-slate-500 text-center">
                {t('label.total_visits')}
              </TableHead>
              <TableHead className="flex-1 px-2 py-2 text-sm font-medium text-slate-500 text-center">
                {t('label.unique_visits')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.destinations || []).map((item) => {
              const destinationType =
                item.segment_type === 'default'
                  ? t('label.main_destination')
                  : t('label.smart_targeting_destination')

              const visits = data?.analytics.find(
                (a) => a.destination === item.destination && a.segment_type === item.segment_type
              )
              return (
                <TableRow key={item.destination} className="h-[50px] border-b border-slate-200">
                  <TableCell className="w-[200px] max-w-[200px] px-2 py-1">
                    <div
                      className="truncate text-sm font-medium text-foreground"
                      title={item.destination}
                    >
                      {item.destination}
                    </div>
                  </TableCell>
                  <TableCell className="flex-1 px-2 py-1 text-center text-sm font-medium text-foreground">
                    {destinationType}
                  </TableCell>
                  <TableCell className="flex-1 px-2 py-1">
                    <div className="flex justify-center">
                      {item.type === 'current' ? (
                        <Badge className="bg-green-50 text-green-800 hover:bg-green-50 gap-1 px-3 py-1 rounded-full">
                          <div className="size-2 rounded-full bg-green-600" />
                          <span className="text-xs font-medium text-nowrap">
                            {t('label.active')}
                          </span>
                        </Badge>
                      ) : (
                        <Badge className="bg-red-50 text-red-800 hover:bg-red-50 gap-1 px-3 py-1 rounded-full">
                          <div className="size-2 rounded-full bg-red-600" />
                          <span className="text-xs font-medium text-nowrap">
                            {t('label.inactive')}
                          </span>
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="flex-1 px-2 py-1 text-center text-sm font-medium text-foreground">
                    {visits?.total_visits ?? 0}
                  </TableCell>
                  <TableCell className="flex-1 px-2 py-1 text-center text-sm font-medium text-foreground">
                    {visits?.unique_visits ?? 0}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
