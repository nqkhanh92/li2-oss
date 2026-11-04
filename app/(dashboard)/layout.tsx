import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { AppSidebar } from '@/components/layout/app-sidebar'
import { Navbar } from '@/components/layout/navbar'
import { SidebarProvider } from '@/components/ui/sidebar'
import { getCurrentUser } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

/**
 * Shell của phần đã đăng nhập. Bố cục theo bản thương mại: `SidebarProvider` bọc ngoài, thanh trên
 * cố định 52px, sidebar bên trái, nội dung trong khung bo góc trên.
 *
 * Phép kiểm đăng nhập ở đây KHÔNG thay cho phép kiểm trong từng page / route handler / server
 * action: layout chỉ chạy khi Next render cây đó, còn một Server Action hay `GET /api/...` là
 * endpoint riêng mà ai biết địa chỉ vẫn gọi được. Nó là lớp để không ai thấy khung app khi chưa
 * đăng nhập, không phải lớp chặn dữ liệu.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  // Đọc trạng thái thu gọn từ cookie ở server để lần tải trang sau không nháy: nếu để client tự
  // đọc trong effect thì HTML đầu tiên luôn là "đang mở" rồi mới co lại.
  //
  // Tên cookie viết thẳng ở đây, KHÔNG import hằng từ `components/ui/sidebar.tsx`: file đó là
  // `'use client'`, nên mọi export của nó khi nhìn từ Server Component là một client reference
  // (proxy), không phải chuỗi — dùng nó làm khoá cookie sẽ sai ở runtime mà typecheck không bắt.
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get('sidebar_state')?.value
  const defaultOpen = cookieValue ? cookieValue === 'true' : true

  const navUser = { email: user.email, display_name: user.display_name }

  return (
    <SidebarProvider defaultOpen={defaultOpen} className="bg-slate-800">
      <AppSidebar user={navUser} />
      <div className="flex flex-col h-svh overflow-hidden bg-slate-800 w-full">
        <Navbar user={navUser} />
        {/* `mt-[52px]` khớp chiều cao `Navbar` (fixed nên không chiếm chỗ trong dòng chảy). */}
        <div className="bg-background rounded-tl-3xl md:rounded-tl-none rounded-tr-3xl overflow-hidden w-full relative mt-[52px] h-[calc(100svh-52px)]">
          <main className="w-full h-full overflow-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}
