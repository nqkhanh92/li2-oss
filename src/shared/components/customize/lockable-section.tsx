import { cn } from '@/shared/lib/utils'
import { Construction, Lock, SparklesIcon } from 'lucide-react'
import React from 'react'
import { cva, VariantProps } from 'class-variance-authority'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

const variants = cva('', {
  variants: {
    variant: {
      block:
        '[&_#item]:pointer-events-none [&_#item]:cursor-not-allowed [&_#item]:opacity-50 [&_#lock]:justify-end',
      blur: '[&_#item]:blur-[1px] [&_#item]:pointer-events-none [&_#item]:opacity-90 [&_#lock]:justify-center',
      hover: '[&_#button]:hidden',
    },
    size: {
      lg: '[&_svg]:w-8 [&_svg]:h-8',
      md: '[&_svg]:w-6 [&_svg]:h-6',
      default: '[&_svg]:w-4 [&_svg]:h-4',
      sm: '[&_svg]:w-2 [&_svg]:h-2',
    },
    position: {
      bottom: '[&_#lock]:flex-col [&_#lock]:items-center [&_#lock]:justify-end [&_#button]:mb-4',
      top: '[&_#button]:top-0',
      left: '[&_#button]:left-0',
      right: '[&_#button]:right-0',
      center: '[&_#button]:justify-center',
    },
  },
  defaultVariants: {
    variant: 'blur',
    size: 'default',
    position: 'center',
  },
})

interface Props extends VariantProps<typeof variants> {
  children: React.ReactNode
  className?: string
  itemClassName?: string
  locked?: boolean
  renderLock?: React.ReactNode
  action?: () => void
  lockBy?: 'plan' | 'org_permission' | 'coming_soon'
  iconEnabled?: boolean
  lockText?: string
}
const mappingIcons = {
  plan: <SparklesIcon />,
  org_permission: <Construction />,
  coming_soon: <Lock />,
}

export function LockableSection({
  children,
  className,
  itemClassName,
  locked = false,
  action,
  variant,
  position,
  size,
  iconEnabled = true,
  lockBy = 'coming_soon',
  lockText,
  renderLock = (
    <Button
      id="button"
      variant="outline"
      type="button"
      className={`border-neutral-500 bg-background gap-2 rounded-full px-3 py-1.5 text-xs font-medium leading-4 h-auto shadow-xs text-foreground hover:bg-white `}
      onClick={action}
    >
      {iconEnabled && mappingIcons[lockBy]}
      {lockText
        ? lockText
        : lockBy === 'plan'
          ? 'Upgrade plan'
          : lockBy === 'org_permission'
            ? 'Need Permission'
            : lockBy === 'coming_soon'
              ? 'Coming soon'
              : 'Locked'}
    </Button>
  ),
}: Props) {
  if (!locked) return children
  return (
    <div
      className={cn(
        'relative flex select-none w-full h-full cursor-not-allowed group/lockable',
        className,
        variants({ variant, position, size })
      )}
    >
      <div id="item" className={cn('w-full h-full', itemClassName)}>
        {children}
      </div>
      <div
        id="lock"
        className={cn(
          'absolute inset-0 flex items-center z-20 w-full h-full bg-[rgba(255,255,255,0.5)]',
          className
        )}
      >
        {variant === 'hover' ? (
          <Tooltip>
            <TooltipTrigger className="w-full opacity-0" asChild>
              <Button type="button" variant="outline">
                {renderLock}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {lockText
                  ? lockText
                  : lockBy === 'plan'
                    ? 'Upgrade plan'
                    : lockBy === 'org_permission'
                      ? 'Need Permission'
                      : lockBy === 'coming_soon'
                        ? 'Coming soon'
                        : 'Locked'}
              </p>
            </TooltipContent>
          </Tooltip>
        ) : (
          renderLock
        )}
      </div>
    </div>
  )
}
