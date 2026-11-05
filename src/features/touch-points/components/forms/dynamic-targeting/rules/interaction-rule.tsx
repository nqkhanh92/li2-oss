import { InteractionTypeSelect } from '../selections/interaction-type-select'
import { interactionRuleConfigSchema } from '@/shared/schemas/touch-points/dynamic-targeting'
import { z } from 'zod'

type Props = {
  field: z.infer<typeof interactionRuleConfigSchema>
  onChange: (field: z.infer<typeof interactionRuleConfigSchema>) => void
}
export const InteractionRule = ({ field, onChange }: Props) => {
  return (
    <div>
      <InteractionTypeSelect
        value={field.values}
        onChange={(value) => onChange({ ...field, values: value })}
      />
    </div>
  )
}
