import { cn } from '@/shared/lib/utils'
import type { ReactNode } from 'react'

export const GridPatternBg = ({
  children,
  className,
  gridSize = 45,
}: {
  children?: ReactNode
  className?: string
  gridSize?: number
}) => {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Grid lines */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, #CBD5E1 1px, transparent 1px),
            linear-gradient(to bottom, #CBD5E1 1px, transparent 1px)
          `,
          backgroundSize: `${gridSize}px ${gridSize}px`,
        }}
      />
      {/* Fade overlay — transparent at top-center, white at edges/bottom */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 80% at 50% -10%, transparent 0%, white 100%)',
        }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  )
}
