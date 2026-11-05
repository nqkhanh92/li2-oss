import { useTranslation } from 'react-i18next'
import { Target } from 'lucide-react'

type Props = {
  data: Array<{
    id: string | null
    label: string
    totalVisits: number
    totalUniqueVisits: number
  }>
}

export const ChannelTouchpoints = ({ data }: Props) => {
  const { t } = useTranslation(['analytic'])

  const totalVisits = data.reduce((sum, tp) => sum + tp.totalVisits, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto">
        {data.map((touchpoint, index) => (
          <div
            key={touchpoint.id || `touchpoint-${index}`}
            className="flex gap-3 items-center p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="bg-white flex items-center justify-center rounded-lg shrink-0 size-[48px]">
              <Target className="size-[24px] text-teal-500 stroke-[1.5]" />
            </div>
            <div className="flex flex-1 flex-col gap-1 min-w-0">
              <p className="font-medium text-sm text-slate-700 truncate">{touchpoint.label}</p>
              <div className="flex gap-2 items-center">
                <p className="font-semibold text-lg text-foreground">
                  {touchpoint.totalVisits.toLocaleString()}
                </p>
                <p className="font-normal text-xs text-slate-500">
                  ({((touchpoint.totalVisits / totalVisits) * 100).toFixed(1)}%)
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className="text-xs text-slate-500">Unique</p>
              <p className="font-medium text-sm text-slate-700">
                {touchpoint.totalUniqueVisits.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
