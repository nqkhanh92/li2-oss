'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, Hash, Link as LinkIcon, Loader2, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * Ô nhập nào nhận câu lỗi của server.
 *
 * API trả MỘT chuỗi `{ error }` chứ không phải map theo trường, nên phải đoán. Đoán theo nội dung
 * là thô, nhưng chỗ hiển thị sai vẫn hơn là dồn mọi lỗi lên đầu trang: lỗi hay gặp nhất là "slug
 * đã có người dùng", và người dùng cần thấy nó NGAY CẠNH ô slug để biết sửa cái gì.
 *
 * Khi API bắt đầu trả lỗi theo trường thì xoá hàm này, đừng thêm nhánh vào nó.
 */
function fieldForError(message: string): 'slug' | 'destination' | 'form' {
  const lower = message.toLowerCase()
  if (lower.includes('slug')) return 'slug'
  if (lower.includes('url') || lower.includes('scheme') || lower.includes('hostname')) {
    return 'destination'
  }
  return 'form'
}

function FieldError({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-start gap-1.5 text-xs text-destructive">
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  )
}

function FieldLabel({
  htmlFor,
  icon,
  children,
  required,
}: {
  htmlFor: string
  icon: React.ReactNode
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <Label htmlFor={htmlFor} className="flex flex-row items-center gap-2">
      <span className="text-slate-500">{icon}</span>
      <span className="flex items-center gap-1 text-sm font-medium text-slate-700">
        {children}
        {required ? (
          <span className="text-red-500" aria-label="bắt buộc">
            *
          </span>
        ) : null}
      </span>
    </Label>
  )
}

export function CreateLinkForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<{ field: 'slug' | 'destination' | 'form'; message: string } | null>(
    null
  )

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const form = new FormData(event.currentTarget)
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          destination: String(form.get('destination') ?? ''),
          // Chuỗi rỗng ≠ không đặt: service coi slug rỗng là "tự sinh", nên gửi `null` cho rõ.
          slug: String(form.get('slug') ?? '').trim() || null,
          title: String(form.get('title') ?? '').trim() || null,
        }),
      })

      const body = await response.json().catch(() => null)

      if (!response.ok) {
        // Hiện ĐÚNG câu mà server trả về, không quy về một mã lỗi chung.
        //
        // Bản trước dịch lỗi qua `?error=slug|destination` trên URL rồi tra bảng, vì không muốn in
        // chuỗi tự do lấy từ query string lên trang quản trị. Chuỗi ở đây khác hẳn: nó là body
        // JSON của chính API này, và React escape nó như mọi text node. Nên không cần làm mờ câu
        // lỗi nữa — "Slug \"abc\" đã có người dùng" nói được việc cần làm, "slug không hợp lệ"
        // thì không.
        const message = typeof body?.error === 'string' ? body.error : `Lỗi HTTP ${response.status}.`
        setError({ field: fieldForError(message), message })
        return
      }

      // `refresh()` trước `push()`: trang `/links` là Server Component, và nếu không làm mất hiệu
      // lực bản đã render thì link vừa tạo không có trong bảng.
      router.refresh()
      router.push('/links')
    } catch {
      setError({ field: 'form', message: 'Không gọi được máy chủ. Kiểm tra kết nối rồi thử lại.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-6">
      <Card className="rounded-xl border border-slate-200">
        <CardContent className="flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="destination" icon={<LinkIcon className="h-5 w-5" />} required>
              URL đích
            </FieldLabel>
            {/* `type="url"` để trình duyệt bắt lỗi rõ ràng trước khi gửi. Phép kiểm thật vẫn ở
                server (`checkDestination`) — validation của trình duyệt là tiện lợi, không phải
                kiểm soát truy cập. */}
            <Input
              id="destination"
              name="destination"
              type="url"
              required
              autoFocus
              maxLength={2048}
              placeholder="https://example.com/trang-dich"
              aria-invalid={error?.field === 'destination' || undefined}
              className={cn(error?.field === 'destination' && 'border! border-destructive!')}
            />
            {error?.field === 'destination' ? <FieldError message={error.message} /> : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="slug" icon={<Hash className="h-5 w-5" />}>
              Slug
            </FieldLabel>
            <Input
              id="slug"
              name="slug"
              type="text"
              maxLength={64}
              pattern="[A-Za-z0-9][A-Za-z0-9_\-]*"
              placeholder="để trống sẽ tự sinh"
              aria-invalid={error?.field === 'slug' || undefined}
              className={cn(error?.field === 'slug' && 'border! border-destructive!')}
            />
            {error?.field === 'slug' ? <FieldError message={error.message} /> : null}
            <p className="text-xs leading-relaxed text-slate-500">
              Để trống sẽ tự sinh 7 ký tự. Chỉ chữ thường, số, <code>_</code> và <code>-</code>, bắt
              đầu bằng chữ hoặc số. Slug không sửa được sau khi tạo — đổi nó là làm mọi QR đã in trỏ
              vào hư không.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="title" icon={<Tag className="h-5 w-5" />}>
              Tiêu đề
            </FieldLabel>
            <Input
              id="title"
              name="title"
              type="text"
              maxLength={200}
              placeholder="để nhận ra link này trong bảng"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lỗi không gán được cho ô nào. Đặt dưới form, cạnh nút gửi — chỗ người dùng đang nhìn. */}
      {error?.field === 'form' ? <FieldError message={error.message} /> : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          {submitting ? 'Đang tạo…' : 'Tạo link'}
        </Button>
        <Button asChild variant="tertiary">
          <Link href="/links">Huỷ</Link>
        </Button>
      </div>
    </form>
  )
}
