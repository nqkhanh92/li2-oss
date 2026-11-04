import Link from 'next/link'
import { ExternalLink, FileUp, Plus, QrCode } from 'lucide-react'

import type { ArtifactListItem } from '@/lib/artifacts/list'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/**
 * Bảng danh sách artifact. **Không** `'use client'` — mọi thao tác ở đây là một thẻ `<a>` (mở
 * trang công khai, tải QR), nên không cần một byte JavaScript nào gửi xuống trình duyệt.
 *
 * `ArtifactListItem` nhập từ `lib/artifacts/list.ts` chỉ ở dạng `type`, nên `import 'server-only'`
 * trong file đó không theo vào bundle (type bị xoá lúc biên dịch).
 */

/**
 * MIME → nhãn ngắn hiện trên badge.
 *
 * Khớp đúng `EXT_TO_MIME` trong `lib/artifacts/mime.ts` — đó là nơi DUY NHẤT quyết định giá trị
 * nào vào được cột `mime_type`. Giá trị lạ (hàng cũ, hoặc allowlist vừa được nới) rơi vào nhánh
 * suy từ chính chuỗi MIME ở `mimeLabel`, không hiện ô trống.
 */
const MIME_LABEL: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
  'image/webp': 'WEBP',
  'image/svg+xml': 'SVG',
  'text/html': 'HTML',
  'text/markdown': 'MD',
  'text/plain': 'TXT',
  'text/csv': 'CSV',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
}

function mimeLabel(mime: string): string {
  const known = MIME_LABEL[mime]
  if (known) return known
  // `application/x-thu-gi-do` → `X-THU-GI-DO`. Dài thì cắt, badge không được đẩy bảng giãn ra.
  const subtype = mime.split('/')[1] ?? mime
  return subtype.slice(0, 8).toUpperCase()
}

const STATUS_VIEW: Record<ArtifactListItem['status'], { label: string; className: string }> = {
  live: {
    label: 'Đang chạy',
    className: 'bg-semantic-success/10 text-semantic-success border-semantic-success/25',
  },
  draft: {
    label: 'Nháp',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  removed: {
    label: 'Đã gỡ',
    className: 'bg-semantic-error/10 text-semantic-error border-semantic-error/25',
  },
}

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

/**
 * Byte → chuỗi người đọc được. Dùng cả ở `components/artifacts/upload-form.tsx` (hiện kích thước
 * tệp vừa chọn) — một bản duy nhất để con số trên form và con số trong bảng không bao giờ lệch
 * cách làm tròn.
 */
export function formatBytes(bytes: number, fractionDigits = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), SIZE_UNITS.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  const rounded = exponent === 0 ? Math.round(value) : Number(value.toFixed(fractionDigits))
  return `${rounded} ${SIZE_UNITS[exponent]}`
}

export function ArtifactTable({ artifacts }: { artifacts: ArtifactListItem[] }) {
  if (artifacts.length === 0) return <ArtifactEmptyState />

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5">Tên tệp</TableHead>
            <TableHead className="w-[110px]">Kích thước</TableHead>
            <TableHead className="w-[200px]">Địa chỉ</TableHead>
            <TableHead className="w-[100px] text-right">Lượt xem</TableHead>
            <TableHead className="w-[120px]">Trạng thái</TableHead>
            <TableHead className="w-[150px] pr-5 text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {artifacts.map((artifact) => {
            const status = STATUS_VIEW[artifact.status]

            return (
              <TableRow key={artifact.id}>
                <TableCell className="py-3 pl-5">
                  <div className="flex items-center gap-2.5">
                    {/* `break-all`: tên tệp người dùng đặt có thể là 200 ký tự không khoảng trắng. */}
                    <span className="max-w-[320px] truncate font-medium text-foreground">
                      {artifact.original_name}
                    </span>
                    <Badge
                      variant="outline"
                      className="shrink-0 rounded-full border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                    >
                      {mimeLabel(artifact.mime_type)}
                    </Badge>
                  </div>
                  {artifact.title ? (
                    <p className="mt-0.5 max-w-[380px] truncate text-xs text-slate-500">
                      {artifact.title}
                    </p>
                  ) : null}
                </TableCell>

                <TableCell className="py-3 text-s text-slate-600">
                  {formatBytes(artifact.size_bytes)}
                </TableCell>

                <TableCell className="py-3">
                  {artifact.slug ? (
                    <Link
                      href={`/${artifact.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-s text-primary hover:underline"
                    >
                      /{artifact.slug}
                    </Link>
                  ) : (
                    // `link_id` là ON DELETE SET NULL, nên artifact còn nội dung mà không còn địa
                    // chỉ. Nói ra thay vì để một ô trống không giải thích gì.
                    <span className="text-s text-slate-400">link đã xoá</span>
                  )}
                </TableCell>

                <TableCell className="py-3 text-right text-s tabular-nums text-slate-600">
                  {artifact.visit_count}
                </TableCell>

                <TableCell className="py-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      'rounded-full border px-2.5 py-0.5 text-xs font-medium',
                      status.className
                    )}
                  >
                    {status.label}
                  </Badge>
                </TableCell>

                <TableCell className="py-3 pr-5">
                  <div className="flex items-center justify-end gap-1.5">
                    {artifact.slug ? (
                      <>
                        <Button asChild variant="tertiary" size="xs">
                          {/* `download` là thuộc tính của `<a>`: route QR đặt
                              `content-disposition: inline` để nhúng được vào trang, nên muốn tải
                              về thì phải nói ở phía này. */}
                          <a
                            href={`/api/qr/${artifact.slug}?format=png&width=1024`}
                            download={`qr-${artifact.slug}.png`}
                          >
                            <QrCode className="h-4 w-4" />
                            QR
                          </a>
                        </Button>
                        <Button asChild variant="tertiary" size="xs">
                          <a href={`/${artifact.slug}`} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            Mở
                          </a>
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}

function ArtifactEmptyState() {
  return (
    <Card>
      <div className="flex flex-col items-center px-6 pb-14 pt-12 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[16px] border border-slate-200 bg-slate-50">
          <FileUp className="h-6 w-6 text-slate-400" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-foreground">Chưa có artifact nào</h2>
        <p className="mb-6 max-w-md text-s leading-relaxed text-slate-500">
          Tải một tệp lên và hệ thống tạo sẵn địa chỉ công khai cùng mã QR cho nó. Dùng được với
          PDF, ảnh, HTML, Markdown và tài liệu Office.
        </p>
        {/* Icon nằm TRONG `<Link>`, không ở prop `iconLeft`: với `asChild`, `Button` render một
            `Slot` và bỏ qua `iconLeft`/`iconRight` (xem `components/ui/button.tsx`). */}
        <Button asChild>
          <Link href="/artifacts/new">
            <Plus className="h-4 w-4" />
            Tải tệp lên
          </Link>
        </Button>
      </div>
    </Card>
  )
}
