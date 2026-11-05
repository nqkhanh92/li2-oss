import { Button } from '../ui/button'

type Props = {
  onChange: (value: number[]) => void
  value: number[] | undefined
}

export const DaysOfMonthPicker = ({ onChange, value = [] }: Props) => {
  return (
    <div className="rounded-md border border-input">
      <h3 className="px-2 py-1 text-sm font-semibold text-center">Days of Month</h3>
      <p className="text-muted-foreground text-center text-sm">(Please select at least one day)</p>
      <div className="grid grid-cols-10 gap-1 p-2">
        {Array.from({ length: 31 }).map((_, index) => {
          const day = index + 1
          return (
            <Button
              type="button"
              key={index}
              className="first:rounded-l-md last:rounded-r-md"
              variant={value.includes(day) ? 'default' : 'outline'}
              onClick={() => {
                if (value.includes(day)) {
                  onChange(value.filter((v) => v !== day))
                } else {
                  onChange([...value, day])
                }
              }}
            >
              {day}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
