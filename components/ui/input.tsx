import * as React from 'react'

import { cn } from '@/lib/utils'
import { VariantProps } from 'class-variance-authority'
import { inputVariants } from '@/components/ui/variants'

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  startAdornment?: React.ReactElement
  endAdornment?: React.ReactElement
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, size, startAdornment, endAdornment, ...props }, ref) => {
    const hasAdornment = Boolean(startAdornment) || Boolean(endAdornment)
    return (
      <>
        {hasAdornment ? (
          <div
            className={cn(
              `w-full flex items-center justify-center gap-2 border border-transparent
              px-3 h-10 font-normal rounded-lg flex-1 bg-transparent transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground 
              disabled:cursor-not-allowed disabled:opacity-50`,
              inputVariants({
                variant,
                size,
              }),
              className
            )}
            data-disabled={props.disabled}
          >
            {startAdornment && <div className={cn('text-muted-foreground')}>{startAdornment}</div>}
            <input
              type={type}
              className={cn(
                inputVariants({
                  variant,
                  size,
                }),
                'px-0 not-fill-input border-none outline-hidden flex h-10 w-full font-normal rounded-lg flex-1 bg-transparent transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground disabled:cursor-not-allowed disabled:opacity-50',
                className
              )}
              ref={ref}
              {...props}
            />
            {endAdornment && <div className={cn('text-muted-foreground')}>{endAdornment}</div>}
          </div>
        ) : (
          <input
            type={type}
            className={cn(
              'w-full flex h-10 font-normal rounded-lg px-3 py-1 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
              inputVariants({
                variant,
                size,
              }),
              'hover:border hover:border-slate-200',
              'border border-transparent focus:border focus:border-slate-400 focus-within:border focus-within:border-slate-400',
              className
            )}
            ref={ref}
            {...props}
          />
        )}
      </>
    )
  }
)
Input.displayName = 'Input'

export { Input }
