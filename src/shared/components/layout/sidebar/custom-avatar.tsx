import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar'
import { cn } from '@/shared/lib/utils'
import { Crown } from 'lucide-react'

interface CustomAvatarProps {
  src?: string | null
  fallbackText?: string
  topDecoration?: React.ReactNode
  size?: number
  className?: string
  avatarClassName?: string
}

export const CustomAvatar = ({
  src,
  fallbackText = 'ME',
  topDecoration = (
    <Crown className="lg:hidden w-[10px] h-[10px] max-w-[10px] max-h-[10px] fill-guest-secondary-default bg-background rounded-full [&_svg]:size-2" />
  ),
  size = 32,
  className,
  avatarClassName,
}: CustomAvatarProps) => {
  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <Avatar
        className={cn('rounded-full overflow-visible', avatarClassName)}
        style={{ width: size, height: size }}
      >
        {src && <AvatarImage src={src} alt="" className="object-cover rounded-full" />}
        <AvatarFallback className="rounded-full text-black text-xs">{fallbackText}</AvatarFallback>
      </Avatar>
      {topDecoration && <div className="absolute -top-1 -right-1">{topDecoration}</div>}
    </div>
  )
}
