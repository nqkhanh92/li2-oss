'use client'

import Image from 'next/image'
import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'

interface CustomAvatarProps {
  src?: string | null
  name?: string | null
  email?: string | null
  size?: number
  className?: string
}

export const CustomAvatar = ({ src, name, email, size = 32, className }: CustomAvatarProps) => {
  const initial = ((name || email || '?').charAt(0)).toUpperCase()
  const label = name || email

  const avatar = (
    <div
      className={cn('rounded-full overflow-hidden shrink-0 flex items-center justify-center cursor-pointer', className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={label || ''}
          width={size}
          height={size}
          className="object-cover w-full h-full"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center">
          <span
            className="font-semibold text-white leading-none"
            style={{ fontSize: Math.max(size * 0.45, 8) }}
          >
            {initial}
          </span>
        </div>
      )}
    </div>
  )

  if (!label) return avatar

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{avatar}</TooltipTrigger>
        <TooltipContent side="top" className="p-0 overflow-hidden min-w-40">
          <div className="flex flex-col items-start gap-1 px-3 py-2">
            <div
              className="rounded-full overflow-hidden shrink-0 flex items-center justify-center mb-0.5"
              style={{ width: 32, height: 32 }}
            >
              {src ? (
                <Image src={src} alt={label} width={32} height={32} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center">
                  <span className="font-semibold text-white leading-none" style={{ fontSize: 14 }}>
                    {initial}
                  </span>
                </div>
              )}
            </div>
            <span className="font-semibold text-sm text-foreground leading-tight">
              {(name ?? email)?.split('@')[0]}
            </span>
            {email && <span className="text-xs text-muted-foreground leading-tight">{email}</span>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
