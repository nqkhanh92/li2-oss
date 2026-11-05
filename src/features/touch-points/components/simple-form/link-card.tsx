import { Button } from '@/shared/components/ui/button'
import { CopyIcon, MoveRightIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

export const LinkCard = ({
  link = 'https://li2.ai/short-link',
  onViewDetail,
}: {
  link?: string
  onViewDetail?: () => void
}) => {
  const { t } = useTranslation()

  const handleCopyLink = () => {
    navigator.clipboard.writeText(link)
    toast.success(t('common:toast.title_copy'), {
      description: t('common:toast.description_copy', {
        field: '$t(common:label.link)',
      }),
      id: 'copy-link',
    })
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Success message */}
      <p className="text-sm font-medium text-green-600 text-center">
        {t('touchpoint:simple_form.link_created_success', {
          defaultValue: 'All set! Start sharing your link and QR code',
        })}
      </p>

      {/* Link + copy */}
      <div className="bg-slate-50 flex flex-col gap-4 items-center py-6 rounded-[8px] w-full">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-base font-medium text-semantic-info truncate max-w-[280px] block"
        >
          {link}
        </a>
        <Button type="button" variant="default" iconLeft={<CopyIcon />} onClick={handleCopyLink}>
          {t('common:buttons.copy', { defaultValue: 'Copy' })}
        </Button>
      </div>

      {/* View detail */}
      {onViewDetail && (
        <div className="border-t border-slate-300 pt-4 flex flex-col gap-1 items-center">
          <p className="text-s text-slate-500 text-center">
            {t('touchpoint:simple_form.view_detail_hint', {
              defaultValue: 'Want to customize or track performance?',
            })}
          </p>
          <Button
            type="button"
            variant="tertiary"
            iconRight={<MoveRightIcon />}
            onClick={onViewDetail}
            className="text-s! py-0! h-5"
          >
            {t('common:buttons.view_detail', { defaultValue: 'View detail' })}
          </Button>
        </div>
      )}
    </div>
  )
}
