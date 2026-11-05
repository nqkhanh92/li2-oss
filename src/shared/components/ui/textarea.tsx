import * as React from 'react'

import { cn } from '@/shared/lib/utils'
import { VariantProps } from 'class-variance-authority'
import { inputVariants } from '@/features/touch-points/constants/variants'

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'> & VariantProps<typeof inputVariants>
>(({ className, variant, size, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex min-h-[60px] w-full rounded-md border not-hover:border-transparent hover:border-input bg-transparent px-3 py-2 text-base shadow-xs placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        inputVariants({
          variant,
          size,
        }),
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = 'Textarea'

export { Textarea }
