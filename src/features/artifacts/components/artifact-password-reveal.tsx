'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Copy } from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/shared/components/ui/input'

/**
 * Mật khẩu vừa đặt, hiện MỘT LẦN kèm nút Sao chép. Server băm rồi không bao giờ trả lại, nên đây là
 * chỗ duy nhất người tạo thấy nó — hộp thoại Đã xuất bản, hộp thoại đổi chế độ và hộp thoại đổi mật
 * khẩu đều dùng khối này để câu cảnh báo chỉ được viết một lần.
 */
export const ArtifactPasswordReveal = ({ password }: { password: string }) => {
  const { t } = useTranslation(['artifact', 'common'])
  const [copied, setCopied] = useState(false)

  const copy = () => {
    try {
      navigator.clipboard.writeText(password)
      setCopied(true)
      toast.success(t('common:toast.title_copy'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('artifact:errors.generic'))
    }
  }

  return (
    <div className="space-y-1.5" data-testid="artifact-password-reveal">
      <p className="text-s font-medium text-slate-600">{t('artifact:access.password_label')}</p>
      <Input
        value={password}
        readOnly
        className="font-mono text-s"
        aria-label={t('artifact:access.password_label')}
        endAdornment={
          copied ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-semantic-success" />
          ) : (
            <button
              type="button"
              aria-label={t('artifact:access.copy_password')}
              onClick={copy}
              className="flex items-center text-slate-400 hover:text-slate-700"
            >
              <Copy className="h-4 w-4" />
            </button>
          )
        }
      />
      <p className="text-xs text-slate-500">{t('artifact:access.password_once')}</p>
    </div>
  )
}
