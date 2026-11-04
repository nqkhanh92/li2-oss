import Link from 'next/link'
import { ExternalLink, FileCode2, Link2, MousePointerClick, Plus, QrCode } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CopyButton } from '@/components/links/copy-button'
import { LinkRowActions } from '@/components/links/link-row-actions'
import { publicUrl, type LinkListItem } from '@/lib/links/service'

/**
 * Bảng link. Server Component — nó gọi `publicUrl()`, và hàm đó đọc `PUBLIC_BASE_URL`, một biến
 * KHÔNG có tiền tố `NEXT_PUBLIC_` nên chỉ server đọc được. Mọi địa chỉ công khai được tính ở đây
 * rồi truyền xuống `LinkRowActions` dưới dạng prop.
 */

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const numberFormatter = new Intl.NumberFormat('vi-VN')

/**
 * `pg` trả `timestamptz` thành đối tượng `Date`, nhưng kiểu khai trong `LinkListItem` là `string`.
 * `new Date()` nhận cả hai, nên không phải chọn — và vẫn kiểm `NaN` để một hàng dữ liệu lạ không
 * in ra "Invalid Date" giữa bảng.
 */
function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date)
}

/** Rút gọn URL đích cho vừa một cột, vẫn đọc ra được nó trỏ đâu. */
function shortenUrl(raw: string, max = 46): string {
  // Bỏ scheme và `www.`: chúng chiếm chỗ mà không giúp phân biệt link nào với link nào.
  const bare = raw
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')

  if (bare.length <= max) return bare

  // Cắt ở GIỮA. Cắt đuôi sẽ làm mọi link cùng một domain trông y hệt nhau, tức là cột này vô dụng
  // đúng ở trường hợp cần nó nhất.
  return `${bare.slice(0, max - 12)}…${bare.slice(-9)}`
}

function qrUrls(slug: string) {
  // `width=512` đủ cho mọi chỗ dùng trên màn hình và cho bản in khổ nhỏ. Người cần lớn hơn thì tải
  // SVG — phóng PNG lên khổ A3 là QR rỗ, và QR rỗ là QR quét không ra.
  return {
    png: `/api/qr/${slug}?format=png&width=512`,
    svg: `/api/qr/${slug}?format=svg&width=512`,
  }
}

/**
 * Khối rỗng khi chưa có link nào.
 *
 * Một bảng chỉ có dòng tiêu đề không nói được điều gì: người dùng không biết mình đang xem một
 * danh sách trống hay một trang hỏng. Nên chỗ này phải nói ra bước tiếp theo.
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-6 rounded-xl border border-dashed border-slate-300 bg-card px-6 py-14 animate-[fade-up_0.4s_ease-out_both]">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <Link2 className="h-5 w-5 text-slate-500" />
        </span>
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <QrCode className="h-5 w-5 text-slate-500" />
        </span>
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <MousePointerClick className="h-5 w-5 text-slate-500" />
        </span>
      </div>

      <div className="flex max-w-sm flex-col items-center gap-2 text-center">
        <h2 className="text-lg font-semibold text-foreground">Chưa có link nào</h2>
        <p className="text-sm leading-relaxed text-slate-500">
          Một link gồm ba thứ: một slug ngắn để chia sẻ, một mã QR tải về được, và số lượt truy cập
          đếm từ lần đầu có người bấm.
        </p>
      </div>

      <Button asChild>
        <Link href="/links/new">
          <Plus className="h-5 w-5" />
          Tạo link
        </Link>
      </Button>
    </div>
  )
}

export function LinkTable({ links }: { links: LinkListItem[] }) {
  if (links.length === 0) return <EmptyState />

  return (
    <div className="rounded-xl border border-slate-200 bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-4">Slug</TableHead>
            <TableHead>Đích</TableHead>
            <TableHead className="text-right">Lượt</TableHead>
            <TableHead className="whitespace-nowrap">Ngày tạo</TableHead>
            <TableHead className="w-12 px-4 text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {links.map((link) => {
            const target = publicUrl(link.slug)
            const qr = qrUrls(link.slug)

            return (
              <TableRow
                key={link.id}
                className="group/row"
                // Địa chỉ QR của hàng, có mặt trong HTML do server dựng.
                //
                // Hai người đọc nó: bộ e2e (`scripts/e2e.mjs` kiểm `/links` có chứa `/api/qr/`) và
                // script của người vận hành muốn tải QR hàng loạt mà không phải đoán đường dẫn.
                // Để nó ở đây thay vì chỉ trong prop của component client: prop nằm trong payload
                // RSC, tức là phụ thuộc một chi tiết nội bộ của Next.
                data-qr-url={qr.png}
              >
                <TableCell className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <a
                      className="font-medium text-foreground hover:text-primary-light hover:underline"
                      href={target}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      /{link.slug}
                    </a>
                    {/* Hiện khi trỏ chuột vào hàng, để cột slug không lúc nào cũng có một nút
                        đứng cạnh. Trên màn hình cảm ứng (không có hover) thì hiện thường trực. */}
                    <CopyButton
                      value={target}
                      size="xs"
                      className="md:opacity-0 md:transition-opacity md:group-hover/row:opacity-100 md:focus-visible:opacity-100"
                    />
                    {link.is_active ? null : (
                      <Badge variant="outline" size="xs" className="border-slate-300 not-italic">
                        Đã tắt
                      </Badge>
                    )}
                  </div>
                  {link.title ? (
                    <p className="mt-0.5 max-w-80 truncate text-xs text-slate-500" title={link.title}>
                      {link.title}
                    </p>
                  ) : null}
                </TableCell>

                <TableCell className="py-3">
                  {link.kind === 'artifact' || !link.destination ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                      <FileCode2 className="h-4 w-4" />
                      Artifact
                    </span>
                  ) : (
                    /* `rel="noreferrer"` để đích do người dùng nhập không nhận được Referer của
                       trang quản trị, và không chạm được `window.opener`. */
                    <a
                      className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-primary-light hover:underline"
                      href={link.destination}
                      target="_blank"
                      rel="noreferrer noopener"
                      title={link.destination}
                    >
                      <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                      {shortenUrl(link.destination)}
                    </a>
                  )}
                </TableCell>

                <TableCell className="py-3 text-right text-sm font-medium tabular-nums">
                  {numberFormatter.format(link.visit_count)}
                </TableCell>

                <TableCell className="py-3 whitespace-nowrap text-sm text-slate-500">
                  {formatDate(link.created_at)}
                </TableCell>

                <TableCell className="px-4 py-3 text-right">
                  <LinkRowActions
                    id={link.id}
                    slug={link.slug}
                    isActive={link.is_active}
                    publicUrl={target}
                    qrPngUrl={qr.png}
                    qrSvgUrl={qr.svg}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
