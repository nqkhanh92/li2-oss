'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Loader2, UploadCloud } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { formatBytes } from '@/components/artifacts/artifact-table'
import { ArtifactCreatedDialog } from '@/components/artifacts/artifact-created-dialog'

/**
 * Đuôi tệp được phép — **bản sao để HIỂN THỊ**, không phải nơi quyết định.
 *
 * Nơi quyết định là `EXT_TO_MIME` trong `lib/artifacts/mime.ts`, và nó `import 'server-only'` nên
 * không nhập được vào một client component. Hệ quả phải chấp nhận: thêm một đuôi ở server mà quên
 * dòng này thì tệp hợp lệ bị chặn ngay trên máy người dùng. Đó là hướng sai AN TOÀN (chặn oan, chứ
 * không cho qua oan) — và vẫn phải sửa cả hai chỗ khi nới allowlist.
 */
const ALLOWED_EXTS = [
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'svg',
  'html',
  'htm',
  'md',
  'txt',
  'csv',
  'docx',
  'xlsx',
  'pptx',
] as const

/** `accept` của `<input type="file">` chỉ là gợi ý cho hộp chọn tệp; kéo-thả bỏ qua nó hoàn toàn. */
const FILE_ACCEPT = ALLOWED_EXTS.map((ext) => `.${ext}`).join(',')

type Created = { slug: string; publicUrl: string | null }

/** Đuôi tệp, chữ thường. Giống `extensionOf` ở `lib/artifacts/mime.ts`: đuôi CUỐI quyết định. */
function extensionOf(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? ''
  const dot = base.lastIndexOf('.')
  if (dot <= 0 || dot === base.length - 1) return ''
  return base.slice(dot + 1).toLowerCase()
}

export function UploadForm({ maxBytes }: { maxBytes: number }) {
  const router = useRouter()
  const inputId = useId()

  const [file, setFile] = useState<File | null>(null)
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [created, setCreated] = useState<Created | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  /**
   * Kiểm NGAY LÚC CHỌN, không chờ lúc gửi.
   *
   * Kích thước là lý do chính: không kiểm ở client thì người chọn một tệp 2 GB phải chờ trình
   * duyệt đẩy hết 2 GB lên rồi mới nhận 413. Máy chủ vẫn kiểm lại (`maxUploadBytes` ở
   * `lib/artifacts/storage.ts` + `content-length` ở route) — phép kiểm ở đây chỉ để đỡ phí thời
   * gian và băng thông của người dùng, nó KHÔNG phải lớp bảo vệ.
   */
  function selectFile(next: File | null) {
    setError(null)

    if (!next) {
      setFile(null)
      return
    }

    const ext = extensionOf(next.name)
    if (!ext || !ALLOWED_EXTS.includes(ext as (typeof ALLOWED_EXTS)[number])) {
      setFile(null)
      setError(
        ext
          ? `Đuôi .${ext} không được phép. Cho phép: ${ALLOWED_EXTS.join(', ')}.`
          : 'Tên tệp không có đuôi nên không xác định được loại.'
      )
      return
    }

    if (next.size === 0) {
      setFile(null)
      setError('Tệp rỗng.')
      return
    }

    if (next.size > maxBytes) {
      setFile(null)
      setError(
        `Tệp ${formatBytes(next.size)} vượt hạn mức ${formatBytes(maxBytes)} của instance này.`
      )
      return
    }

    setFile(next)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) {
      setError('Chọn một tệp trước.')
      return
    }

    setError(null)
    setPending(true)

    try {
      const body = new FormData()
      body.set('file', file)
      // Chỉ gửi khi có giá trị: route coi chuỗi rỗng là "không đặt", nhưng gửi `slug=''` vẫn đi
      // qua một vòng kiểm regex không cần thiết và làm thông điệp lỗi khó hiểu hơn.
      if (slug.trim()) body.set('slug', slug.trim().toLowerCase())
      if (title.trim()) body.set('title', title.trim())

      const response = await fetch('/api/artifacts', { method: 'POST', body })
      const json = (await response.json().catch(() => null)) as
        | { artifact?: { slug?: string }; public_url?: string | null; error?: string }
        | null

      if (!response.ok || !json?.artifact?.slug) {
        setError(json?.error ?? `Tải lên không thành công (HTTP ${response.status}).`)
        return
      }

      setCreated({ slug: json.artifact.slug, publicUrl: json.public_url ?? null })
    } catch {
      setError('Không gọi được máy chủ. Kiểm tra kết nối rồi thử lại.')
    } finally {
      setPending(false)
    }
  }

  function handleDialogClose() {
    setCreated(null)
    // `refresh()` trước `push`: trang `/artifacts` là `force-dynamic` nhưng router cache ở client
    // vẫn giữ bản render trước, nên không refresh thì artifact vừa tạo không có trong bảng.
    router.refresh()
    router.push('/artifacts')
  }

  return (
    <>
      <Card>
        <CardContent className="p-6 pt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/*
              `<label>` + `<input type="file">` ẩn thay vì một `<div onClick>`: bàn phím tab tới
              được, Enter/Space mở hộp chọn tệp, và focus ring hiện qua `focus-within` vì chính
              cái input mới nhận focus.
            */}
            <label
              htmlFor={inputId}
              onDragOver={(e) => {
                e.preventDefault()
                if (!pending) setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                if (pending) return
                selectFile(e.dataTransfer.files?.[0] ?? null)
              }}
              className={cn(
                'flex w-full cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[16px] border border-dashed border-slate-300 bg-card px-6 py-10 text-center transition-colors',
                'focus-within:border-primary focus-within:ring-1 focus-within:ring-ring',
                isDragging && 'border-primary bg-primary/5',
                error && !file && 'border-semantic-error',
                pending && 'cursor-not-allowed opacity-50'
              )}
            >
              <input
                id={inputId}
                type="file"
                accept={FILE_ACCEPT}
                className="sr-only"
                disabled={pending}
                onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
              />

              <UploadCloud className="h-7 w-7 text-slate-400" />

              {file ? (
                <>
                  <p className="break-all text-s font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                  <span className="text-xs text-slate-500 underline">Chọn tệp khác</span>
                </>
              ) : (
                <>
                  <p className="text-s font-medium text-foreground">
                    Kéo tệp vào đây, hoặc bấm để chọn
                  </p>
                  <p className="text-xs text-slate-500">Tối đa {formatBytes(maxBytes)}</p>
                  {/* Danh sách đuôi nằm ngay trong vùng kéo-thả: người dùng cần biết TRƯỚC khi
                      kéo, không phải sau khi bị từ chối. */}
                  <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
                    {ALLOWED_EXTS.join(' · ')}
                  </p>
                </>
              )}
            </label>

            {error ? (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2.5 rounded-xl border border-semantic-error/25 bg-semantic-error/10 px-3.5 py-3 text-s text-semantic-error"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="artifact-slug">Địa chỉ (tuỳ chọn)</Label>
              <Input
                id="artifact-slug"
                name="slug"
                value={slug}
                disabled={pending}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="bao-gia-2026"
                className="font-mono"
              />
              <p className="text-xs text-slate-500">
                Chữ thường, số, <code>-</code> và <code>_</code>; bắt đầu bằng chữ hoặc số. Để trống
                thì hệ thống sinh một địa chỉ ngẫu nhiên.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="artifact-title">Tiêu đề (tuỳ chọn)</Label>
              <Input
                id="artifact-title"
                name="title"
                value={title}
                disabled={pending}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Báo giá tháng 1"
              />
              <p className="text-xs text-slate-500">
                Chỉ để bạn nhận ra tệp trong danh sách. Không hiện cho người mở link.
              </p>
            </div>

            <div className="mt-1 flex items-center gap-2">
              <Button type="submit" disabled={pending || !file}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {pending ? 'Đang tải lên…' : 'Tải lên'}
              </Button>
              <Button asChild variant="tertiary" type="button">
                <Link href="/artifacts">Huỷ</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {created ? (
        <ArtifactCreatedDialog
          slug={created.slug}
          publicUrl={created.publicUrl}
          onClose={handleDialogClose}
        />
      ) : null}
    </>
  )
}
