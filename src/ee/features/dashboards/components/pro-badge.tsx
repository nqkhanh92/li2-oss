import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'

export function ProBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" size="xs" className={cn('text-violet-500 border-violet-200', className)}>
      PRO
    </Badge>
  )
}
