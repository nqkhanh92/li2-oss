import * as React from 'react'
import * as SwitchPrimitives from '@radix-ui/react-switch'
import { motion } from 'framer-motion'
import { cn } from '@/shared/lib/utils'
import { cva, VariantProps } from 'class-variance-authority'

const switchVariants = cva('text-white', {
  variants: {
    variant: {
      default: 'text-white ',
    },
    size: {
      default:
        'h-5 [&_.switch-thumb]:size-4 [&_.switch-thumb>svg]:size-2.5 data-[state=checked]:[&_.switch-label]:left-2 data-[state=unchecked]:[&_.switch-label]:right-2',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})

interface CustomSwitchProps
  extends
    React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>,
    VariantProps<typeof switchVariants> {
  checkedLabel?: string | React.ReactNode
  uncheckedLabel?: string | React.ReactNode
  checkedColor?: string
  uncheckedColor?: string
  checked?: boolean
  iconPadding?: number
  thumbIcon?: React.ReactNode | { checked: React.ReactNode; unchecked: React.ReactNode }
  onCheckedChange?: (checked: boolean) => void
}

export const CustomSwitch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  CustomSwitchProps
>(
  (
    {
      className,
      checkedLabel = 'ON',
      uncheckedLabel = 'OFF',
      checkedColor = 'bg-green-600',
      uncheckedColor = 'bg-slate-300',
      checked,
      iconPadding = 1,
      thumbIcon,
      onCheckedChange,
      variant,
      size,
    },
    ref
  ) => {
    const [selfChecked, setSelfChecked] = React.useState<boolean | undefined>(checked)
    const control = {
      checked: checked ?? selfChecked,
      onCheckedChange: (checked: boolean) => {
        setSelfChecked(checked)
        onCheckedChange?.(checked)
      },
    }
    const icon = React.useMemo(() => {
      if (!thumbIcon) return null
      if (thumbIcon instanceof Object && 'checked' in thumbIcon && 'unchecked' in thumbIcon) {
        return control.checked ? thumbIcon.checked : thumbIcon.unchecked
      }
      return thumbIcon
    }, [control.checked])

    return (
      <SwitchPrimitives.Root
        className={cn(
          'peer relative inline-flex w-16 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
          control.checked ? checkedColor : uncheckedColor,
          switchVariants({ variant, size }),
          className
        )}
        {...control}
        ref={ref}
      >
        {/* Label inside switch */}
        <span
          className={cn('switch-label absolute text-xs font-semibold transition-all duration-200')}
        >
          {control.checked ? checkedLabel : uncheckedLabel}
        </span>

        {/* Thumb/Circle */}
        <SwitchPrimitives.Thumb asChild>
          <motion.span
            className="switch-thumb pointer-events-none absolute flex items-center justify-center rounded-full bg-background shadow-lg ring-0"
            animate={{
              left: control.checked ? 'auto' : `${iconPadding}px`,
              right: control.checked ? `${iconPadding}px` : 'auto',
            }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 30,
            }}
          >
            {icon}
          </motion.span>
        </SwitchPrimitives.Thumb>
      </SwitchPrimitives.Root>
    )
  }
)

CustomSwitch.displayName = 'CustomSwitch'
