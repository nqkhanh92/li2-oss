import React, { useState } from 'react'
import { Input } from '../../ui/input'
import equal from 'fast-deep-equal'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { SearchIcon, XIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { VariantProps } from 'class-variance-authority'
import { filterVariants } from '@/features/touch-points/constants/variants'
interface FilterItemInputProps extends VariantProps<typeof filterVariants> {
  name: string
  placeholder?: string
  filters?: Record<string, any>
  value?: string
  onChange?: (value: string) => void
  className?: string
}
export const FilterItemInput = ({
  name,
  placeholder,
  filters,
  value,
  onChange,
  className,
  variant,
  size,
}: FilterItemInputProps) => {
  const [textValue, setTextValue] = useState(value ?? '')
  React.useEffect(() => {
    if (value !== undefined && textValue !== value) {
      setTextValue(value)
    }
  }, [value])
  const debounceValues = useDebounce(textValue, 500)
  React.useEffect(() => {
    if (debounceValues !== value) {
      onChange?.(debounceValues)
    }
  }, [debounceValues])
  return (
    <div
      className={cn('relative group w-full bg-card overflow-hidden rounded-[8px]')}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute inset-y-0 left-0 flex items-center mx-4 pointer-events-none">
        <SearchIcon className={cn('h-5 w-5 text-slate-600')} />
      </div>
      <Input
        className={cn('pl-10!', filterVariants({ size, className }))}
        value={textValue}
        onChange={(e) => {
          setTextValue(e.target.value)
        }}
        data-has-value={!!value}
        placeholder={placeholder}
      />
    </div>
  )
}
