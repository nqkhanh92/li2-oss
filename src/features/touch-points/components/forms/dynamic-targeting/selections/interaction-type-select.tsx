import { MultipleCommandSelect } from '@/shared/components/customize/multiple-command-select'
import { TargetingInteractionTypes } from '@/shared/schemas/touch-points/dynamic-targeting'
import { useTranslation } from 'react-i18next'

type InteractionTypeSelectProps = {
  value: string[]
  onChange: (value: string[]) => void
}
export const InteractionTypeSelect = ({ value, onChange }: InteractionTypeSelectProps) => {
  const { t } = useTranslation('touchpoint')
  return (
    <MultipleCommandSelect
      modal
      variant="muted"
      placeholder={t('dynamic_targeting.placeholders.select_interaction_channels')}
      options={Object.values(TargetingInteractionTypes).map((item) => {
        const disabled = item !== TargetingInteractionTypes.QR
        return {
          label: `${item} ${disabled ? t('dynamic_targeting.coming_soon') : ''}`,
          value: item,
          disabled,
        }
      })}
      value={value}
      onChange={onChange}
    />
  )
}
