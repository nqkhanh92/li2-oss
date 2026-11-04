import { redirect } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { CreateLinkForm } from '@/components/links/create-link-form'
import { getCurrentUser } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function NewLinkPage() {
  // Phép kiểm ở đây chỉ để không render một form vô dụng cho người chưa đăng nhập. Phép kiểm THẬT
  // nằm ở `POST /api/links`, nơi form gửi tới — ẩn UI không phải kiểm soát truy cập.
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <ContentLayout
      title="Tạo link"
      description="Một URL đích, một slug để chia sẻ. QR được sinh ngay sau khi tạo."
    >
      <CreateLinkForm />
    </ContentLayout>
  )
}
