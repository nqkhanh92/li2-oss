'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Link2, Loader2, LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

export type NavbarUser = {
  email: string
  display_name: string | null
}

/**
 * Nút đăng xuất. Để ở đây và export để `app-sidebar.tsx` dùng lại — hai bản copy của một lệnh
 * đăng xuất sẽ lệch nhau ở lần sửa thứ hai, và bản bị quên là bản còn để lại phiên sống.
 *
 * Gọi `POST /api/auth/logout` (route đó chỉ nhận POST, cố tình: đăng xuất bằng GET nghĩa là một
 * thẻ `<img>` ở trang bất kỳ cũng đăng xuất được người đang đọc). `router.refresh()` sau khi
 * push để layout server đọc lại cookie đã bị xoá.
 */
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    })
  }

  return (
    <Button
      type="button"
      variant="tertiary"
      size="sm"
      onClick={handleLogout}
      disabled={isPending}
      iconLeft={
        isPending ? <Loader2 className="animate-spin" /> : <LogOut aria-hidden="true" />
      }
      className={className}
    >
      Đăng xuất
    </Button>
  )
}

/**
 * Thanh trên, cố định cao 52px như bản thương mại — con số đó là hợp đồng ngầm với
 * `app-sidebar.tsx` (`mt-[52px]`) và `content-layout.tsx` (`h-[calc(100dvh-52px-60px)]`).
 * Đổi nó ở một chỗ thì phải đổi cả ba.
 *
 * Bản gốc còn có bộ chọn tổ chức, chọn ngôn ngữ, chuông thông báo và trigger AI chat. Bản OSS
 * không có khái niệm nào trong đó, nên chỗ đó để trống thay vì bày nút không làm gì.
 */
export function Navbar({
  user,
  title,
  className,
}: {
  user: NavbarUser
  /** Thường để trống: tiêu đề trang do `ContentLayout` dựng ở dải 60px bên dưới. */
  title?: string
  className?: string
}) {
  return (
    <header
      className={cn(
        'bg-slate-800 text-white h-[52px] fixed top-0 left-0 right-0 z-50 px-2 md:pl-4 lg:pl-6 md:pr-4 lg:pr-12',
        className
      )}
    >
      <div className="flex justify-between items-center h-full w-full gap-4 overflow-hidden">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          {/* Chỉ hiện ở mobile: desktop có nút thu gọn nằm trong chính sidebar, như bản gốc. */}
          <SidebarTrigger className="md:hidden bg-transparent border-white/30 text-white [&>svg]:text-white" />

          <Link
            href="/links"
            className="flex items-center gap-2 font-medium text-base shrink-0 h-9"
          >
            <span className="w-6 h-6 rounded-md bg-[linear-gradient(90deg,#B9AAFF_0.08%,#D6A4AF_98.87%)] flex items-center justify-center shrink-0">
              <Link2 className="w-3.5 h-3.5 text-white" aria-hidden="true" />
            </span>
            <span className="hidden sm:inline">li2-oss</span>
          </Link>

          {title && (
            <span className="md:border-l md:border-white/30 md:pl-4 text-sm truncate">
              {title}
            </span>
          )}
        </div>

        <div className="flex gap-1 md:gap-2 items-center shrink-0">
          <span className="hidden md:inline text-sm text-white/80 truncate max-w-[200px]">
            {user.display_name || user.email}
          </span>
          <LogoutButton className="text-white hover:bg-white/10 hover:text-white" />
        </div>
      </div>
    </header>
  )
}
