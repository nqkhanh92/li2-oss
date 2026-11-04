import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { ContentLayout } from '@/components/layout/content-layout'
import { Button } from '@/components/ui/button'
import { LinkTable } from '@/components/links/link-table'
import { getCurrentUser } from '@/lib/auth/session'
import { listLinks } from '@/lib/links/service'

export const dynamic = 'force-dynamic'

export default async function LinksPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  // Gọi thẳng service, không đi qua `GET /api/links`: một `fetch` vào chính mình từ trong lúc
  // render là thêm một vòng HTTP và phải chuyển tiếp cookie phiên bằng tay — nhiều việc hơn để
  // lấy đúng dữ liệu mà hàm này đã trả về sẵn.
  const links = await listLinks({ limit: 200 })

  return (
    <ContentLayout
      title="Link"
      description="Slug ngắn, mã QR và số lượt truy cập của từng link."
      action={
        <Button asChild>
          {/* `asChild` truyền class của Button vào `<Link>`, nên icon phải nằm trong children —
              prop `iconLeft` bị bỏ qua ở nhánh `asChild` (xem `components/ui/button.tsx`). */}
          <Link href="/links/new">
            <Plus className="h-5 w-5" />
            Tạo link
          </Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <LinkTable links={links} />

        {links.length > 0 ? (
          <p className="text-xs leading-relaxed text-slate-500">
            Tắt link không xoá nó: QR đã in vẫn trỏ về đây, và số lượt truy cập được giữ lại. Bật
            lại lúc nào cũng được.
          </p>
        ) : null}
      </div>
    </ContentLayout>
  )
}
