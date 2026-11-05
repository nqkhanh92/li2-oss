import countries from '@/shared/constants/countries.json'
import { MultipleCommandSelect } from '../../../../../../shared/components/customize/multiple-command-select'
import { useTranslation } from 'react-i18next'

type CountrySelectProps = {
  value: string[]
  onChange: (value: string[]) => void
}
export const CountrySelect = ({ value, onChange }: CountrySelectProps) => {
  const { t } = useTranslation('touchpoint')
  return (
    <MultipleCommandSelect
      modal
      className="border-0"
      variant="muted"
      placeholder={t('dynamic_targeting.placeholders.select_countries')}
      options={countries.map((country) => ({ value: country.iso2, label: country.name }))}
      value={value}
      onChange={onChange}
    />
  )
}
