'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog'
import { Button } from '@/shared/components/ui/button'

import { useDeleteArtifact } from '../hooks/use-artifacts'
import { artifactApiI18n } from '../utils/api-error'
import { getArtifactBackPath } from '@/features/artifacts/utils/list-path'

interface ArtifactDeleteDialogProps {
  orgId: string
  artifactId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Radix needs the trigger INSIDE the dialog tree; a menu item elsewhere passes nothing here. */
  trigger?: React.ReactNode
}

/**
 * Xoá cứng, không thùng rác — người dùng đã quyết. Vì vậy hộp xác nhận không được nói "bạn có
 * chắc không" rồi thôi: thứ người dùng thực sự cần biết là **cái gì bên ngoài hệ thống sẽ chết
 * theo**. Mã QR đã in trên bao bì hay standee không gọi về xin phép được; xoá ở đây là biến mọi
 * lần quét sau đó thành một trang không tìm thấy, và không ai thu hồi được tờ rơi đã phát.
 *
 * Đó là lý do câu mô tả nói bằng hệ quả ("người quét sẽ gặp trang không tìm thấy") chứ không bằng
 * thao tác ("hành động này không thể hoàn tác"), và nhãn nút là "Xoá vĩnh viễn" chứ không phải
 * "Đồng ý".
 *
 * Tách khỏi nút kích hoạt (wave 3): hộp thoại giờ mở từ hai chỗ — nút Xoá cũ và mục Xoá trong menu
 * ⋮ của thẻ danh sách / overflow trang chi tiết. Một `DropdownMenuItem` không thể là
 * `AlertDialogTrigger` (menu đóng là unmount luôn hộp thoại), nên trạng thái mở nằm ở người gọi.
 */
export const ArtifactDeleteDialog = ({
  orgId,
  artifactId,
  open,
  onOpenChange,
  trigger,
}: ArtifactDeleteDialogProps) => {
  const { t } = useTranslation(['artifact', 'common'])
  const router = useRouter()
  const { mutate: deleteArtifact, isPending } = useDeleteArtifact(orgId)

  const handleDelete = () => {
    deleteArtifact(artifactId, {
      onSuccess: () => {
        toast.success(t('artifact:detail.deleted'))
        /**
         * Điều hướng ngay, không đợi: hàng vừa biến mất nên ở lại trang chi tiết là ở lại một
         * trang chỉ còn cách hiện "không tìm thấy" — một lỗi cho một thao tác vừa thành công.
         * Từ danh sách thì đây là điều hướng tới chính trang đang mở — vô hại.
         */
        router.push(getArtifactBackPath(orgId))
      },
      onError: (error) => {
        const i18n = artifactApiI18n(error)
        toast.error(i18n ? t(i18n.key, i18n.params) : t('artifact:errors.generic'))
        onOpenChange(false)
      },
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('artifact:detail.delete_confirm_title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('artifact:detail.delete_confirm_description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{t('common:buttons.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              // Giữ hộp thoại mở trong lúc request chạy, để nút không nháy rồi biến mất.
              e.preventDefault()
              handleDelete()
            }}
            disabled={isPending}
            className="bg-semantic-error text-white hover:bg-semantic-error/90"
          >
            {t('artifact:detail.delete_confirm_action')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Nút Xoá đứng một mình, mang hộp thoại của chính nó. */
export const ArtifactDeleteButton = ({
  orgId,
  artifactId,
  size = 'sm',
}: {
  orgId: string
  artifactId: string
  size?: 'sm' | 'default'
}) => {
  const { t } = useTranslation('artifact')
  const [open, setOpen] = useState(false)

  return (
    <ArtifactDeleteDialog
      orgId={orgId}
      artifactId={artifactId}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant="tertiary" size={size} iconLeft={<Trash2 />}>
          {t('actions.delete')}
        </Button>
      }
    />
  )
}
