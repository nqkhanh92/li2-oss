import { cn } from '@/shared/lib/utils'
import { Loader2 } from 'lucide-react'
import React from 'react'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { cva, VariantProps } from 'class-variance-authority'

const variants = cva('', {
  variants: {
    variant: {
      default: '',
    },
    size: {
      lg: 'w-8 h-8',
      md: 'w-6 h-6',
      default: 'w-4 h-4',
      sm: 'w-2 h-2',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})

interface Props extends VariantProps<typeof variants> {
  loading: boolean
  children: React.ReactNode
  className?: string
  skeleton?: boolean
}

export function LoadingMask({
  loading,
  children,
  className,
  skeleton = false,
  variant,
  size,
}: Props) {
  return (
    <div className={cn('relative inline-block', className)}>
      {/* Content — transitions opacity/blur so the change fades rather than snaps */}
      <div
        className={cn(
          'transition-[opacity,filter] duration-200',
          loading && !skeleton ? 'blur-[1px] pointer-events-none opacity-70' : '',
          loading && skeleton ? 'invisible' : ''
        )}
      >
        {children}
      </div>

      {/* Skeleton loader (when skeleton mode is enabled) */}
      {skeleton && (
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-200',
            loading ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          <Skeleton className="h-full w-full" />
        </div>
      )}

      {/* Spinner loader (when skeleton mode is disabled) — always rendered so it can fade */}
      {!skeleton && (
        <div
          className={cn(
            'absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-200',
            loading ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          <Loader2 className={cn('animate-spin text-gray-500', variants({ variant, size }))} />
        </div>
      )}
    </div>
  )
}
