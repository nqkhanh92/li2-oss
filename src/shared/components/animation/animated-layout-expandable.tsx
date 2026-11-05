'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

export const AnimatedLayoutExpandable = ({ children }: { children: React.ReactNode }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | 'auto'>('auto')

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const newHeight = entry.contentRect.height
          setHeight(newHeight)
        }
      })

      resizeObserver.observe(containerRef.current)
      return () => resizeObserver.disconnect()
    }
  }, [])

  return (
    <motion.div
      style={{ overflow: 'hidden' }}
      animate={{ height }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div ref={containerRef} style={{ width: '100%' }}>
        <div
          ref={contentRef}
          style={{
            width: '100%',
            minHeight: 'fit-content',
            position: 'relative',
          }}
        >
          {children}
        </div>
      </div>
    </motion.div>
  )
}
