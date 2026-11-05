'use client'

import { forwardRef, useMemo, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { cn } from '@/shared/lib/utils'
import type { ButtonProps } from '@/shared/components/ui/button'
import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Input } from '@/shared/components/ui/input'
import { sampleTagColors } from '@/shared/constants/sample-data'
import { Palette } from 'lucide-react'

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  sampleColors?: string[]
  renderPicker?: ({
    open,
    setOpen,
  }: {
    open: boolean
    setOpen: (open: boolean) => void
  }) => React.ReactNode
}

const CustomColorPicker = forwardRef<
  HTMLInputElement,
  Omit<ButtonProps, 'value' | 'onChange' | 'onBlur'> & ColorPickerProps
>(
  (
    {
      disabled,
      value,
      onChange,
      onBlur,
      name,
      className,
      sampleColors = sampleTagColors,
      renderPicker,
      ...props
    },
    forwardedRef
  ) => {
    const [open, setOpen] = useState(false)

    const parsedValue = useMemo(() => {
      return value || '#FFFFFF'
    }, [value])
    return (
      <Popover modal={true} onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild disabled={disabled} onBlur={onBlur}>
          {renderPicker ? renderPicker?.({ open, setOpen }) : (
            <div className="flex items-center px-0 gap-[6px]">
              <Button
                {...props}
                className={cn('block w-[85px] h-[40px]', className)}
                type="button"
                name={name}
                onClick={() => {
                  setOpen(true)
                }}
                size="icon"
                style={{
                  backgroundColor: parsedValue,
                }}
                variant="outline"
              >
                <div />
              </Button>
              <Palette size={24} className="text-blue-500" />
            </div>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-full space-y-2">
          <HexColorPicker className="mx-auto" color={parsedValue} onChange={onChange} />
          <div className="flex gap-2">
            {sampleColors.map((color) => {
              return (
                <span
                  className="size-6 rounded-sm cursor-pointer"
                  key={color}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    onChange(color)
                    setOpen(false)
                  }}
                />
              )
            })}
          </div>
          <Input
            maxLength={7}
            onChange={(e) => {
              onChange(e?.currentTarget?.value)
            }}
            ref={forwardedRef}
            value={parsedValue}
          />
        </PopoverContent>
      </Popover>
    )
  }
)
CustomColorPicker.displayName = 'CustomColorPicker'

export { CustomColorPicker }
