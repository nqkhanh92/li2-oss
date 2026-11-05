'use client'
import React, { useEffect, useRef, useState, Suspense } from 'react'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'

type LazyRenderProps = {
  loader: () => Promise<Record<string, React.ComponentType<any>>>
  exportName?: string
  className?: string
  skeletonHeight?: number | string
  skeletonProps?: React.ComponentProps<typeof SkeletonCard>
}

export function LazyRender({
  loader,
  exportName,
  className,
  skeletonHeight = 200,
  skeletonProps,
}: LazyRenderProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  // Create ONCE — never recreate (prevents unmount/mount flashes)
  const LazyComponentRef = useRef<React.ComponentType | null>(null)
  if (!LazyComponentRef.current) {
    LazyComponentRef.current = React.lazy(async () => {
      const mod = await loader()
      const comp = exportName ? mod[exportName] : (mod as any).default
      if (!comp) throw new Error(`Export "${exportName ?? 'default'}" not found`)
      return { default: comp }
    })
  }
  const LazyComponent = LazyComponentRef.current as React.ComponentType

  useEffect(() => {
    if (!ref.current) return

    const element = ref.current // Capture the current value
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    obs.observe(element)
    return () => obs.disconnect()
  }, [])

  // Only show the skeleton BEFORE first paint. After that, never show a fallback again.
  const [firstPaintDone, setFirstPaintDone] = useState(false)

  return (
    <div ref={ref} className={className}>
      {isVisible ? (
        <Suspense
          fallback={
            firstPaintDone ? null : (
              <SkeletonCard {...skeletonProps} style={{ height: skeletonHeight }} />
            )
          }
        >
          <RenderOnce onFirstPaint={() => setFirstPaintDone(true)}>
            <LazyComponent />
          </RenderOnce>
        </Suspense>
      ) : (
        <SkeletonCard {...skeletonProps} style={{ height: skeletonHeight }} />
      )}
    </div>
  )
}

/** Calls onFirstPaint after child successfully mounts the first time */
function RenderOnce({
  onFirstPaint,
  children,
}: {
  onFirstPaint: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    onFirstPaint()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <>{children}</>
}
