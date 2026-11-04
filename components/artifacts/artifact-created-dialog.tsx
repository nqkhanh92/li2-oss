'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type ArtifactCreatedDialogProps = {
  slug: string
  /**
   * `public_url` do `POST /api/artifacts` trả về. **Có thể `null`** — route cố ý không làm hỏng cả
   * lần tải lên chỉ vì `PUBLIC_BASE_URL` chưa đặt (xem `safePublicUrl` ở route đó).
   */
  publicUrl: string | null
  onClose: () => void
}

export function ArtifactCreatedDialog({ slug, publicUrl, onClose }: ArtifactCreatedDialogProps) {
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const [fallbackOrigin, setFallbackOrigin] = useState<string | null>(null)

  /**
   * Địa chỉ dự phòng lấy từ `window.location.origin`, KHÔNG phải một domain viết cứng.
   *
   * Đọc trong `useEffect` thay vì ngay lúc render: `window` không tồn tại lúc server render, và
   * một giá trị khác nhau giữa hai lượt render là lỗi hydration.
   *
   * ⚠ Đây chỉ là chữ hiện cho người dùng sao chép khi `PUBLIC_BASE_URL` chưa đặt. Mã QR thì
   * KHÔNG có dự phòng kiểu này — nó do máy chủ sinh từ `PUBLIC_BASE_URL`, và nếu env đó thiếu
   * thì route QR trả 500 thay vì sinh một mã trỏ sai chỗ. QR in ra rồi thì không sửa được.
   */
  useEffect(() => {
    if (!publicUrl) setFallbackOrigin(window.location.origin)
  }, [publicUrl])

  const displayUrl = publicUrl ?? (fallbackOrigin ? `${fallbackOrigin}/${slug}` : `/${slug}`)

  async function handleCopy() {
    setCopyFailed(false)
    try {
      // `navigator.clipboard` không có trên ngữ cảnh không bảo mật (http trên IP LAN là trường
      // hợp thật của một bản tự host). Không bắt lỗi thì nút này im lặng không làm gì.
      await navigator.clipboard.writeText(displayUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopyFailed(true)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-w-[420px] gap-0 p-7">
        <DialogHeader>
          <DialogTitle className="text-l font-semibold">Đã tải lên</DialogTitle>
          <DialogDescription className="mt-1">
            Tệp đang được phục vụ ở địa chỉ dưới đây. Mã QR trỏ tới đúng địa chỉ đó.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 flex flex-col gap-1.5">
          <p className="text-s font-medium text-slate-600">Địa chỉ công khai</p>
          <Input
            readOnly
            value={displayUrl}
            // `onFocus` chọn hết: người dùng không dùng được clipboard API thì vẫn sao chép tay
            // bằng một lần bấm + Ctrl+C, không phải kéo chuột qua cả chuỗi.
            onFocus={(e) => e.currentTarget.select()}
            className="font-mono text-s"
            endAdornment={
              copied ? (
                <Check className="h-4 w-4 shrink-0 text-semantic-success" />
              ) : (
                <Copy
                  role="button"
                  aria-label="Sao chép địa chỉ"
                  onClick={handleCopy}
                  className="h-4 w-4 shrink-0 cursor-pointer text-slate-400 transition-colors hover:text-slate-700"
                />
              )
            }
          />
          {copyFailed ? (
            <p className="text-xs text-semantic-error">
              Trình duyệt không cho sao chép tự động. Bấm vào ô trên rồi Ctrl+C.
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col items-center gap-3">
          {/*
            `<img>` thuần, không `next/image`: ảnh này do route của chính ta sinh theo yêu cầu,
            nên lớp tối ưu của Next (resize + cache trên đĩa) không thêm gì ngoài một vòng xử lý.
            `unoptimized` trên `next/image` cũng ra đúng thẻ này nhưng tốn thêm một import.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/qr/${slug}?format=png&width=320`}
            alt={`Mã QR cho ${displayUrl}`}
            width={160}
            height={160}
            className="rounded-xl border border-slate-200 bg-white p-2"
          />

          <div className="flex w-full gap-2">
            {/* Tải ở 1024px, không phải 320px đang hiện: QR để IN cần đủ điểm ảnh. */}
            <Button asChild variant="secondary" size="sm" className="flex-1">
              <a href={`/api/qr/${slug}?format=png&width=1024`} download={`qr-${slug}.png`}>
                <Download className="h-3.5 w-3.5" />
                PNG
              </a>
            </Button>
            <Button asChild variant="secondary" size="sm" className="flex-1">
              <a href={`/api/qr/${slug}?format=svg`} download={`qr-${slug}.svg`}>
                <Download className="h-3.5 w-3.5" />
                SVG
              </a>
            </Button>
          </div>
        </div>

        <Button type="button" size="sm" className="mt-6 w-full" onClick={onClose}>
          Xong
        </Button>
      </DialogContent>
    </Dialog>
  )
}
