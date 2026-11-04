import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'rounded-[8px] inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 shadow-none',
  {
    variants: {
      variant: {
        none: '',
        default: `bg-primary text-primary-foreground hover:bg-primary-light hover:text-primary-foreground disabled:opacity-30`,
        secondary:
          'bg-card text-slate-700 border border-slate-200 focus:border-primary-light hover:text-primary-light disabled:opacity-30',
        tertiary:
          'bg-transparent text-slate-700 hover:bg-slate-50 focus:bg-transparent hover:text-primary-light focus:text-primary-light disabled:opacity-30',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-white',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        success:
          'bg-primary-default text-white hover:bg-secondary-default hover:text-primary-default',
        active: 'text-secondary-default hover:text-secondary-default',
        unactive: 'hover:bg-neutral text-white hover:text-white',
        table: 'bg-neutral-400 text-primary hover:bg-neutral-500',
        table_destructive:
          'bg-red-100 text-destructive hover:text-destructive-foreground hover:bg-destructive',
        outline_destructive:
          'border border-destructive/30 text-destructive bg-background hover:bg-destructive/5',
        special:
          'bg-guest-secondary-default text-guest-primary-dark hover:bg-guest-secondary-default hover:text-white',
      },
      size: {
        xs: 'h-8 px-2 py-1 text-xs font-medium',
        sm: 'h-9 px-4 py-2 text-sm font-medium leading-[20px] [&_svg]:w-[18px] [&_svg]:h-[18px]',
        default:
          'h-10 px-4 py-2 text-[14px] font-medium leading-[20px] [&_svg]:w-[20px] [&_svg]:h-[20px]',
        lg: 'h-14 px-8 py-4 text-[18px] font-semibold leading-[24px] [&_svg]:w-[22px] [&_svg]:h-[22px]',
        icon: 'h-9 w-9',
      },
      icon: {
        left: 'gap-1 flex items-center',
        right: 'gap-1 flex items-center',
        both: 'gap-1 flex items-center',
        none: '',
      },
    },
    compoundVariants: [
      { size: 'sm', icon: 'left', class: 'pl-3' },
      { size: 'sm', icon: 'right', class: 'pr-3' },
      { size: 'default', icon: 'left', class: 'pl-3' },
      { size: 'default', icon: 'right', class: 'pr-3' },
      { size: 'lg', icon: 'left', class: 'pl-7' },
      { size: 'lg', icon: 'right', class: 'pr-7' },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  iconLeft?: React.ReactNode
  iconRight?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, iconLeft, iconRight, children, ...props }, ref) => {
    const iconMode =
      iconLeft && iconRight ? 'both' : iconLeft ? 'left' : iconRight ? 'right' : 'none'
    const classes = cn(buttonVariants({ variant, size, className, icon: iconMode }))

    if (asChild) {
      return (
        <Slot className={classes} ref={ref} {...props}>
          {children}
        </Slot>
      )
    }

    return (
      <button className={classes} ref={ref} {...props}>
        {iconLeft}
        {children}
        {iconRight}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }
