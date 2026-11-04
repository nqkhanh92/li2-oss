'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Clock, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Form đăng nhập — gọi `POST /api/auth/login` bằng `fetch`, không phải Server Action.
 *
 * Vì sao đổi so với bản trước (Server Action, chạy được khi tắt JavaScript): hạn mức chống dò mật
 * khẩu CHỈ nằm ở route handler (`checkLoginRate` + `clientIp` trong `app/api/auth/login/route.ts`).
 * Để Server Action hiện được trạng thái 429 thì phải gọi lại hạn mức ở đó — tức là hai bản copy
 * của cùng một phép kiểm an toàn, và bản bị quên lúc sửa là bản còn lỗ. Đổi lại: trang này cần
 * JavaScript. Chấp nhận được vì toàn bộ phần quản trị phía sau cũng cần.
 *
 * API không đổi một dòng nào (bộ e2e gọi nó bằng JSON và đọc `{error}`); đây chỉ là người gọi mới.
 */

/**
 * Trạng thái lỗi được PHÂN LOẠI, không phải một chuỗi.
 *
 * "Sai mật khẩu" và "bị khoá tạm" là hai việc khác nhau với người dùng: cái đầu bảo họ gõ lại,
 * cái sau bảo họ dừng lại và đợi. Gộp chúng vào một dòng chữ đỏ làm người bị khoá cứ gõ tiếp,
 * và mỗi lần gõ lại đẩy mốc hết hạn ra xa hơn.
 */
type LoginError =
  | { kind: 'invalid'; message: string }
  | { kind: 'rate'; message: string; retryAfterSec: number | null }

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<LoginError | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      if (response.ok) {
        // `replace` chứ không `push`: nút Back sau khi đăng nhập không nên quay lại form này.
        // `refresh()` để layout phía sau đọc lại cookie phiên vừa được đặt.
        router.replace('/links')
        router.refresh()
        return
      }

      const body = (await response.json().catch(() => null)) as { error?: string } | null

      if (response.status === 429) {
        const raw = response.headers.get('Retry-After')
        const parsed = raw === null ? Number.NaN : Number.parseInt(raw, 10)
        setError({
          kind: 'rate',
          message: body?.error ?? 'Thử quá nhiều lần. Đợi một lát rồi thử lại.',
          retryAfterSec: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
        })
      } else {
        setError({
          kind: 'invalid',
          message: body?.error ?? 'Không đăng nhập được. Thử lại.',
        })
      }
    } catch {
      // Mất mạng, hoặc máy chủ không trả lời. Không phải lỗi thông tin đăng nhập, nên đừng nói
      // "sai mật khẩu" — người dùng sẽ đi đổi mật khẩu để sửa một sự cố mạng.
      setError({ kind: 'invalid', message: 'Không gọi được máy chủ. Kiểm tra kết nối rồi thử lại.' })
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error ? <LoginAlert error={error} /> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          disabled={pending}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ban@congty.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Mật khẩu</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <Button type="submit" className="mt-2 w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {pending ? 'Đang kiểm tra…' : 'Đăng nhập'}
      </Button>
    </form>
  )
}

function LoginAlert({ error }: { error: LoginError }) {
  const isRate = error.kind === 'rate'
  const Icon = isRate ? Clock : AlertCircle

  return (
    <div
      role="alert"
      // `aria-live` để trình đọc màn hình đọc thông báo xuất hiện sau khi bấm, không chỉ lúc tải trang.
      aria-live="polite"
      className={
        isRate
          ? 'flex items-start gap-2.5 rounded-xl border border-semantic-warning/25 bg-semantic-warning/10 px-3.5 py-3 text-s text-semantic-warning'
          : 'flex items-start gap-2.5 rounded-xl border border-semantic-error/25 bg-semantic-error/10 px-3.5 py-3 text-s text-semantic-error'
      }
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex flex-col gap-0.5">
        <span>{error.message}</span>
        {isRate && error.retryAfterSec !== null ? (
          <span className="text-xs opacity-80">
            Thử lại sau khoảng {formatRetryAfter(error.retryAfterSec)}.
          </span>
        ) : null}
      </div>
    </div>
  )
}

/** "90 giây" đọc khó hơn "2 phút", nhưng "45 giây" thì rõ hơn "1 phút". Ngưỡng ở 60. */
function formatRetryAfter(seconds: number): string {
  if (seconds < 60) return `${seconds} giây`
  return `${Math.ceil(seconds / 60)} phút`
}
