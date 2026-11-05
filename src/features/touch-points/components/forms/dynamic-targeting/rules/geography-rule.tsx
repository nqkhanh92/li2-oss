import { z } from 'zod'
import { regionRuleConfigSchema } from '@/shared/schemas/touch-points/dynamic-targeting'
import { CitySelect } from '../selections/city-select'
import { CountrySelect } from '../selections/country-select'
import { ContinentSelect } from '../selections/continent-select'
type Props = {
  field: z.infer<typeof regionRuleConfigSchema>
  onChange: (field: z.infer<typeof regionRuleConfigSchema>) => void
}
export const GeographyRule = ({ field, onChange }: Props) => {
  if (field?.type === 'city') {
    return (
      <CitySelect
        value={field.values}
        onChange={(value) => onChange({ ...field, values: value })}
      />
    )
  }
  if (field?.type === 'country') {
    return (
      <CountrySelect
        value={field.values}
        onChange={(value) => onChange({ ...field, values: value })}
      />
    )
  }
  if (field?.type === 'continent') {
    return (
      <ContinentSelect
        value={field.values}
        onChange={(value) => onChange({ ...field, values: value })}
      />
    )
  }
  return <div></div>
}
