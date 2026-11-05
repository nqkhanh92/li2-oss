'use client'
import { useParams, useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ImportExportAction } from '@/features/touch-points/components/touch-point-list/import-export-action'
import { Button } from '@/shared/components/ui/button'
import { MergedQuotaMeta } from './merged-quota-meta'

export const ShortLinkHeaderActions = () => {
  const { org_id } = useParams<{ org_id: string }>()
  const router = useRouter()
  const { t } = useTranslation(['common', 'touchpoint'])

  return (
    <>
      <MergedQuotaMeta />
      <ImportExportAction />
      {/*
        MỘT nút trung tính, không phải một nút cho mỗi loại.

        Hai nút theo loại bắt người dùng quyết "link hay artifact" ngay trên header, trước cả khi
        thấy bất kỳ ô nhập nào — và chúng là thứ làm trang gộp vẫn trông như trang link với một
        nút lạ bên cạnh. Việc chọn loại thuộc về trình tạo, nơi mỗi lựa chọn đứng cạnh cây form
        của nó và đổi lại được mà không mất những gì đã điền chung.

        Cả hai route tạo cũ vẫn sống, chỉ không còn là lối vào từ đây.
      */}
      <Button
        data-testid="merged-create-button"
        // CHỈ đổi màu cho nổi như nút "Add Custom Domain" — chữ "Tạo mới" GIỮ NGUYÊN.
        // Nhãn trung tính là có chủ đích: trước đó nó là "Create Short Link", và chính vì vậy chủ
        // sản phẩm nói "Link Artifact trong đây chỉ có phần shortlink". Đừng làm nó cụ thể lại.
        variant="default"
        iconLeft={<Plus className="w-5 h-5" />}
        onClick={() => router.push(`/org/${org_id}/create`)}
      >
        {t('touchpoint:merged_list.create.button')}
      </Button>
    </>
  )
}
