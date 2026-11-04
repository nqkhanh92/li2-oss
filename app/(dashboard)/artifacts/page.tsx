import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'

import { getCurrentUser } from '@/lib/auth/session'
import { listArtifacts } from '@/lib/artifacts/list'
import { ContentLayout } from '@/components/layout/content-layout'
import { Button } from '@/components/ui/button'
import { ArtifactTable } from '@/components/artifacts/artifact-table'

/**
 * `force-dynamic`: trang đọc cookie phiên và đếm lượt xem mới nhất. Một bản tĩnh ở đây nghĩa là
 * người dùng thấy số lượt xem của lần build, và không hiểu vì sao nó không tăng.
 */
export const dynamic = 'force-dynamic'

export const metadata = { title: 'Artifact — li2-oss' }

export default async function ArtifactsPage() {
  // Kiểm đăng nhập ngay ở trang, không dựa vào layout: nếu `(dashboard)/layout.tsx` sau này được
  // sửa và mất phép kiểm, trang này vẫn không rò danh sách tệp của instance.
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const artifacts = await listArtifacts({ limit: 200 })

  return (
    <ContentLayout
      title="Artifact"
      description={
        artifacts.length === 0
          ? 'Tệp được phục vụ sau một short link và một mã QR của chính instance này.'
          : `${artifacts.length} artifact. Mỗi tệp có một địa chỉ công khai và một mã QR.`
      }
      action={
        <Button asChild>
          <Link href="/artifacts/new">
            <Plus className="h-4 w-4" />
            Tải tệp lên
          </Link>
        </Button>
      }
    >
      <ArtifactTable artifacts={artifacts} />
    </ContentLayout>
  )
}
