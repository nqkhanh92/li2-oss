import { Lock } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '@/shared/lib/cn'

type WatermarkButtonProps = {
  children?: React.ReactNode
  isLoading?: boolean
  text?: string
  disabled?: boolean
  isFreePlan?: boolean
  isIcon?: boolean
  direction?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  isComing?: boolean
} & React.ComponentProps<typeof Button>

export const WatermarkButton = ({
  children,
  isLoading,
  text,
  isIcon = true,
  direction = 'center',
  isFreePlan = true,
  isComing = false,
  ...props
}: WatermarkButtonProps) => {
  return isFreePlan ? (
    <>
      {children}
      {isComing && (
        <div
          className={cn(
            'absolute inset-0 z-10 bg-[rgba(255,255,255,0.5)] flex rounded-md p-5 select-none justify-center',
            {
              'items-start': direction === 'top',
              'items-end': direction === 'bottom',
              'justify-start': direction === 'left',
              'justify-end': direction === 'right',
              'items-center': direction === 'center',
            }
          )}
          style={{
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
          }}
        >
          <div className="pointer-events-auto">
            <Button
              variant="outline"
              type="button"
              className="border-neutral-900 bg-white gap-[6px] rounded-full px-3 py-[6px] text-xs font-medium leading-[16px] h-auto"
              {...props}
            >
              {isIcon && <Lock className="w-4 h-4" />}
              {text}
            </Button>
          </div>
        </div>
      )}
    </>
  ) : null
}
