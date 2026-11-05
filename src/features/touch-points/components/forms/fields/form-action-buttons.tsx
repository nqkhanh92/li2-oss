import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import { LoadingButton } from '@/shared/components/customize/loading-button'

interface FormActionButtonsProps {
  isLoading: boolean
  submitButtonLabel: string
  onCancel: () => void
  className?: string
}

/**
 * Form action buttons (Cancel and Submit)
 */
export const FormActionButtons = ({
  isLoading,
  submitButtonLabel,
  onCancel,
  className = '',
}: FormActionButtonsProps) => {
  const { t } = useTranslation(['common'])

  return (
    <div className={`flex justify-end gap-6 ${className}`}>
      <Button
        type="button"
        onClick={onCancel}
        variant="secondary"
        className="gap-[6px] text-base flex-1 max-w-fit"
      >
        {t('common:buttons.cancel')}
      </Button>
      <LoadingButton
        size="default"
        type="submit"
        isLoading={isLoading}
        className="py-[8px] h-auto w-fit max-w-fit"
      >
        {submitButtonLabel}
      </LoadingButton>
    </div>
  )
}
