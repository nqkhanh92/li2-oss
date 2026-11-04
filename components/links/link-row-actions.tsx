'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, Loader2, MoreHorizontal, Power, PowerOff, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCopy } from '@/components/links/copy-button'
import { QrDialog } from '@/components/links/qr-dialog'

type LinkRowActionsProps = {
  id: string
  slug: string
  isActive: boolean
  /**
   * Ba địa chỉ dưới đây được tính ở SERVER rồi truyền vào, không dựng lại ở client.
   *
   * `PUBLIC_BASE_URL` không có tiền tố `NEXT_PUBLIC_`, nên nó không tồn tại trong bundle trình
   * duyệt — đó là chủ ý (xem `publicUrl` ở `lib/links/service.ts`). Client dựng lại từ
   * `window.location.origin` sẽ sai ngay khi ứng dụng đứng sau proxy hoặc dùng domain riêng cho
   * short link, và một QR in ra từ địa chỉ sai thì không thu hồi được.
   */
  publicUrl: string
  qrPngUrl: string
  qrSvgUrl: string
}

/**
 * Menu thao tác của một hàng: sao chép link, xem/tải QR, bật hoặc tắt.
 *
 * Gọi `PATCH /api/links/<id>` thay vì Server Action vì component này chạy ở client (cần `useState`
 * cho dialog và cho trạng thái đang gửi). API đã có sẵn phép kiểm đăng nhập và cùng đi vào
 * `updateLink`, nên không có đường nghiệp vụ nào bị đi tắt.
 */
export function LinkRowActions({
  id,
  slug,
  isActive,
  publicUrl,
  qrPngUrl,
  qrSvgUrl,
}: LinkRowActionsProps) {
  const router = useRouter()
  const { copied, copy } = useCopy()
  const [qrOpen, setQrOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    setPending(true)
    setError(null)

    try {
      const response = await fetch(`/api/links/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      })

      if (!response.ok) {
        // Không nuốt lỗi: hiện đúng câu mà API trả về. Thất bại im lặng ở đây nghĩa là người dùng
        // tưởng link đã tắt trong khi nó vẫn đang phục vụ.
        const body = await response.json().catch(() => null)
        setError(body?.error ?? `Không đổi được trạng thái (HTTP ${response.status}).`)
        return
      }

      // Trang danh sách là Server Component đọc thẳng DB, nên chỉ `refresh()` mới thấy giá trị mới.
      router.refresh()
    } catch {
      setError('Không gọi được máy chủ. Kiểm tra kết nối rồi thử lại.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {/*
        `modal={false}` là cố ý: ở chế độ modal, DropdownMenu bẫy focus và trả focus về nút mở khi
        đóng — việc đó tranh focus với Dialog QR vừa mở từ chính một item, và kết quả là hộp thoại
        mở ra rồi mất focus ngay. Bỏ bẫy focus của menu thì Dialog (vẫn modal) nhận focus gọn.
      */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="tertiary"
            size="icon"
            aria-label={`Thao tác với /${slug}`}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={() => void copy(publicUrl)}>
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Đã sao chép' : 'Sao chép link'}
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => setQrOpen(true)}>
            <QrCode className="h-4 w-4" />
            Xem và tải QR
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={() => void toggle()} disabled={pending}>
            {isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            {isActive ? 'Tắt link' : 'Bật lại link'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {error ? (
        <p role="alert" className="max-w-56 text-right text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <QrDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        slug={slug}
        publicUrl={publicUrl}
        pngUrl={qrPngUrl}
        svgUrl={qrSvgUrl}
      />
    </div>
  )
}
