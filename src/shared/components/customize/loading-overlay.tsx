import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type LoadingOverlayProps = {
  message?: string
  className?: string
  spinnerSize?: 'sm' | 'md' | 'lg'
}

const spinnerSizes = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
}

export const LoadingOverlay = ({ message, className, spinnerSize = 'md' }: LoadingOverlayProps) => {
  const { t } = useTranslation('common')

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
        className || ''
      }`}
      role="alert"
      aria-live="assertive"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4 bg-background rounded-lg p-8 shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <Loader2 className={`${spinnerSizes[spinnerSize]} text-blue-600 animate-spin`} />
        <p className="text-lg font-medium text-gray-700">{message || t('loading.default')}</p>
      </div>
    </div>
  )
}
