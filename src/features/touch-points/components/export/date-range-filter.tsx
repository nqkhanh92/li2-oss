import { Label } from '@/shared/components/ui/label'
import { DateRangePicker } from '@/shared/components/customize/date-range-picker'
import { DateRange } from 'react-day-picker'

interface DateRangeFilterProps {
  value?: DateRange
  onChange: (value: DateRange | undefined) => void
  label: string
  placeholder: string
}

export const DateRangeFilter = ({ value, onChange, label, placeholder }: DateRangeFilterProps) => {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <DateRangePicker
        modal={true}
        className="w-full bg-slate-100"
        placeholder={placeholder}
        onValueChange={onChange}
        value={value}
        variant="design_v2"
        size="default"
        allowClear
        disableFutureDate
      />
    </div>
  )
}
