'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CopyButton } from '@/components/links/copy-button'

type QrDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
  /** Địa chỉ công khai mà QR mã hoá. Tính ở server vì `PUBLIC_BASE_URL` không phải `NEXT_PUBLIC_*`. */
  publicUrl: string
  pngUrl: string
  svgUrl: string
}

/**
 * Xem trước QR rồi tải PNG hoặc SVG.
 *
 * Mở ở dialog thay vì tải thẳng: QR đã in không sửa được, nên người vận hành cần THẤY nó quét đúng
 * địa chỉ nào trước khi gửi đi nhà in. Địa chỉ được in ra chữ ngay dưới ảnh đúng vì lý do đó.
 */
export function QrDialog({
  open,
  onOpenChange,
  slug,
  publicUrl,
  pngUrl,
  svgUrl,
}: QrDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-6">
        <DialogHeader className="gap-1">
          <DialogTitle>Mã QR của /{slug}</DialogTitle>
          <DialogDescription>
            Quét mã này sẽ mở địa chỉ bên dưới. Tải SVG khi cần in khổ lớn — nó không bị rỗ.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3">
          {/*
            `<img>` thuần, không `next/image`: ảnh đến từ route handler của chính ứng dụng
            (`/api/qr/<slug>`), và cho nó qua bộ tối ưu của Next chỉ thêm một lần nén lossy lên
            một ảnh vốn phải sắc nét từng điểm — QR mờ là QR quét không ra.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pngUrl}
            alt={`Mã QR trỏ tới ${publicUrl}`}
            width={256}
            height={256}
            className="h-64 w-64 rounded-lg border border-slate-200 bg-white p-2"
          />

          <div className="flex w-full items-center justify-center gap-1">
            <span className="truncate text-xs text-slate-500" title={publicUrl}>
              {publicUrl}
            </span>
            <CopyButton value={publicUrl} size="xs" />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-center">
          {/*
            `download` trên thẻ cùng origin ghi đè `content-disposition: inline` mà route QR trả về,
            nên bấm là tải file thật chứ không mở ảnh trong tab mới.
          */}
          <Button asChild variant="secondary">
            <a href={pngUrl} download={`qr-${slug}.png`}>
              <Download className="h-[18px] w-[18px]" />
              Tải PNG
            </a>
          </Button>
          <Button asChild variant="secondary">
            <a href={svgUrl} download={`qr-${slug}.svg`}>
              <Download className="h-[18px] w-[18px]" />
              Tải SVG
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
