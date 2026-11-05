import { MultipleCommandSelect } from '@/shared/components/customize/multiple-command-select'
import { deviceRuleConfigSchema } from '@/shared/schemas/touch-points/dynamic-targeting'
import { z } from 'zod'
import { DeviceOSSelect } from '../selections/device-os-select'

const devices = ['Android', 'iOS']
type Props = {
  field: z.infer<typeof deviceRuleConfigSchema>
  onChange: (field: z.infer<typeof deviceRuleConfigSchema>) => void
}
export const DeviceRule = ({ field, onChange }: Props) => {
  return (
    <div>
      <DeviceOSSelect
        value={field.values}
        onChange={(value) => onChange({ ...field, values: value })}
      />
    </div>
  )
}
