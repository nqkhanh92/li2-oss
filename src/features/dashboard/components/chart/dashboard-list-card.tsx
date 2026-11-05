import { Skeleton } from '../../../../shared/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../shared/components/ui/card'

type DashboardListCardProps = {
  cards: DashboardCard[]
}
export type DashboardCard = {
  title: string
  value?: string
  icon?: React.ComponentType<{ className?: string }>
  isLoading: boolean
  description?: string | React.ReactNode
  hover_description?: string | React.ReactNode
  className?: string
}
export const DashboardListCard = ({ cards }: DashboardListCardProps) => {
  return (
    <div className="w-full grid gap-6 md:grid-cols-6 grid-cols-3">
      {cards.map((card, index) => (
        <Card key={index} className={card.className}>
          <CardHeader className="px-4 py-2 w-full inline-flex flex-row justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              {card.title} {card.icon && <card.icon />}
            </CardTitle>
            {card.hover_description && (
              <div className="mt-0 space-y-0">{card.hover_description}</div>
            )}
          </CardHeader>
          <CardContent className="space-y-2 px-4 py-2">
            {card && <div className="text-2xl font-bold">{card.value}</div>}
            {card.description && <div className="text-muted-foreground">{card?.description}</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
