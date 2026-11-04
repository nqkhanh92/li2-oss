'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Ghi một chuỗi vào clipboard, có đường lùi cho ngữ cảnh KHÔNG bảo mật.
 *
 * `navigator.clipboard` chỉ tồn tại trên https hoặc localhost. Bản này để tự host, và phần lớn
 * instance mới dựng chạy http trên một IP nội bộ — ở đó `navigator.clipboard` là `undefined`, nút
 * sao chép im lặng không làm gì, và người dùng không có cách nào biết vì sao. Nên vẫn giữ
 * `document.execCommand('copy')`: nó đã deprecated nhưng là thứ duy nhất chạy ngoài secure context.
 */
async function writeClipboard(value: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      // Người dùng từ chối quyền, hoặc tab không được focus. Thử tiếp đường lùi.
    }
  }

  const area = document.createElement('textarea')
  area.value = value
  // Ngoài khung nhìn thay vì `display:none`: phần tử bị ẩn hẳn thì không select được, và
  // `execCommand('copy')` chỉ sao chép được vùng đang được chọn.
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.top = '-1000px'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()

  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    document.body.removeChild(area)
  }
}

/**
 * Trạng thái "vừa sao chép" dùng chung.
 *
 * Tách thành hook vì có ba chỗ cần sao chép (ô slug trong bảng, item trong dropdown, hộp QR) và
 * đường lùi ở trên không đáng được chép ba lần — bản bị quên khi sửa sẽ là bản còn hỏng.
 */
export function useCopy(resetMs = 1500) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Dọn timer khi component biến mất. Trong DropdownMenu thì item bị unmount NGAY khi menu đóng,
  // tức là trường hợp thường gặp chứ không phải ngoại lệ.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const copy = useCallback(
    async (value: string) => {
      const ok = await writeClipboard(value)
      if (!ok) return false

      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), resetMs)
      return true
    },
    [resetMs]
  )

  return { copied, copy }
}

type CopyButtonProps = Omit<ButtonProps, 'onClick' | 'children' | 'value'> & {
  /** Chuỗi được sao chép. Thường là địa chỉ công khai của link. */
  value: string
  /** Nhãn chữ. Bỏ trống thì nút chỉ còn icon, và nhãn chuyển sang `aria-label`. */
  label?: string
}

export function CopyButton({
  value,
  label,
  variant = 'tertiary',
  // Có nhãn chữ thì `size="icon"` (vuông 36px) sẽ bó chữ lại — nên mặc định đổi theo nhãn.
  // Thứ tự destructuring có ý nghĩa: `label` phải được rút ra trước khi dùng ở đây.
  size = label ? 'sm' : 'icon',
  className,
  ...props
}: CopyButtonProps) {
  const { copied, copy } = useCopy()
  const describe = label ?? 'Sao chép địa chỉ'

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      aria-label={label ? undefined : describe}
      title={label ? undefined : describe}
      className={cn('shrink-0', className)}
      onClick={() => void copy(value)}
      {...props}
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-600 animate-[check-pop_0.2s_ease-out]" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {label ? <span>{copied ? 'Đã sao chép' : label}</span> : null}
    </Button>
  )
}
