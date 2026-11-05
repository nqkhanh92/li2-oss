import { Button } from '../ui/button'

type Props = {
  onChange: (value: number[]) => void
  value: number[] | undefined
}
const daysOfWeekMapping: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

export const DaysOfWeekPicker = ({ onChange, value = [] }: Props) => {
  return (
    <div className="rounded-md border border-input">
      <h3 className="px-2 py-1 text-sm font-semibold text-center">Days of Week</h3>
      <p className="text-muted-foreground text-center text-sm">(Please select at least one day)</p>
      <div className="grid grid-cols-7 gap-2 p-2">
        {Array.from({ length: 7 }).map((_, index) => (
          <Button
            type="button"
            key={index}
            variant={value.includes(index) ? 'default' : 'outline'}
            onClick={() => {
              if (value.includes(index)) {
                onChange(value.filter((v) => v !== index))
              } else {
                onChange([...value, index])
              }
            }}
          >
            {daysOfWeekMapping[index]}
          </Button>
        ))}
      </div>
    </div>
  )
}
