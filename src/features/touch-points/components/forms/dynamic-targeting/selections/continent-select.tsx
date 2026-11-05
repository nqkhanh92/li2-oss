import continents from '@/shared/constants/continents.json'
import { MultipleCommandSelect } from '../../../../../../shared/components/customize/multiple-command-select'
type ContinentSelectProps = {
  value: string[]
  onChange: (value: string[]) => void
}
export const ContinentSelect = ({ value, onChange }: ContinentSelectProps) => {
  return <MultipleCommandSelect options={continents} value={value} onChange={onChange} />
}
