import { MultipleCommandSelect } from '@/shared/components/customize/multiple-command-select'
import { useTranslation } from 'react-i18next'

type DeviceOSSelectProps = {
  value: string[]
  onChange: (value: string[]) => void
}
export const DeviceOSSelect = ({ value, onChange }: DeviceOSSelectProps) => {
  const { t } = useTranslation('touchpoint')
  const options = [
    { label: 'Android', value: 'android' },
    { label: 'iOS', value: 'ios' },
  ]
  return (
    <MultipleCommandSelect
      modal
      variant="muted"
      placeholder={t('dynamic_targeting.placeholders.select_devices')}
      value={value}
      onChange={onChange}
      options={options}
    />
  )
}
