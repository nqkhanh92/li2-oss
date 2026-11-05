import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { cn } from '@/shared/lib/utils'
type Props = {
  content: string | React.ReactElement
  children: React.ReactElement
  className?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  contentClassName?: string
} & React.ComponentProps<typeof Tooltip>
export const CustomToolTip = ({
  content,
  children,
  side = 'bottom',
  contentClassName,
  ...props
}: Props) => {
  return (
    <Tooltip {...props}>
      <TooltipTrigger asChild autoFocus={false} type="button">
        {children}
      </TooltipTrigger>
      <TooltipContent
        side={side}
        className={cn('rounded-[8px] px-4 py-3 max-w-[320px]', contentClassName)}
      >
        <p className="text-sm text-slate-700 leading-relaxed">{content || ''}</p>
      </TooltipContent>
    </Tooltip>
  )
}
