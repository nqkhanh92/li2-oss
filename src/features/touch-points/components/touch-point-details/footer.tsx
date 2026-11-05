import { LoadingButton } from '@/shared/components/customize/loading-button'
import { Button } from '@/shared/components/ui/button'
import { useTranslation } from 'react-i18next'

type Props = {
  onBack: () => void
  isLoading?: boolean
}
export const TouchPointDetailFooter = ({ onBack, isLoading }: Props) => {
  const { t } = useTranslation()
  return (
    <div className="2xl:w-[1280px] w-full md:px-12 2xl:mx-auto my-auto">
      <div className="2xl:pr-[336px] flex items-center gap-4 justify-end">
        <Button variant="tertiary" onClick={onBack}>
          {t('buttons.cancel')}
        </Button>
        <LoadingButton type="submit" form="touch-point-detail-form" isLoading={isLoading}>
          {t('buttons.save_changes')}
        </LoadingButton>
      </div>
    </div>
  )
}
