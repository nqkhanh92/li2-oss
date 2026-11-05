import * as React from 'react'
import { Eye, EyeClosedIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Input } from './input'
import { CustomToolTip } from '@/shared/components/customize/custom-tooltip'

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  const [showPassword, setShowPassword] = React.useState(false)

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev)
  }
  const inputProps = {
    ...props,
    size: undefined,
  }

  return (
    <div className={cn('relative flex items-center', className)}>
      <Input
        type={showPassword ? 'text' : 'password'}
        className="pr-10"
        ref={ref}
        {...inputProps}
      />
      <button
        type="button"
        onClick={togglePasswordVisibility}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? (
          <CustomToolTip content="Click to hide password">
            <Eye className="h-5 w-5" />
          </CustomToolTip>
        ) : (
          <CustomToolTip content="Click to show password">
            <EyeClosedIcon className="h-5 w-5" />
          </CustomToolTip>
        )}
      </button>
    </div>
  )
})

PasswordInput.displayName = 'PasswordInput'
