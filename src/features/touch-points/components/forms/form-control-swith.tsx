import { FormLabel } from '@/shared/components/ui/form'
import { FormControl } from '@/shared/components/ui/form'
import { Switch } from '@/shared/components/ui/switch'

interface FormControlSwitchProps {
  variant: string
  field: any
  onCheckedChange: (checked: boolean) => void
}

export const FormControlSwitch = ({ variant, field, onCheckedChange }: FormControlSwitchProps) => {
  return (
    <div className="flex items-center justify-between">
      <FormLabel>{variant}</FormLabel>
      <FormControl>
        <Switch className="flex" onCheckedChange={onCheckedChange} checked={field.value} />
      </FormControl>
    </div>
  )
}
