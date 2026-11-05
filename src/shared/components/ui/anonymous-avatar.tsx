'use client'

import { cn } from '@/shared/lib/utils'
import { anonymousIdentity, trianglePoints } from '@/shared/lib/anonymous-identity'

interface AnonymousAvatarProps {
  /** `visits.fp` — dấu vết thiết bị, không phải người. */
  fp: string
  size?: number
  className?: string
}

/**
 * Avatar của một thiết bị ẩn danh: SVG dựng từ `fp` bằng code, không file tĩnh, không gọi mạng.
 * Hình dạng và màu nằm trong `@/shared/lib/anonymous-identity` để service dùng chung được.
 */
export function AnonymousAvatar({ fp, size = 24, className }: AnonymousAvatarProps) {
  const { avatar, name } = anonymousIdentity(fp)

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${avatar.viewBoxSize} ${avatar.viewBoxSize}`}
      role="img"
      aria-label={name}
      className={cn('rounded-full shrink-0', className)}
    >
      <rect width={avatar.viewBoxSize} height={avatar.viewBoxSize} fill={avatar.background} />
      {avatar.shapes.map((shape, index) => {
        const common = {
          fill: shape.fill,
          opacity: shape.opacity,
          transform: `rotate(${shape.rotation} ${shape.cx} ${shape.cy})`,
        }
        if (shape.kind === 'circle') {
          return <circle key={index} cx={shape.cx} cy={shape.cy} r={shape.size / 2} {...common} />
        }
        if (shape.kind === 'square') {
          return (
            <rect
              key={index}
              x={shape.cx - shape.size / 2}
              y={shape.cy - shape.size / 2}
              width={shape.size}
              height={shape.size}
              {...common}
            />
          )
        }
        return <polygon key={index} points={trianglePoints(shape)} {...common} />
      })}
    </svg>
  )
}
