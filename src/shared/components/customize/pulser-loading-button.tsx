import React from 'react'
import { Button } from '../ui/button'
import { motion } from 'framer-motion'
import { cn } from '@/shared/lib/utils'

type LoadingButtonProps = React.ComponentProps<typeof Button> & {
  isLoading: boolean
  containerClassName?: string
}

export const PulserLoadingButton = ({
  isLoading,
  containerClassName,
  ...props
}: LoadingButtonProps) => {
  return (
    <Button
      {...props}
      disabled={isLoading || props.disabled}
      className={cn(`relative overflow-hidden ${props.className || ''}`)}
    >
      <motion.div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 30%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.3) 70%, transparent 100%)',
          transform: 'skewX(-15deg)',
          width: '100%',
          height: '100%',
        }}
        initial={{ x: '-200%' }}
        animate={isLoading ? { x: '200%' } : { x: '-200%' }}
        transition={{
          duration: 1.5,
          repeat: isLoading ? Infinity : 0,
          ease: 'linear',
          repeatDelay: 0.5,
        }}
      />
      <div className={cn('relative z-20', containerClassName)}>{props.children}</div>
    </Button>
  )
}
