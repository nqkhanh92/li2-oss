'use client'

import { type ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'

// Shared titled card for the deep-link widget grid. A fixed-height content area gives
// Recharts' responsive container a height to fill; `isEmpty` renders the empty panel.
export function WidgetCard({
  title,
  isEmpty,
  emptyLabel,
  children,
}: {
  title: string
  isEmpty?: boolean
  emptyLabel?: string
  children: ReactNode
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="text-muted-foreground flex h-[240px] items-center justify-center text-sm">
            {emptyLabel}
          </div>
        ) : (
          <div className="h-[240px] w-full">{children}</div>
        )}
      </CardContent>
    </Card>
  )
}
