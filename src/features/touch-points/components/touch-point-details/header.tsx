import {
  ArrowLeft,
  CopyIcon,
  LinkIcon,
  MoreVerticalIcon,
  ScanEye,
  Share2Icon,
  TrashIcon,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useDeleteTouchPoint } from '../../hooks/mutations'
import { useParams, useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { useConfirmDialog } from '@/shared/components/customize/confirm-dialog'
import { useTranslation } from 'react-i18next'
import { useIsMobile } from '@/shared/hooks/use-mobile'
import { cn } from '@/shared/lib/utils'
import { SharingModal } from '../sharing'
import { useState, useTransition } from 'react'
import { Typography } from '@/shared/components/ui/typography'
import { useUpdateTouchPointForm } from '../../hooks/use-touchpoint-update-form'
import { Switch } from '@/shared/components/ui/switch'
import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { CustomSwitch } from '@/shared/components/customize/custom-switch'

type Props = {
  name: string
  shortUrl: string
  handleBack: () => void
  handleCopy: () => void
  visits: number
  isActive: boolean
  onActiveChange: (isActive: boolean) => void
  onVisitClicked: () => void
  isFlagged?: boolean
}
export const TouchPointDetailHeader = ({
  name,
  shortUrl,
  handleBack,
  handleCopy,
  visits,
  isActive,
  onActiveChange,
  onVisitClicked,
  isFlagged = false,
}: Props) => {
  const { org_id, touch_point_id } = useParams<{ org_id: string; touch_point_id: string }>()
  const { mutateAsync: deleteTp, isPending: isDeleting } = useDeleteTouchPoint(org_id)
  const { confirm } = useConfirmDialog()

  const [isOpenSharing, setIsOpenSharing] = useState<boolean>(false)

  const { t } = useTranslation(['common', 'touchpoint'])

  const handleDelete = () => {
    confirm({
      title: t('touchpoint:touch_point_edit.button_list.delete_button'),
      description: t('touchpoint:touch_point_edit.button_list.delete_dialog'),
      confirmButtonText: t('buttons.delete'),
      cancelButtonText: t('buttons.cancel'),
      onConfirm: async () => {
        // Execute delete first
        await deleteTp(touch_point_id)
        // Navigate after deletion completes to avoid cache invalidation issues
        handleBack()
      },
      onCancel: () => {},
    })
  }
  const isMobile = useIsMobile()
  const [isUpdatingStatus, startUpdatingStatus] = useTransition()
  const router = useRouter()

  return (
    <div className={cn('flex gap-2 w-full items-center justify-between', { 'px-2': isMobile })}>
      <div className="flex gap-2 md:gap-4 items-center truncate">
        <ArrowLeft className={cn('w-6 h-6 text-foreground cursor-pointer')} onClick={handleBack} />
        <div className="flex flex-col gap-[2px] w-full">
          <span
            title={name}
            className="flex gap-2 items-center text-foreground text-[18px] font-semibold line-clamp-[24px]"
          >
            {name}
          </span>
          <a
            className={cn('text-s! min-w-0 truncate font-semibold text-blue-500', {
              'flex-1': isMobile,
            })}
            target="_blank"
            href={shortUrl}
            title={shortUrl}
          >
            {shortUrl}
          </a>
        </div>
      </div>
      <div className="flex gap-3 ml-auto flex-none">
        {isMobile ? (
          <Button variant="secondary" size="icon" onClick={() => handleCopy()}>
            <CopyIcon />
          </Button>
        ) : (
          <>
            <Button
              onClick={onVisitClicked}
              type="button"
              variant="ghost"
              className="text-s text-blue-500"
              size={'sm'}
              iconLeft={<ScanEye />}
            >
              {visits} visits
            </Button>
            <div className="rounded-[6px] border border-slate-300 bg-background flex gap-2 py-2 px-4 items-center h-9">
              <Typography size={'s'} weight={'medium'}>
                Active
              </Typography>
              <LoadingMask className="h-5" loading={isUpdatingStatus}>
                <CustomSwitch
                  checked={isFlagged ? false : isActive}
                  disabled={isFlagged}
                  className="w-9"
                  checkedLabel=""
                  uncheckedLabel=""
                  onCheckedChange={(value) => {
                    startUpdatingStatus(async () => {
                      await onActiveChange(value)
                    })
                  }}
                />
              </LoadingMask>
            </div>
            <Button
              variant="secondary"
              iconLeft={<CopyIcon />}
              size="sm"
              onClick={() => handleCopy()}
            >
              {t('actions.copy')}
            </Button>
          </>
        )}
        {!isMobile && (
          <Button
            variant="secondary"
            iconLeft={<Share2Icon />}
            size="sm"
            onClick={() => setIsOpenSharing(true)}
          >
            {t('buttons.share')}
          </Button>
        )}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon">
              <MoreVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {isMobile && (
              <DropdownMenuItem
                onClick={() => setIsOpenSharing(true)}
                className="flex justify-between"
              >
                {t('buttons.share')} <Share2Icon />
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={handleDelete} className="flex justify-between">
              {t('buttons.delete')} <TrashIcon />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <SharingModal open={isOpenSharing} onOpenChange={setIsOpenSharing} url={shortUrl} />
    </div>
  )
}
