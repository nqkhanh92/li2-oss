import { Badge } from '../../ui/badge'
import { cn } from '@/shared/lib/utils'
import { UserPlan } from '@/shared/providers/plan-provider'
import { cva, VariantProps } from 'class-variance-authority'
import React, { forwardRef } from 'react'

export const customBadgeVariants = cva('', {
  defaultVariants: {
    variant: 'default',
    size: 'sm',
  },
  variants: {
    variant: {
      default: 'bg-slate-200 text-slate-600 hover:bg-slate-200',
      premium: 'bg-guest-secondary-default text-primary hover:bg-guest-secondary-default',
      outline: 'border border-slate-300 text-slate-600 bg-transparent',
    },
    size: {
      sm: 'text-[10px] leading-[10px] px-2 py-1 rounded-full',
      md: 'text-xs leading-[14px] px-2.5 py-1.5 rounded-full',
      lg: 'text-sm leading-[16px] px-3 py-2 rounded-full',
    },
  },
})

export interface CustomBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof customBadgeVariants> {
  label?: string
  plan: UserPlan
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
  className?: string
  variant?: 'default' | 'premium' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

const CustomBadge = forwardRef<HTMLDivElement, CustomBadgeProps>(
  ({ label, plan, startIcon, endIcon, className, variant, size, ...props }, ref) => {
    const badgeVariant = variant === 'premium' ? 'default' : variant
    const badgeSize = size === 'sm' ? 'default' : size === 'md' ? 'sm' : 'lg'
    const planName = plan?.plans?.name || ''
    const formattedLabel =
      label ||
      planName
        .toLowerCase()
        .split(' ')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    return (
      <Badge
        variant={badgeVariant}
        size={badgeSize}
        className={cn(
          'truncate font-medium h-auto flex gap-[2px] w-fit items-center',
          customBadgeVariants({ variant, size }),
          className
        )}
        {...props}
      >
        {startIcon && <span className="flex items-center">{startIcon}</span>}
        <span>
          {formattedLabel}
          {variant === 'default' ? ' account' : ''}
        </span>
        {endIcon && <span className="flex items-center">{endIcon}</span>}
      </Badge>
    )
  }
)
CustomBadge.displayName = 'CustomBadge'

export { CustomBadge }
