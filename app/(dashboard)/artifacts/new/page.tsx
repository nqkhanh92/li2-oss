import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'
import { maxUploadBytes } from '@/lib/artifacts/storage'
import { ContentLayout } from '@/components/layout/content-layout'
import { UploadForm } from '@/components/artifacts/upload-form'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Tải tệp lên — li2-oss' }

export default async function NewArtifactPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  /**
   * Hạn mức đọc ở SERVER rồi truyền xuống form.
   *
   * `MAX_UPLOAD_BYTES` không có tiền tố `NEXT_PUBLIC_` nên client không đọc được nó — và đó là
   * đúng: biến `NEXT_PUBLIC_*` bị nhúng vào bundle LÚC BUILD, nên người vận hành đổi hạn mức rồi
   * khởi động lại container sẽ thấy form vẫn báo con số cũ. Truyền như một prop thì con số trên
   * form luôn là con số máy chủ đang thực thi.
   */
  const maxBytes = maxUploadBytes()

  return (
    <ContentLayout
      title="Tải tệp lên"
      description="Tệp được lưu trên chính máy chủ này và phục vụ sau một short link kèm mã QR."
    >
      <div className="max-w-[640px]">
        <UploadForm maxBytes={maxBytes} />
      </div>
    </ContentLayout>
  )
}
